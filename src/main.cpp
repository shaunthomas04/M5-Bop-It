#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <M5Core2.h>

///////////////////////////////////////////////////////////////
// Function Prototypes
///////////////////////////////////////////////////////////////
void broadcastBleServer();
void drawScreenTextWithBackground(String text, int backgroundColor);
void drawPlayerPrompt(String playerName, String command);
void drawBopScreen(String playerName);
void drawSlideScreen(String playerName);
void drawTwistScreen(String playerName);
void drawShakeScreen(String playerName);
void handleBopInteraction();
void handleSlideInteraction();
void handleTwistInteraction();
void handleShakeInteraction();

///////////////////////////////////////////////////////////////
// BLE objects
///////////////////////////////////////////////////////////////
BLEServer         *bleServer;
BLEService        *bleService;
BLECharacteristic *bleCharacteristic;

bool deviceConnected     = false;
bool previouslyConnected = false;
bool waitingForInput     = false;

String currentPlayerName = "";
String currentCommand    = "";

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

static String BLE_BROADCAST_NAME = "ShaunM5";

///////////////////////////////////////////////////////////////
// Slide interaction state
///////////////////////////////////////////////////////////////
#define SLIDE_START_X   20
#define SLIDE_END_X     280
#define SLIDE_Y         160
#define SLIDE_TRACK_H   40
#define SLIDER_W        60
#define SLIDE_THRESHOLD 240   // x position that counts as "slid"

int  sliderX        = SLIDE_START_X;
bool sliderGrabbed  = false;

///////////////////////////////////////////////////////////////
// IMU thresholds
///////////////////////////////////////////////////////////////
#define TWIST_THRESHOLD  0.7   // abs(accY) when held horizontally
#define SHAKE_THRESHOLD  2.0   // spike in accX or accZ

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
        waitingForInput  = false;
        Serial.println("Disconnected — restarting advertising");
        BLEDevice::startAdvertising();
        drawScreenTextWithBackground("Disconnected.\nWaiting...", TFT_ORANGE);
    }
};

///////////////////////////////////////////////////////////////
// Write callback — phone → M5
// Format: "BOP_IT:PlayerName:COMMAND"
///////////////////////////////////////////////////////////////
class MyCharacteristicCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        std::string raw = pCharacteristic->getValue();
        String msg      = String(raw.c_str());
        msg.trim();

        Serial.printf("Received: %s\n", msg.c_str());

        if (msg.startsWith("BOP_IT:")) {
            String payload    = msg.substring(7);
            int    colonIdx   = payload.indexOf(':');
            currentPlayerName = payload.substring(0, colonIdx);
            currentCommand    = payload.substring(colonIdx + 1);
            currentCommand.trim();

            // Reset slider position for each new round
            sliderX       = SLIDE_START_X;
            sliderGrabbed = false;
            waitingForInput = true;

            drawPlayerPrompt(currentPlayerName, currentCommand);

        } else if (msg == "TIMES_UP") {
            waitingForInput = false;
            drawScreenTextWithBackground(
                currentPlayerName + "\nTOO SLOW!\n\n\U0001F480",
                TFT_RED
            );
            delay(1500);
            drawScreenTextWithBackground("Waiting for\nnext round...", TFT_BLUE);

        } else if (msg == "SAFE") {
            waitingForInput = false;
            drawScreenTextWithBackground(
                currentPlayerName + "\nSAFE! \u2705",
                TFT_GREEN
            );
            delay(1000);
            drawScreenTextWithBackground("Waiting for\nnext round...", TFT_BLUE);
        }
    }
};

///////////////////////////////////////////////////////////////
// Send SUCCESS back to phone
///////////////////////////////////////////////////////////////
void sendSuccess() {
    waitingForInput = false;
    bleCharacteristic->setValue("SUCCESS");
    bleCharacteristic->notify();
    Serial.println("Sent: SUCCESS");
}

///////////////////////////////////////////////////////////////
// Draw initial prompt based on command
///////////////////////////////////////////////////////////////
void drawPlayerPrompt(String playerName, String command) {
    if      (command == "BOP")   drawBopScreen(playerName);
    else if (command == "SLIDE") drawSlideScreen(playerName);
    else if (command == "TWIST") drawTwistScreen(playerName);
    else if (command == "SHAKE") drawShakeScreen(playerName);
}

