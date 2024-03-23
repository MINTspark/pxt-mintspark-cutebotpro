namespace DriveStraight {
    let MPU6050_SELF_TEST_X_ACCEL = 0x0D;
    let MPU6050_WHO_AM_I_MPU6050 = 0x75; // Should return 0x68
    let MPU6050_PWR_MGMT_1 = 0x6B; // Device defaults to the SLEEP mode
    let MPU6050_ADDRESS = 0x68;
    let MPU6050_MPU_CONFIG = 0x1A;
    let MPU6050_SMPLRT_DIV = 0x19;
    let MPU6050_GYRO_CONFIG = 0x1B;
    let MPU6050_ACCEL_CONFIG = 0x1C;
    let MPU6050_INT_PIN_CFG = 0x37;
    let MPU6050_INT_ENABLE = 0x38;
    let MPU6050_INT_STATUS = 0x3A;
    let MPU6050_ACCEL_XOUT_H = 0x3B;

    function readByte(reg: number): NumberFormat.UInt8BE
    {
        pins.i2cWriteNumber(MPU6050_ADDRESS, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(MPU6050_ADDRESS, NumberFormat.UInt8BE);
    }

    function readBytes(reg: number, size: number): Buffer {
        pins.i2cWriteNumber(MPU6050_ADDRESS, reg, NumberFormat.UInt8BE);
        return pins.i2cReadBuffer(MPU6050_ADDRESS, size);
    }

    function writeByte(reg: number, value: number) {
        pins.i2cWriteNumber(MPU6050_ADDRESS, reg, NumberFormat.UInt8BE);
        pins.i2cWriteNumber(MPU6050_ADDRESS, value, NumberFormat.UInt8BE);
    }

    function dataAvailable(): boolean {
        return readByte(MPU6050_INT_STATUS) == 1;
    }

    function InitMPU6050(): boolean
    {
        // Check device is connected
        if (!(readByte(MPU6050_WHO_AM_I_MPU6050) == MPU6050_ADDRESS)) {
            return false;
        }

        // Reset device
        writeByte(MPU6050_PWR_MGMT_1, 0x80); // Write a one to bit 7 reset bit; toggle reset device
        basic.pause(100);

        // wake up device
        writeByte(MPU6050_PWR_MGMT_1, 0x00); // Clear sleep mode bit (6), enable all sensors
        basic.pause(100); // Wait for all registers to reset

        // get stable time source
        writeByte(MPU6050_PWR_MGMT_1, 0x03);  // Auto select clock source to be PLL gyroscope reference if ready else
        basic.pause(200);

        // Configure Gyro and Thermometer
        // Disable FSYNC and set thermometer and gyro bandwidth to 44 and 42 Hz, respectively;
        // minimum delay time for this setting is 4.9 ms, which means sensor fusion update rates cannot
        // be higher than 1 / 0.0049 = ~200 Hz
        // DLPF_CFG = bits 2:0 = 011; this limits the sample rate to 1000 Hz for both 
        // With the MPU6050, it is possible to get gyro sample rates of 8 kHz, or 1 kHz
        writeByte(MPU6050_MPU_CONFIG, 0x03);

        // Set sample rate = gyroscope output rate/(1 + SMPLRT_DIV)
        writeByte(MPU6050_SMPLRT_DIV, 0x03);  // Use a 250 Hz rate; a rate consistent with the filter update rate
        // determined inset in CONFIG above

        // Set gyroscope full scale range
        // Range selects FS_SEL and GFS_SEL are 0 - 3, so 2-bit values are left-shifted into positions 4:3
        let c = readByte(MPU6050_GYRO_CONFIG); // get current GYRO_CONFIG register value
        // c = c & ~0xE0; // Clear self-test bits [7:5]
        c = c & ~0x03; // Clear Fchoice bits [1:0]
        c = c & ~0x18; // Clear GFS bits [4:3]
        c = c | (3 as NumberFormat.UInt8BE) << 3; // Set 2000dps full scale range for the gyro (11 on 4:3)
        // c =| 0x00; // Set Fchoice for the gyro to 11 by writing its inverse to bits 1:0 of GYRO_CONFIG
        writeByte(MPU6050_GYRO_CONFIG, c); // Write new GYRO_CONFIG value to register

        // Set accelerometer full-scale range configuration
        c = readByte(MPU6050_ACCEL_CONFIG); // get current ACCEL_CONFIG register value
        // c = c & ~0xE0; // Clear self-test bits [7:5]
        c = c & ~0x18;  // Clear AFS bits [4:3]
        c = c | (3 as NumberFormat.UInt8BE) << 3; // Set 16g full scale range for the accelerometer (11 on 4:3)
        writeByte(MPU6050_ACCEL_CONFIG, c); // Write new ACCEL_CONFIG register value

        // Set accelerometer sample rate configuration
        // It is possible to get a 4 kHz sample rate from the accelerometer by choosing 1 for
        writeByte(MPU6050_MPU_CONFIG, 0x03); // Set accelerometer rate to 1 kHz and bandwidth to 44 Hz

        // The accelerometer, gyro, and thermometer are set to 1 kHz sample rates,
        // but all these rates are further reduced by a factor of 5 to 200 Hz because of the SMPLRT_DIV setting

        // Configure Interrupts and Bypass Enable
        // Set interrupt pin active high, push-pull, hold interrupt pin level HIGH until interrupt cleared,
        // clear on read of INT_STATUS, and enable I2C_BYPASS_EN so additional chips
        // can join the I2C bus and all can be controlled by the Arduino as master
        writeByte(MPU6050_INT_PIN_CFG, 0x22);
        writeByte(MPU6050_INT_ENABLE, 0x01);    // Enable data ready (bit 0) interrupt
        basic.pause(100);
        return true;
    }




    function UpdateMPU6050() {
        if (!dataAvailable()) return;

        let IMUCount: NumberFormat.UInt16BE[]; // used to read all 14 bytes at once from the MPU6050 accel/gyro
        let rawData: NumberFormat.UInt8BE[];  // x/y/z accel register data stored here
                                                
        let buffer = readBytes(MPU6050_ACCEL_XOUT_H, 14);    // Read the 14 raw data registers into data array

    }
}
