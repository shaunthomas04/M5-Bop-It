#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <M5Unified.h>

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
#define SLIDE_THRESHOLD 240

int  sliderX       = SLIDE_START_X;
bool sliderGrabbed = false;

///////////////////////////////////////////////////////////////
// IMU thresholds
///////////////////////////////////////////////////////////////
#define TWIST_THRESHOLD  0.7f
#define SHAKE_THRESHOLD  2.0f

float prevAccX = 0, prevAccY = 0, prevAccZ = 0;

///////////////////////////////////////////////////////////////
// M5Unified IMU helper — reads accel into floats
///////////////////////////////////////////////////////////////
void readAccel(float &ax, float &ay, float &az) {
    M5.Imu.update();  // explicitly pull fresh data
    auto data = M5.Imu.getImuData();
    ax = data.accel.x;
    ay = data.accel.y;
    az = data.accel.z;
    Serial.printf("readAccel raw: %.2f %.2f %.2f\n", ax, ay, az);
}

///////////////////////////////////////////////////////////////
// M5Unified touch helper
// Returns true if screen is touched, sets tx/ty to position
///////////////////////////////////////////////////////////////
bool getTouchPoint(int &tx, int &ty) {
    auto count = M5.Touch.getCount();
    if (count == 0) return false;
    auto detail = M5.Touch.getDetail(0);
    tx = detail.x;
    ty = detail.y;
    return true;
}

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
        Serial.println("Disconnected - restarting advertising");
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

            sliderX       = SLIDE_START_X;
            sliderGrabbed = false;

            // Seed previous accel so shake doesn't fire immediately
            readAccel(prevAccX, prevAccY, prevAccZ);

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

    M5.Lcd.fillRoundRect(40, 70, 240, 120, 20, TFT_RED);
    M5.Lcd.setTextSize(4);
    M5.Lcd.setTextColor(TFT_WHITE);
    M5.Lcd.setCursor(75, 115);
    M5.Lcd.println("BOP IT!");
}

void handleBopInteraction() {
    int tx, ty;
    if (!getTouchPoint(tx, ty)) return;

    if (tx >= 40 && tx <= 280 && ty >= 70 && ty <= 190) {
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

void handleSlideInteraction() {
    int tx, ty;
    bool touched = getTouchPoint(tx, ty);

    if (!touched) {
        sliderGrabbed = false;
        return;
    }

    bool touchingSlider = (tx >= sliderX && tx <= sliderX + SLIDER_W &&
                           ty >= SLIDE_Y - SLIDE_TRACK_H / 2 &&
                           ty <= SLIDE_Y + SLIDE_TRACK_H / 2);

    if (touchingSlider || sliderGrabbed) {
        sliderGrabbed = true;

        int newX = tx - SLIDER_W / 2;
        newX     = max(newX, SLIDE_START_X);
        newX     = min(newX, SLIDE_END_X);

        if (newX != sliderX) {
            sliderX = newX;

            M5.Lcd.fillRect(
                SLIDE_START_X, SLIDE_Y - SLIDE_TRACK_H / 2 - 2,
                SLIDE_END_X - SLIDE_START_X + SLIDER_W + 2,
                SLIDE_TRACK_H + 4,
                TFT_BLACK
            );
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

        if (sliderX >= SLIDE_THRESHOLD) {
            M5.Lcd.fillRoundRect(sliderX, SLIDE_Y - SLIDE_TRACK_H / 2, SLIDER_W, SLIDE_TRACK_H, 10, TFT_WHITE);
            delay(80);
            sendSuccess();
        }
    }
}

///////////////////////////////////////////////////////////////
// TWIST — rotate M5 sideways
// At rest:           accX≈0, accY≈0, accZ≈-1
// Rotated 90° right: accX≈0, accY≈1, accZ≈0
// Rotated 90° left:  accX≈0, accY≈-1, accZ≈0
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

    M5.Lcd.drawRoundRect(60, 160, 200, 60, 10, TFT_CYAN);
    M5.Lcd.setTextSize(3);
    M5.Lcd.setTextColor(TFT_CYAN);
    M5.Lcd.setCursor(80, 175);
    M5.Lcd.println("<< TURN");
}

void handleTwistInteraction() {
    float accX, accY, accZ;
    readAccel(accX, accY, accZ);

    Serial.printf("TWIST accX=%.2f accY=%.2f accZ=%.2f\n", accX, accY, accZ);

    if (abs(accY) >= TWIST_THRESHOLD) {
        sendSuccess();
    }
}

///////////////////////////////////////////////////////////////
// SHAKE — detect sudden acceleration delta between frames
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

    M5.Lcd.setTextSize(4);
    M5.Lcd.setTextColor(TFT_GREEN);
    M5.Lcd.setCursor(50, 180);
    M5.Lcd.println("~SHAKE~");
}

void handleShakeInteraction() {
    float accX, accY, accZ;
    readAccel(accX, accY, accZ);

    float dX = abs(accX - prevAccX);
    float dY = abs(accY - prevAccY);
    float dZ = abs(accZ - prevAccZ);

    Serial.printf("SHAKE dX=%.2f dY=%.2f dZ=%.2f\n", dX, dY, dZ);

    prevAccX = accX;
    prevAccY = accY;
    prevAccZ = accZ;

    if (dX >= SHAKE_THRESHOLD || dY >= SHAKE_THRESHOLD || dZ >= SHAKE_THRESHOLD) {
        sendSuccess();
    }
}

///////////////////////////////////////////////////////////////
// Setup
///////////////////////////////////////////////////////////////
void setup() {
    // Start serial first for debugging
    Serial.begin(115200);
    delay(500);

    // Configure M5
    auto cfg = M5.config();
    cfg.external_imu = true;   // helps detection on some boards
    M5.begin(cfg);

    // Screen setup
    M5.Lcd.setTextSize(3);

    // Initialize IMU
    if (!M5.Imu.begin()) {
        Serial.println("IMU initialization failed!");
    } else {
        Serial.println("IMU initialized.");
    }

    int imuType = M5.Imu.getType();
    Serial.printf("IMU type detected: %d\n", imuType);

    // BLE setup
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