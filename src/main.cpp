#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <M5Unified.h>

///////////////////////////////////////////////////////////////
// Function Prototypes
///////////////////////////////////////////////////////////////
void broadcastBleServer();
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

int bopX = 160;
int bopY = 120;
int bopRadius = 50;

///////////////////////////////////////////////////////////////
// IMU thresholds
///////////////////////////////////////////////////////////////
#define TWIST_THRESHOLD  0.7f
#define SHAKE_THRESHOLD  2.0f

float prevAccX = 0, prevAccY = 0, prevAccZ = 0;


void drawCenteredDotsScreen(String text, uint16_t textColor) {
    M5.Lcd.fillScreen(TFT_BLACK);

    int screenW = M5.Lcd.width();
    int screenH = M5.Lcd.height();

    ///////////////////////////////////////////////////////////
    // Draw centered multi-line text
    ///////////////////////////////////////////////////////////
    M5.Lcd.setTextSize(2);
    M5.Lcd.setTextColor(textColor);

    int lineHeight = 25;
    int startY = 70;

    int lineStart = 0;
    int lineEnd   = 0;
    int currentY  = startY;

    while ((lineEnd = text.indexOf('\n', lineStart)) != -1) {
        String line = text.substring(lineStart, lineEnd);

        int textWidth = line.length() * 12; 
        int x = (screenW - textWidth) / 2;

        M5.Lcd.setCursor(x, currentY);
        M5.Lcd.println(line);

        currentY += lineHeight;
        lineStart = lineEnd + 1;
    }

    // Last line
    String lastLine = text.substring(lineStart);
    int textWidth = lastLine.length() * 12;
    int x = (screenW - textWidth) / 2;

    M5.Lcd.setCursor(x, currentY);
    M5.Lcd.println(lastLine);

    // Draw 4 colored dots (centered)
    int dotY = currentY + 50;
    int spacing = 40;
    int radius  = 10;

    int totalWidth = spacing * 3;
    int startX = (screenW / 2) - (totalWidth / 2);

    M5.Lcd.fillCircle(startX + 0 * spacing, dotY, radius, TFT_RED);
    M5.Lcd.fillCircle(startX + 1 * spacing, dotY, radius, TFT_BLUE);
    M5.Lcd.fillCircle(startX + 2 * spacing, dotY, radius, TFT_GREEN);
    M5.Lcd.fillCircle(startX + 3 * spacing, dotY, radius, TFT_YELLOW);

    // Device name (bottom-right)
    M5.Lcd.setTextSize(1);
    M5.Lcd.setTextColor(TFT_LIGHTGREY);

    int nameWidth = BLE_BROADCAST_NAME.length() * 6;
    int nameX = screenW - nameWidth - 5;
    int nameY = screenH - 15;

    M5.Lcd.setCursor(nameX, nameY);
    M5.Lcd.print(BLE_BROADCAST_NAME);
}

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
        drawCenteredDotsScreen("Start Game to Continue!", TFT_GREEN);
    }

    void onDisconnect(BLEServer *pServer) {
        deviceConnected = false;
        waitingForInput  = false;
        Serial.println("Disconnected - restarting advertising");
        BLEDevice::startAdvertising();
        drawCenteredDotsScreen("Disconnected.\nWaiting...", TFT_YELLOW);

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
           
            drawCenteredDotsScreen(currentPlayerName + "\nTOO SLOW!", TFT_RED);
            delay(1500);
            drawCenteredDotsScreen("Waiting for\nnext round...", TFT_WHITE);

        } else if (msg == "SAFE") {
            waitingForInput = false;
           
            drawCenteredDotsScreen(currentPlayerName + "\nSAFE!", TFT_GREEN);
            delay(1000);
            drawCenteredDotsScreen("Waiting for\nnext round...", TFT_WHITE);
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

    // Player name
    M5.Lcd.setTextSize(2);
    M5.Lcd.setTextColor(TFT_WHITE);
    M5.Lcd.setCursor(10, 10);
    M5.Lcd.println(playerName);

    // Random position (keep fully on screen)
    int margin = bopRadius + 10;

    bopX = random(margin, M5.Lcd.width()  - margin);
    bopY = random(margin + 40, M5.Lcd.height() - margin); 
    // +40 so it doesn't overlap player name

    // Draw red circle button
    M5.Lcd.fillCircle(bopX, bopY, bopRadius, TFT_RED);
}

