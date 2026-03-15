import { Buffer } from "buffer"
import { PermissionsAndroid, Platform } from "react-native"
import { BleManager, Device } from "react-native-ble-plx"

const SERVICE_UUID        = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"

class BLEManager {

  private manager: BleManager
  private device: Device | null = null

  constructor() {
    this.manager = new BleManager()
  }

  async requestPermissions() {
    if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ])
    }
  }

  ///////////////////////////////////////////////////////////////
  // Scan — device name passed in from the UI
  ///////////////////////////////////////////////////////////////
  scanForDevice(deviceName: string, onFound: (device: Device) => void) {
    console.log(`Scanning for "${deviceName}"...`)

    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log("Scan error:", error)
        return
      }
      if (!device) return

      if (device.name === deviceName) {
        console.log("Found device:", device.name, "|", device.localName)
        this.manager.stopDeviceScan()
        this.device = device
        onFound(device)
      }
    })
  }

  stopScan() {
    this.manager.stopDeviceScan()
  }

  async connect(device: Device) {
    console.log("Connecting...")
    this.device = await device.connect()
    await this.device.discoverAllServicesAndCharacteristics()
    console.log("Connected")
    return this.device
  }

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
    console.log("Sent:", message)
  }

  async disconnect() {
    if (!this.device) return
    await this.device.cancelConnection()
    this.device = null
    console.log("Disconnected")
  }
}

export default new BLEManager()