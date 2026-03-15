import { Buffer } from "buffer"
import { PermissionsAndroid, Platform } from "react-native"
import { BleManager, Device, Subscription } from "react-native-ble-plx"

const SERVICE_UUID        = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"

class BLEManager {

  private manager:      BleManager
  private device:       Device | null = null
  private subscription: Subscription | null = null

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

  scanForDevice(deviceName: string, onFound: (device: Device) => void) {
    console.log(`Scanning for "${deviceName}"...`)
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) { console.log("Scan error:", error); return }
      if (!device) return
      const nameMatch = device.name === deviceName || device.localName === deviceName
      if (nameMatch) {
        console.log("Found:", device.name)
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
    this.device = await device.connect()
    await this.device.discoverAllServicesAndCharacteristics()
    console.log("Connected")
    return this.device
  }

  ///////////////////////////////////////////////////////////////
  // Subscribe to SUCCESS notifications from the M5
  // Call this once after connecting — stays active all game
  ///////////////////////////////////////////////////////////////
  subscribeToNotifications(onMessage: (message: string) => void) {
    if (!this.device) { console.log("No device to subscribe to"); return }

    // Remove any existing subscription first
    this.subscription?.remove()

    this.subscription = this.device.monitorCharacteristicForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) { console.log("Notify error:", error); return }
        if (!characteristic?.value) return
        const decoded = Buffer.from(characteristic.value, "base64").toString("utf-8")
        console.log("M5 says:", decoded)
        onMessage(decoded)
      }
    )
  }

  unsubscribe() {
    this.subscription?.remove()
    this.subscription = null
  }

  async sendMessage(message: string) {
    if (!this.device) { console.log("No device connected"); return }
    const encoded = Buffer.from(message).toString("base64")
    await this.device.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      encoded
    )
    console.log("Sent:", message)
  }

  async disconnect() {
    this.unsubscribe()
    if (!this.device) return
    await this.device.cancelConnection()
    this.device = null
    console.log("Disconnected")
  }
}

export default new BLEManager()