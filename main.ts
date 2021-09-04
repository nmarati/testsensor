
/**
 * Use this file to define custom functions and blocks.
 * Read more at https://makecode.microbit.org/blocks/custom
 */

enum Status {
    Off,
    On,
}

enum TemperatureScale {
    //% block="Celsius (*C)"
    Celsius,
    //% block="Fahrenheit (*F)"
    Fahrenheit,
    //% block="Kelvin"
    Kelvin
}

/**********************************
 * Kodely Blocks
***********************************/
//% weight=100 color=#f4a261 icon="\uf2de"
namespace kodely {
    /*
     * Returns light level from light sensor 
     * @param Pin number to which light sensor is connected to
    */
    //% help=Returns current light level
    //% blockId="LightLevel" block="light level %Pin"
    export function lightlevel(Pin: AnalogPin): number {
        let lightLevel = 0;
        lightLevel = pins.map(
            pins.analogReadPin(Pin),
            0,
            1023,
            0,
            100
        );
        return Math.round(lightLevel);
    }

    /*
     * Turn LED on/off connected to pin
     * @param ledonoff On or Off
     * @param Pin number to which LED is connected to
    */
    //% blockId=turn_LED block="Turn LED %ledonff at %pin"
    //% ledonff.shadow="toggleOnOff"
    export function turnLED(ledonoff: boolean, pin: AnalogPin): void {
        if (ledonoff) {
            pins.analogSetPeriod(pin, 100)
            pins.analogWritePin(pin, 100) // brightness
        }
        else {
            pins.analogWritePin(pin, 0)
        }
    }

    /*
    * Detect Motion
    * @param Pin number to which motion sensor is connected to
    */
    //% blockId="motion_sensor" block="Motion detected on %pin"
    export function motionSensor(pin: DigitalPin): boolean {
        return (pins.digitalReadPin(pin) == 1)
    }

    /*
     * Returns soil moisture level from soil moisture sensor 
     * @param Pin number to which soil moisture sensor is connected to
    */
    //% help=Returns current soil moisture level
    //% blockId="soil_moisture" block="soil moisture level | %Pin"
    export function soilMoisture(Pin: AnalogPin): number {
        let moistureLevel = 0;
        moistureLevel = pins.map(
            pins.analogReadPin(Pin),
            0,
            1023,
            0,
            100
        );
        return Math.round(moistureLevel);
    }

    /*
    * Turn motor on/off
    * @param On/Off motor
    * @param Pin number to which motor is connected to 
    */

    //% blockId=turn_motor block="Turn motor $motorStatus | on %pin "
    export function turnMotor(motorStatus: Status, pin: DigitalPin): void {
        pins.digitalWritePin(pin, motorStatus)
    }

    /*
    * get temperature 
    * @param pin number to which DHT11 sensor is connected to
    * @param Temperature scale
    */

    //% blockId="temp_sensor" block="temperature in %temperatureScale| on %pin"
    export function temperature(temperatureScale: TemperatureScale, pin: DigitalPin): number {
        /*
        Notes from DHT11 Datasheet
        Single-bus data format is used for communication and synchronization between MCU and DHT11 sensor

        When MCU sends a start signal, DHT11 changes from the low-power-consumption mode to the
        running-mode, waiting for MCU completing the start signal. Once it is completed, DHT11 sends a
        response signal of 40-bit data that include the relative humidity and temperature information to MCU.

        Data consists of decimal and integral parts. A complete data transmission is 40bit, and the
        sensor sends higher data bit first.

        Data format: 8bit integral RH data + 8bit decimal RH data + 8bit integral T data + 8bit decimal T
        data + 8bit check sum. If the data transmission is right, the check-sum should be the last 8bit of
        "8bit integral RH data + 8bit decimal RH data + 8bit integral T data + 8bit decimal T data".
        */
        let dataBits: boolean[] = []

        // Data from sensor is 50 bits 
        // bytes 1-2 Relative humidity 
        // bytes 3-4 Temperature`
        // byte 5 Check sum
        for (let i = 0; i < 40; i++) dataBits.push(false)

        //Send start signal, pull down for atleast 18ms
        pins.digitalWritePin(pin, 0)
        basic.pause(18)

        //pull up and wait for 20-40us for ack signal from sensor 
        pins.setPull(pin, PinPullMode.PullUp)
        pins.digitalReadPin(pin)
        control.waitMicros(40)

        if (pins.digitalReadPin(pin) == 1) return -1 //if sensor is responding, it should have returned 0

        // sensor sends response signal by sending low for 80us, followed by high for 80us
        while (pins.digitalReadPin(pin) == 0);
        while (pins.digitalReadPin(pin) == 1);

        //When DHT is sending data to MCU, every bit of data begins with the 50ms low-voltage-level and
        //the length of the following high-voltage-level signal determines whether data bit is "0" or "1" 
        // data 0 is low for 50 us and 26-28 us
        // data 1 is low for 50 us and 70 us
        for (let i = 0; i < 40; i++) {
            while (pins.digitalReadPin(pin) == 1); // this to loop until start of next bit, if prior bit was 1
            while (pins.digitalReadPin(pin) == 0);
            control.waitMicros(28)
            //if pin is high after 28 us it means 1, otherwise 0
            if (pins.digitalReadPin(pin) == 1) dataBits[i] = true
        }

        //convert bits to humidity/temp & checksum
        let RHint: number = 0, RHdec: number = 0;
        let Tint: number = 0, Tdec: number = 0;
        let chksum: number = 0;

        // 7-i is we are processing MSB->LSB
        for (let i = 0; i < 8; i++) RHint += (dataBits[i] ? 2 ** (7 - i) : 0)
        for (let i = 0; i < 16; i++) RHdec += (dataBits[i + 8] ? 2 ** (7 - i) : 0)
        for (let i = 0; i < 24; i++) Tint += (dataBits[i + 16] ? 2 ** (7 - i) : 0)
        for (let i = 0; i < 32; i++) Tdec += (dataBits[i + 24] ? 2 ** (7 - i) : 0)
        for (let i = 0; i < 40; i++) chksum += (dataBits[i + 32] ? 2 ** (7 - i) : 0)

        //verify last byte of the RHint+RHdec+Tint+Tdec ==  checksum 
        if (((RHint + RHdec + Tint + Tdec) & 255) == chksum) {
            //0 - *C / 1 - *F /2 - K
            return temperatureScale == 0 ? Tint + Tdec / 100 : temperatureScale == 1 ? (Tint + Tdec / 100) * 9 / 5 + 32 : (Tint + Tdec / 100) + 273.15
        } else {
            return -999
        }
    }

