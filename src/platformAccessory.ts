import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { VirtualDevicePlatform } from './platform.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class VirtualDeviceAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private states = {
    On: false,
    Brightness: 0,
    CurrentPosition: 0
    TargetPosition: 0
  };

  devConfig;
  sensor;

  constructor(
    private readonly platform: VirtualDevicePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // check current config for device
    this.devConfig = this.platform.config.devices.find((item) => item.name === accessory.context.device.name) || {};

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Homebridge Virtual Device')
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.device.type || 'type')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.uuid || 'uuid');


    // set device type
    if (this.devConfig.type === 'switch') {
      this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
    } else if (this.devConfig.type === 'dimmer') {
      this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
    } else if (this.devConfig.type === 'blind') {
      this.service = this.accessory.getService(this.platform.Service.WindowCovering) || this.accessory.addService(this.platform.Service.WindowCovering);
    }

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);


    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    if (this.devConfig.type === 'dimmer') {
      // register handlers for the Brightness Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.Brightness)
        .onSet(this.setValue.bind(this));       // SET - bind to the 'setValue` method below
    }

    if (this.devConfig.type === 'blind') {
      // register handlers for the Position Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.TargetPosition)
        .onSet(this.setValue.bind(this));       // SET - bind to the 'setValue` method below
    }

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same subtype id.)
     */

    // remove sensor if it is set to off or if need to change type
    if (this.accessory.getService('sensor')?.subtype !== this.devConfig.sensor) {
      const removeService = this.accessory.getService('sensor');
      if (removeService) {
        this.accessory.removeService(removeService);
      }
      this.platform.log.info(`remove sensor for: ${accessory.context.device.name}`);
    }

    // add sensor
    if (this.devConfig.sensor === 'motion') {
      // Add motion sensor
      this.sensor = this.accessory.getService('sensor') ||
        this.accessory.addService(this.platform.Service.MotionSensor, 'sensor', 'motion');
    } else if (this.devConfig.sensor === 'contact') {
      // Add contact sensor
      this.sensor = this.accessory.getService('sensor') ||
        this.accessory.addService(this.platform.Service.ContactSensor, 'sensor', 'contact');
    } else if (this.devConfig.sensor === 'occupancy') {
      // Add occupancy sensor
      this.sensor = this.accessory.getService('sensor') ||
        this.accessory.addService(this.platform.Service.OccupancySensor, 'sensor', 'occupancy');
    } else if (this.devConfig.sensor === 'leak') {
      // Add leak sensor
      this.sensor = this.accessory.getService('sensor') ||
        this.accessory.addService(this.platform.Service.LeakSensor, 'sensor', 'leak');
    }

  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.states.On = value as boolean;

    this.platform.log.info(`[${this.accessory.context.device.name}]: ${(value) ? 'set on' : 'set off'}`);

    // triger motion sensor if added
    if (!value) {
      this.triggerSensor();
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.states.On;

    this.platform.log.info(`[${this.accessory.context.device.name}]: ${(isOn) ? 'on' : 'off'}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return isOn;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async setValue(value: CharacteristicValue) {

    if (this.devConfig.type === 'dimmer') {
      this.states.Brightness = value as number;
    } else if (this.devConfig.type === 'blind') {
      this.states.CurrentPosition = value as number;
      this.states.TargetPosition = value as number;
    }

    this.platform.log.info(`[${this.accessory.context.device.name}]: ${value}%`);
  }

  async triggerSensor() {
    if (this.devConfig.sensor === 'motion') {
      this.sensor.updateCharacteristic(this.platform.Characteristic.MotionDetected, true);
      setTimeout(() => {
        this.sensor.updateCharacteristic(this.platform.Characteristic.MotionDetected, false);
      }, 3000);
    } else if (this.devConfig.sensor === 'contact') {
      this.sensor.updateCharacteristic(this.platform.Characteristic.ContactSensorState, true);
      setTimeout(() => {
        this.sensor.updateCharacteristic(this.platform.Characteristic.ContactSensorState, false);
      }, 3000);
    } else if (this.devConfig.sensor === 'occupancy') {
      this.sensor.updateCharacteristic(this.platform.Characteristic.OccupancyDetected, true);
      setTimeout(() => {
        this.sensor.updateCharacteristic(this.platform.Characteristic.OccupancyDetected, false);
      }, 3000);
    } else if (this.devConfig.sensor === 'leak') {
      this.sensor.updateCharacteristic(this.platform.Characteristic.LeakDetected, true);
      setTimeout(() => {
        this.sensor.updateCharacteristic(this.platform.Characteristic.LeakDetected, false);
      }, 3000);
    }

  }

}
