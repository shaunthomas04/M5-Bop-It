#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <M5Core2.h>

void broadcastBleServer();
void drawScreenTextWithBackground(String text, int backgroundColor);
void drawPlayerPrompt(String playerName);

BLEServer         *bleServer;
BLEService        *bleService;
BLECharacteristic *bleCharacteristic;

bool deviceConnected     = false;
bool previouslyConnected = false;
bool waitingForTap       = false;

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

static String BLE_BROADCAST_NAME = "ShaunM5";
static String currentPlayerName  = "";

///////////////////////////////////////////////////////////////
// Server callbacks
///////////////////////////////////////////////////////////////
class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer *pServer) {
        deviceConnected     = true;
        previouslyConnected = true;
        Serial.println("Phone connected");
        drawScreenTextWithBackground("Phone connected!", TFT_GREEN);
    }

    void onDisconnect(BLEServer *pServer) {
        deviceConnected = false;
        waitingForTap   = false;
        Serial.println("Phone disconnected — restarting advertising");
        BLEDevice::startAdvertising();
        drawScreenTextWithBackground(
            "Disconnected.\nWaiting for\nphone...",
            TFT_ORANGE
        );
    }
};

///////////////////////////////////////////////////////////////
// Characteristic write callback — phone → M5
// Expected messages:
//   "BOP_IT:PlayerName"  → show player name, wait for tap
//   "TIMES_UP"           → player was too slow
//   "SAFE"               → player tapped in time (confirmed)
///////////////////////////////////////////////////////////////
class MyCharacteristicCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        std::string raw = pCharacteristic->getValue();
        String msg      = String(raw.c_str());
        msg.trim();

        Serial.printf("Received: %s\n", msg.c_str());

        if (msg.startsWith("BOP_IT:")) {
            currentPlayerName = msg.substring(7); // everything after "BOP_IT:"
            waitingForTap     = true;
            drawPlayerPrompt(currentPlayerName);

        } else if (msg == "TIMES_UP") {
            waitingForTap = false;
            drawScreenTextWithBackground(
                currentPlayerName + "\nTOO SLOW!\n\n\U0001F480",
                TFT_RED
            );
            delay(1500);
            drawScreenTextWithBackground("Waiting for\nnext round...", TFT_BLUE);

        } else if (msg == "SAFE") {
            waitingForTap = false;
            drawScreenTextWithBackground(
                currentPlayerName + "\nSAFE!\n\n\u2705",
                TFT_GREEN
            );
            delay(1000);
            drawScreenTextWithBackground("Waiting for\nnext round...", TFT_BLUE);
        }
    }
};

///////////////////////////////////////////////////////////////
// Draw the tap prompt for the current player
///////////////////////////////////////////////////////////////
void drawPlayerPrompt(String playerName) {
    M5.Lcd.fillScreen(TFT_ORANGE);
    M5.Lcd.setCursor(0, 20);
    M5.Lcd.setTextSize(3);
    M5.Lcd.println(playerName + ":");
    M5.Lcd.println("");
    M5.Lcd.setTextSize(4);
    M5.Lcd.println("TAP TO\nBOP IT!");
}

///////////////////////////////////////////////////////////////
// Setup
///////////////////////////////////////////////////////////////
void setup() {
    M5.begin();
    M5.Lcd.setTextSize(3);
    Serial.begin(115200);

    BLEDevice::init(BLE_BROADCAST_NAME.c_str());
    drawScreenTextWithBackground("Initializing BLE...", TFT_CYAN);

    broadcastBleServer();

    drawScreenTextWithBackground(
        "Waiting for\nphone...\n\nDevice:\n" + BLE_BROADCAST_NAME,
        TFT_BLUE
    );
}

///////////////////////////////////////////////////////////////
// Loop — poll for screen tap
///////////////////////////////////////////////////////////////
void loop() {
    M5.update();

    if (deviceConnected && waitingForTap) {
        TouchPoint_t pos = M5.Touch.getPressPoint();
        if (pos.x != -1) {
            waitingForTap = false;
            Serial.println("Tapped! Sending SUCCESS");

            bleCharacteristic->setValue("SUCCESS");
            bleCharacteristic->notify();

            drawScreenTextWithBackground(
                currentPlayerName + "\nBOPPED IT!\n\n\u2705",
                TFT_GREEN
            );
        }
    }

    delay(30); // responsive touch polling
}

///////////////////////////////////////////////////////////////
// Helpers
///////////////////////////////////////////////////////////////
void drawScreenTextWithBackground(String text, int backgroundColor) {
    M5.Lcd.fillScreen(backgroundColor);
    M5.Lcd.setCursor(0, 0);
    M5.Lcd.println(text);
}

///////////////////////////////////////////////////////////////
// BLE setup
///////////////////////////////////////////////////////////////
void broadcastBleServer() {
    bleServer = BLEDevice::createServer();
    bleServer->setCallbacks(new MyServerCallbacks());

    bleService = bleServer->createService(SERVICE_UUID);

    bleCharacteristic = bleService->createCharacteristic(
        CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_READ   |
        BLECharacteristic::PROPERTY_WRITE  |
        BLECharacteristic::PROPERTY_NOTIFY |
        BLECharacteristic::PROPERTY_INDICATE
    );

    bleCharacteristic->addDescriptor(new BLE2902());
    bleCharacteristic->setCallbacks(new MyCharacteristicCallbacks());
    bleCharacteristic->setValue("Ready");

    bleService->start();

    BLEAdvertising *bleAdvertising = BLEDevice::getAdvertising();
    bleAdvertising->addServiceUUID(SERVICE_UUID);
    bleAdvertising->setScanResponse(true);
    bleAdvertising->setMinPreferred(0x12);

    BLEDevice::startAdvertising();
    Serial.println("Advertising started.");
}