///////////////////////////////////////////////////////////////
// BOP — big red button
///////////////////////////////////////////////////////////////
void drawBopScreen(String playerName) {
    M5.Lcd.fillScreen(TFT_BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setTextColor(TFT_WHITE);
    M5.Lcd.setCursor(10, 10);
    M5.Lcd.println(playerName);

    // Big red button
    M5.Lcd.fillRoundRect(40, 70, 240, 120, 20, TFT_RED);
    M5.Lcd.setTextSize(4);
    M5.Lcd.setTextColor(TFT_WHITE);
    M5.Lcd.setCursor(75, 115);
    M5.Lcd.println("BOP IT!");
}

void handleBopInteraction() {
    TouchPoint_t pos = M5.Touch.getPressPoint();
    if (pos.x == -1) return;

    // Check if tap is inside the red button area
    if (pos.x >= 40 && pos.x <= 280 && pos.y >= 70 && pos.y <= 190) {
        // Flash white to give feedback
        M5.Lcd.fillRoundRect(40, 70, 240, 120, 20, TFT_WHITE);
        delay(80);
        sendSuccess();
    }
}

///////////////////////////////////////////////////////////////
// SLIDE — draggable yellow slider
///////////////////////////////////////////////////////////////
void drawSlideScreen(String playerName) {
    M5.Lcd.fillScreen(TFT_BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setTextColor(TFT_WHITE);
    M5.Lcd.setCursor(10, 10);
    M5.Lcd.println(playerName);
    M5.Lcd.setCursor(10, 40);
    M5.Lcd.println("SLIDE IT!  >>>");

    // Track
    M5.Lcd.fillRoundRect(
        SLIDE_START_X,
        SLIDE_Y - SLIDE_TRACK_H / 2,
        SLIDE_END_X - SLIDE_START_X + SLIDER_W,
        SLIDE_TRACK_H,
        10,
        TFT_DARKGREY
    );

    // Slider thumb
    M5.Lcd.fillRoundRect(sliderX, SLIDE_Y - SLIDE_TRACK_H / 2, SLIDER_W, SLIDE_TRACK_H, 10, TFT_YELLOW);
}

void handleSlideInteraction() {
    TouchPoint_t pos = M5.Touch.getPressPoint();

    if (pos.x == -1) {
        sliderGrabbed = false;
        return;
    }

    // Grab slider if touching it
    bool touchingSlider = (pos.x >= sliderX && pos.x <= sliderX + SLIDER_W &&
                           pos.y >= SLIDE_Y - SLIDE_TRACK_H / 2 &&
                           pos.y <= SLIDE_Y + SLIDE_TRACK_H / 2);

    if (touchingSlider || sliderGrabbed) {
        sliderGrabbed = true;

        // Clamp slider position to track bounds
        int newX = pos.x - SLIDER_W / 2;
        newX     = max(newX, SLIDE_START_X);
        newX     = min(newX, SLIDE_END_X);

        if (newX != sliderX) {
            sliderX = newX;

            // Redraw track and thumb
            M5.Lcd.fillRect(SLIDE_START_X, SLIDE_Y - SLIDE_TRACK_H / 2 - 2,
                            SLIDE_END_X - SLIDE_START_X + SLIDER_W + 2,
                            SLIDE_TRACK_H + 4, TFT_BLACK);

            M5.Lcd.fillRoundRect(
                SLIDE_START_X,
                SLIDE_Y - SLIDE_TRACK_H / 2,
                SLIDE_END_X - SLIDE_START_X + SLIDER_W,
                SLIDE_TRACK_H,
                10,
                TFT_DARKGREY
            );

            M5.Lcd.fillRoundRect(sliderX, SLIDE_Y - SLIDE_TRACK_H / 2, SLIDER_W, SLIDE_TRACK_H, 10, TFT_YELLOW);
        }

        // Check if slid far enough
        if (sliderX >= SLIDE_THRESHOLD) {
            M5.Lcd.fillRoundRect(sliderX, SLIDE_Y - SLIDE_TRACK_H / 2, SLIDER_W, SLIDE_TRACK_H, 10, TFT_WHITE);
            delay(80);
            sendSuccess();
        }
    }
}

///////////////////////////////////////////////////////////////
// TWIST — tilt M5 to landscape (rotate 90°)
// When held normally: accY ≈ 0, accZ ≈ -1
// When rotated 90° sideways: abs(accY) approaches 1.0
///////////////////////////////////////////////////////////////
void drawTwistScreen(String playerName) {
    M5.Lcd.fillScreen(TFT_BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setTextColor(TFT_CYAN);
    M5.Lcd.setCursor(10, 10);
    M5.Lcd.println(playerName);
    M5.Lcd.setCursor(10, 50);
    M5.Lcd.println("TWIST IT!");
    M5.Lcd.setCursor(10, 90);
    M5.Lcd.setTextColor(TFT_WHITE);
    M5.Lcd.println("Rotate the M5");
    M5.Lcd.println("sideways!");

    // Draw a rotation arrow hint
    M5.Lcd.drawRoundRect(60, 160, 200, 60, 10, TFT_CYAN);
    M5.Lcd.setTextSize(3);
    M5.Lcd.setTextColor(TFT_CYAN);
    M5.Lcd.setCursor(80, 175);
    M5.Lcd.println("<< TURN");
}

void handleTwistInteraction() {
    float accX, accY, accZ;
    M5.IMU.getAccelData(&accX, &accY, &accZ);

    Serial.printf("IMU accX=%.2f accY=%.2f accZ=%.2f\n", accX, accY, accZ);

    // When rotated horizontally, accY swings away from 0
    if (abs(accY) >= TWIST_THRESHOLD) {
        sendSuccess();
    }
}

///////////////////////////////////////////////////////////////
// SHAKE — detect sudden acceleration spike
///////////////////////////////////////////////////////////////
void drawShakeScreen(String playerName) {
    M5.Lcd.fillScreen(TFT_BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setTextColor(TFT_GREEN);
    M5.Lcd.setCursor(10, 10);
    M5.Lcd.println(playerName);
    M5.Lcd.setCursor(10, 50);
    M5.Lcd.println("SHAKE IT!");
    M5.Lcd.setCursor(10, 90);
    M5.Lcd.setTextColor(TFT_WHITE);
    M5.Lcd.println("Shake the M5");
    M5.Lcd.println("as hard as");
    M5.Lcd.println("you can!");

    // Draw shake hint
    M5.Lcd.setTextSize(4);
    M5.Lcd.setTextColor(TFT_GREEN);
    M5.Lcd.setCursor(50, 180);
    M5.Lcd.println("~SHAKE~");
}

void handleShakeInteraction() {
    float accX, accY, accZ;
    M5.IMU.getAccelData(&accX, &accY, &accZ);

    Serial.printf("IMU accX=%.2f accY=%.2f accZ=%.2f\n", accX, accY, accZ);

    // Detect a spike above threshold in any axis
    if (abs(accX) >= SHAKE_THRESHOLD ||
        abs(accY) >= SHAKE_THRESHOLD ||
        abs(accZ) >= SHAKE_THRESHOLD) {
        sendSuccess();
    }
}

///////////////////////////////////////////////////////////////
// Setup
///////////////////////////////////////////////////////////////
void setup() {
    M5.begin();
    M5.IMU.Init();
    M5.Lcd.setTextSize(3);
    Serial.begin(115200);

    BLEDevice::init(BLE_BROADCAST_NAME.c_str());
    drawScreenTextWithBackground("Initializing...", TFT_CYAN);

    broadcastBleServer();

    drawScreenTextWithBackground(
        "Waiting for\nphone...\n\nDevice:\n" + BLE_BROADCAST_NAME,
        TFT_BLUE
    );
}

///////////////////////////////////////////////////////////////
// Loop
///////////////////////////////////////////////////////////////
void loop() {
    M5.update();

    if (!deviceConnected || !waitingForInput) {
        delay(30);
        return;
    }

    if      (currentCommand == "BOP")   handleBopInteraction();
    else if (currentCommand == "SLIDE") handleSlideInteraction();
    else if (currentCommand == "TWIST") handleTwistInteraction();
    else if (currentCommand == "SHAKE") handleShakeInteraction();

    delay(30);
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