void handleBopInteraction() {
    int tx, ty;
    if (!getTouchPoint(tx, ty)) return;

    // Distance from touch to center
    int dx = tx - bopX;
    int dy = ty - bopY;

    if (dx * dx + dy * dy <= bopRadius * bopRadius) {
        // Flash white for feedback
        M5.Lcd.fillCircle(bopX, bopY, bopRadius, TFT_WHITE);
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

    M5.Lcd.fillRoundRect(
        SLIDE_START_X,
        SLIDE_Y - SLIDE_TRACK_H / 2,
        SLIDE_END_X - SLIDE_START_X,
        SLIDE_TRACK_H,
        10,
        TFT_DARKGREY
    );

    M5.Lcd.fillRoundRect(
        sliderX,
        SLIDE_Y - SLIDE_TRACK_H / 2,
        SLIDER_W,
        SLIDE_TRACK_H,
        10,
        TFT_YELLOW
    );
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

        newX = max(newX, SLIDE_START_X);
        newX = min(newX, SLIDE_END_X - SLIDER_W);

        if (newX != sliderX) {
            sliderX = newX;

            M5.Lcd.fillRect(
                SLIDE_START_X,
                SLIDE_Y - SLIDE_TRACK_H / 2 - 2,
                SLIDE_END_X - SLIDE_START_X,
                SLIDE_TRACK_H + 4,
                TFT_BLACK
            );

            M5.Lcd.fillRoundRect(
                SLIDE_START_X,
                SLIDE_Y - SLIDE_TRACK_H / 2,
                SLIDE_END_X - SLIDE_START_X,
                SLIDE_TRACK_H,
                10,
                TFT_DARKGREY
            );

            M5.Lcd.fillRoundRect(
                sliderX,
                SLIDE_Y - SLIDE_TRACK_H / 2,
                SLIDER_W,
                SLIDE_TRACK_H,
                10,
                TFT_YELLOW
            );
        }

        if (sliderX >= SLIDE_END_X - SLIDER_W) {
            M5.Lcd.fillRoundRect(
                sliderX,
                SLIDE_Y - SLIDE_TRACK_H / 2,
                SLIDER_W,
                SLIDE_TRACK_H,
                10,
                TFT_WHITE
            );
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

    // Header text
    M5.Lcd.setTextSize(2);
    M5.Lcd.setTextColor(TFT_WHITE);
    M5.Lcd.setCursor(10, 10);
    M5.Lcd.println(playerName);

    M5.Lcd.setTextColor(TFT_BLUE);
    // --- CENTER ---
    int cx = 160;
    int cy = 120;
    int radius = 50;

    // Thick circle
    for (int i = 0; i < 8; i++) {
        M5.Lcd.drawCircle(cx, cy, radius - i, TFT_BLUE);
    }

    // --- GAPS on LEFT + RIGHT sides ---
    M5.Lcd.fillCircle(cx - radius + 5, cy, 20, TFT_BLACK); // left gap
    M5.Lcd.fillCircle(cx + radius - 5, cy, 20, TFT_BLACK); // right gap

   // --- DOWN ARROW (moved slightly UP) ---
    M5.Lcd.fillTriangle(
        cx - radius, cy + 10,        // tip (was +18)
        cx - radius - 12, cy - 10,   // base adjusted up slightly
        cx - radius + 12, cy - 10,
        TFT_BLUE
    );

    // --- UP ARROW (moved slightly DOWN) ---
    M5.Lcd.fillTriangle(
        cx + radius, cy - 10,        // tip (was -18)
        cx + radius - 12, cy + 10,   // base adjusted down slightly
        cx + radius + 12, cy + 10,
        TFT_BLUE
    );

    // Instruction text
    // M5.Lcd.setTextSize(2);
    // M5.Lcd.setTextColor(TFT_WHITE);
    // M5.Lcd.setCursor(70, 200);
    // M5.Lcd.println("Rotate device");
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

    drawCenteredDotsScreen("Initializing...", TFT_BLACK);
    broadcastBleServer();

    drawCenteredDotsScreen("Connect to phone\nto start game", TFT_WHITE);
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