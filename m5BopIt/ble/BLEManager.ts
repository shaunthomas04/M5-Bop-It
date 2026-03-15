import { Buffer } from "buffer"
import { PermissionsAndroid, Platform } from "react-native"
import { BleManager, Device } from "react-native-ble-plx"

const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
const DEVICE_NAME = "Grissoms M5Core2024"

class BLEManager {

  private manager: BleManager
  private device: Device | null = null

  constructor() {
    this.manager = new BleManager()
  }

  ///////////////////////////////////////////////////////////////
  // Request BLE permissions (Android)
  ///////////////////////////////////////////////////////////////
  async requestPermissions() {
    if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      ])
    }
  }

  ///////////////////////////////////////////////////////////////
  // Scan for the M5 device
  ///////////////////////////////////////////////////////////////
  scanForDevice(onFound: (device: Device) => void) {

    console.log("Starting BLE scan...")

    this.manager.startDeviceScan(null, null, (error, device) => {

      if (error) {
        console.log("Scan error:", error)
        return
      }

      if (!device) return

      if (device.name === DEVICE_NAME) {

        console.log("Found M5 device:", device.name)

        this.manager.stopDeviceScan()

        this.device = device
        onFound(device)
      }
    })
  }

  ///////////////////////////////////////////////////////////////
  // Connect to the M5 device
  ///////////////////////////////////////////////////////////////
  async connect(device: Device) {

    console.log("Connecting to device...")

    this.device = await device.connect()

    await this.device.discoverAllServicesAndCharacteristics()

    console.log("Connected to M5")

    return this.device
  }

  ///////////////////////////////////////////////////////////////
  // Send message to the ESP32 characteristic
  ///////////////////////////////////////////////////////////////
  async sendMessage(message: string) {

    if (!this.device) {
      console.log("No device connected")
      return
    }

    const base64Message = Buffer.from(message).toString("base64")

    await this.device.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      base64Message
    )

    console.log("Sent message:", message)
  }

  ///////////////////////////////////////////////////////////////
  // Disconnect
  ///////////////////////////////////////////////////////////////
  async disconnect() {

    if (!this.device) return

    await this.device.cancelConnection()

    console.log("Disconnected")

    this.device = null
  }

}

export default new BLEManager()