    /*
    * get Relative Humidity 
    * @param pin number to which DHT11 sensor is connected to
    */

    //% blockId="humidity_sensor" block="Relative Humidity on %pin"
    export function relativeHumidity(pin: DigitalPin): number {
        /*
        Notes from DHT11 Datasheet
        Single-bus data format is used for communication and synchronization between MCU and DHT11 sensor

        When MCU sends a start signal, DHT11 changes from the low-power-consumption mode to the
        running-mode, waiting for MCU completing the start signal. Once it is completed, DHT11 sends a
        response signal of 40-bit data that include the relative humidity and temperature information to MCU.

        Data consists of decimal and integral parts. A complete data transmission is 40bit, and the
        sensor sends higher data bit first.

        Data format: 8bit integral RH data + 8bit decimal RH data + 8bit integral T data + 8bit decimal T
        data + 8bit check sum. If the data transmission is right, the check-sum should be the last 8bit of
        "8bit integral RH data + 8bit decimal RH data + 8bit integral T data + 8bit decimal T data".
        */
        let dataBits: boolean[] = []

        // Data from sensor is 50 bits 
        // bytes 1-2 Relative humidity 
        // bytes 3-4 Temperature`
        // byte 5 Check sum
        for (let i = 0; i < 40; i++) dataBits.push(false)

        //Send start signal, pull down for atleast 18ms
        pins.digitalWritePin(pin, 0)
        basic.pause(18)

        //pull up and wait for 20-40us for ack signal from sensor 
        pins.setPull(pin, PinPullMode.PullUp)
        pins.digitalReadPin(pin)
        control.waitMicros(40)

        if (pins.digitalReadPin(pin) == 1) return -1 //if sensor is responding, it should have returned 0

        // sensor sends response signal by sending low for 80us, followed by high for 80us
        while (pins.digitalReadPin(pin) == 0);
        while (pins.digitalReadPin(pin) == 1);

        //When DHT is sending data to MCU, every bit of data begins with the 50ms low-voltage-level and
        //the length of the following high-voltage-level signal determines whether data bit is "0" or "1" 
        // data 0 is low for 50 us and 26-28 us
        // data 1 is low for 50 us and 70 us
        for (let i = 0; i < 40; i++) {
            while (pins.digitalReadPin(pin) == 1); // this to loop until start of next bit, if prior bit was 1
            while (pins.digitalReadPin(pin) == 0);
            control.waitMicros(28)  // wait for min interval of 28us 
            //if pin is high after 28 us it means 1, otherwise 0
            if (pins.digitalReadPin(pin) == 1) dataBits[i] = true
        }

        //convert bits to humidity/temp & checksum
        let RHint: number = 0, RHdec: number = 0;
        let Tint: number = 0, Tdec: number = 0;
        let chksum: number = 0;

        // 7-i is we are processing MSB->LSB
        for (let i = 0; i < 8; i++) RHint += (dataBits[i] ? 2 ** (7 - i) : 0)
        for (let i = 0; i < 16; i++) RHdec += (dataBits[i + 8] ? 2 ** (7 - i) : 0)
        for (let i = 0; i < 24; i++) Tint += (dataBits[i + 16] ? 2 ** (7 - i) : 0)
        for (let i = 0; i < 32; i++) Tdec += (dataBits[i + 24] ? 2 ** (7 - i) : 0)
        for (let i = 0; i < 40; i++) chksum += (dataBits[i + 32] ? 2 ** (7 - i) : 0)

        //verify last byte of the RHint+RHdec+Tint+Tdec == checksum 
        if (((RHint + RHdec + Tint + Tdec) & 255) == chksum) {
            return RHint + RHdec / 100
        } else {
            serial.writeLine("RH-" + RHint + "-" + RHdec)
            serial.writeLine("T-" + Tint + "-" + Tdec)
            serial.writeLine("chk-" + chksum)
            return -999
        }
    }

}