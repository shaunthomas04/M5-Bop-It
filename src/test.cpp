// #include <M5Unified.h>

// void setup() {
//     auto cfg = M5.config();
//     M5.begin(cfg);

//     M5.Display.setRotation(1);
//     M5.Display.setTextFont(&fonts::Font4);
//     M5.Display.setTextSize(1);
// }

// void loop() {
//     M5.update();   // important

//     if (M5.Imu.update()) {

//         auto ImuData = M5.Imu.getImuData();

//         M5.Display.fillScreen(TFT_WHITE);
//         M5.Display.setCursor(0, 20);
//         M5.Display.setTextColor(TFT_RED);

//         M5.Display.printf("IMU:\n");
//         M5.Display.printf("ax:%6.2f ay:%6.2f az:%6.2f\n",
//             ImuData.accel.x, ImuData.accel.y, ImuData.accel.z);

//         M5.Display.printf("gx:%6.2f gy:%6.2f gz:%6.2f\n",
//             ImuData.gyro.x, ImuData.gyro.y, ImuData.gyro.z);
//     }

//     delay(200);
// }