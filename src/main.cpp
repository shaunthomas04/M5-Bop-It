#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <M5Core2.h>

///////////////////////////////////////////////////////////////
// Function Prototypes
///////////////////////////////////////////////////////////////
void broadcastBleServer();
void drawScreenTextWithBackground(String text, int backgroundColor);

///////////////////////////////////////////////////////////////
// BLE objects and connection state
///////////////////////////////////////////////////////////////
BLEServer *bleServer;
BLEService *bleService;
BLECharacteristic *bleCharacteristic;

bool deviceConnected = false;
bool previouslyConnected = false;

///////////////////////////////////////////////////////////////
// BLE identifiers
///////////////////////////////////////////////////////////////
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// Name shown when scanning for BLE devices
static String BLE_BROADCAST_NAME = "ShaunM5";

///////////////////////////////////////////////////////////////
// BLE connection callbacks
///////////////////////////////////////////////////////////////
class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer *pServer) {
        deviceConnected = true;
        previouslyConnected = true;

        Serial.println("Device connected");
        drawScreenTextWithBackground("Phone connected via BLE!", TFT_GREEN);
    }

    void onDisconnect(BLEServer *pServer) {
        deviceConnected = false;
        Serial.println("Device disconnected");
    }
};

///////////////////////////////////////////////////////////////
// Setup runs once on boot
///////////////////////////////////////////////////////////////
void setup()
{
    M5.begin();
    M5.Lcd.setTextSize(3);

    Serial.begin(115200);
    Serial.println("Starting BLE server...");

    // Initialize BLE with device name
    BLEDevice::init(BLE_BROADCAST_NAME.c_str());

    drawScreenTextWithBackground("Initializing BLE...", TFT_CYAN);

    // Create server and begin advertising
    broadcastBleServer();

    drawScreenTextWithBackground(
        "Waiting for phone\nto connect...\n\nDevice name:\n" + BLE_BROADCAST_NAME,
        TFT_BLUE
    );
}

///////////////////////////////////////////////////////////////
// Main program loop
///////////////////////////////////////////////////////////////
void loop()
{
    if (deviceConnected) {

        // Read the latest value written by the BLE client
        std::string readValue = bleCharacteristic->getValue();
        String message = readValue.c_str();

        Serial.printf("Received from BLE client: %s\n", message.c_str());

        drawScreenTextWithBackground(
            "Connected\n\nMessage from phone:\n\n" + message,
            TFT_GREEN
        );
    }
    else if (!deviceConnected && !previouslyConnected) {

        // Advertising but no phone connected yet
        drawScreenTextWithBackground(
            "Waiting for phone\nto connect via BLE...",
            TFT_PURPLE
        );
    }
    else if (!deviceConnected && previouslyConnected) {

        // A device was connected but disconnected
        drawScreenTextWithBackground(
            "Phone disconnected.\n\nReset device to\nrestart BLE.",
            TFT_RED
        );
    }

    delay(1000);
}

///////////////////////////////////////////////////////////////
// Draw text on the screen with a colored background
///////////////////////////////////////////////////////////////
void drawScreenTextWithBackground(String text, int backgroundColor)
{
    M5.Lcd.fillScreen(backgroundColor);
    M5.Lcd.setCursor(0, 0);
    M5.Lcd.println(text);
}

///////////////////////////////////////////////////////////////
// Create BLE server, service, characteristic, and advertise
///////////////////////////////////////////////////////////////
void broadcastBleServer()
{
    bleServer = BLEDevice::createServer();
    bleServer->setCallbacks(new MyServerCallbacks());

    bleService = bleServer->createService(SERVICE_UUID);

    bleCharacteristic = bleService->createCharacteristic(
        CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_READ |
        BLECharacteristic::PROPERTY_WRITE |
        BLECharacteristic::PROPERTY_NOTIFY |
        BLECharacteristic::PROPERTY_INDICATE
    );

    // Initial value stored in the characteristic
    bleCharacteristic->setValue("Hello BLE World!");

    bleService->start();

    BLEAdvertising *bleAdvertising = BLEDevice::getAdvertising();
    bleAdvertising->addServiceUUID(SERVICE_UUID);
    bleAdvertising->setScanResponse(true);
    bleAdvertising->setMinPreferred(0x12);

    BLEDevice::startAdvertising();

    Serial.println("BLE advertising started. Waiting for client connection.");
}