//% weight=100 color=#DC22E1 block="MINTspark Cutebot" blockId="MINTspark Cutebot" icon="\uf48b"
namespace EasyCbp
{
    let i2cAddr: number = 0x10;
    let steeringCorrection = 0;
    let distanceCorrection = 0;
    let neopixelStrip = neopixel.create(DigitalPin.P15, 2, NeoPixelMode.RGB);
    let minSpeed = 25;
    let maxSpeed = 65;
    let MPU6050Initialised = false;
    let stopDrive = true;
    let currentLineTrackingState = TrackbitStateType.Tracking_State_0;
    CutebotPro.extendServoControl(ServoType.Servo180, CutebotProServoIndex.S1, 15)

    export enum DriveDirection {
        //%block="forward"
        Forward = 1,
        //%block="reverse"
        Backward = 0
    }

    export enum DistanceUnits {
        //%block="cm"
        Cm = 0,
        //%block="inch"
        Inch = 1,
    }

    export enum TurnDirection {
        //%block="left"
        Left = 0,
        //%block="right"
        Right = 1
    }

    export enum EasyAmount {
        //%block="small"
        Small = 0,
        //%block="medium"
        Medium = 1,
        //%block="big"
        Big = 1
    }

    export enum RGBHeadlight {
        //%block="left headlight"
        RGBL = 2,
        //%block="right headlight"
        RGBR = 1,
        //%block="all headlights"
        RGBA = 3
    }

    export function restictSpeed(speed: number) : number{
        if (speed > maxSpeed) return maxSpeed;
        if (speed < minSpeed) return minSpeed;
        return speed;
    }

    //% group="Drive"
    //% block="drive %direction with speed %speed\\% || for %distance %distanceUnits"
    //% expandableArgumentMode="toggle"
    //% inlineInputMode=inline
    //% speed.min=25 speed.max=50 speed.defl=30 distanceUnits.defl=DistanceUnits.Cm
    //% weight=100
    export function driveSpeedDistance(direction: DriveDirection, speed: number, distance?: number, distanceUnits?: DistanceUnits): void {
        stopDrive = true;
        speed = restictSpeed(speed);
        if (distanceUnits == DistanceUnits.Cm)
            distance = distance;
        else if (distanceUnits == DistanceUnits.Inch)
            distance = distance * 2.54;

        let distCorrection = (100 + distanceCorrection) / 100;
        let targetDegrees = (360 / 15.865) * distance * distCorrection;
        let modifier = 1;
        let steeringCorrectionHalf = speed * steeringCorrection / 2;

        if (direction == DriveDirection.Backward)
        {
            speed = speed * -1;
            modifier = -1;
        }

        let speedL = speed + steeringCorrectionHalf * modifier;
        let speedR = speed - steeringCorrectionHalf * modifier;

        if (distance == null)
        {
            CutebotPro.pwmCruiseControl(speed + steeringCorrectionHalf * modifier, speed - steeringCorrectionHalf * modifier);
        }
        else
        {
            CutebotPro.clearWheelTurn(CutebotProMotors1.M1);
            CutebotPro.pwmCruiseControl(speed + steeringCorrectionHalf, speed - steeringCorrectionHalf);

            let timeSum = 0;
            while (CutebotPro.readDistance(CutebotProMotors1.M1) * modifier < targetDegrees && timeSum < 30000) {
                basic.pause(100);
                timeSum += 100;
            }

            CutebotPro.stopImmediately(CutebotProMotors.ALL);
        }
    }

    //% group="Drive"
    //% block="gyro drive %direction with speed %speed\\% || for %distance %distanceUnits"
    //% expandableArgumentMode="toggle"
    //% inlineInputMode=inline
    //% speed.min=25 speed.max=50 speed.defl=30 distanceUnits.defl=DistanceUnits.Cm
    //% weight=90
    export function driveSpeedDistanceGyro(direction: DriveDirection, speed: number, distance?: number, distanceUnits?: DistanceUnits): void {
        stopDrive = true;
        speed = restictSpeed(speed);

        if (distanceUnits == DistanceUnits.Cm)
            distance = distance;
        else if (distanceUnits == DistanceUnits.Inch)
            distance = distance * 2.54;

        let distCorrection = (100 + distanceCorrection) / 100;
        let targetDegrees = 0;
        let modifier = 1;

        if (distance != null) {
            targetDegrees = (360 / 15.865) * distance * distCorrection;
        }

        if (direction == DriveDirection.Backward) {
            speed = speed * -1;
            modifier = -1;
        }

        // Setup IMU
        if (!MPU6050Initialised) {
            if (MINTsparkMpu6050.InitMPU6050(0)) {
                MPU6050Initialised = true;
            }
            else {
                return;
            }
        }

        MINTsparkMpu6050.Calibrate(1);
        CutebotPro.clearWheelTurn(CutebotProMotors1.M1);

        // PID Control
        let startTime = input.runningTime();
        let Kp = 10;
        let Ki = 0.1;
        let Kd = 0.5;
        let targetHeading = MINTsparkMpu6050.UpdateMPU6050().orientation.yaw;
        let lastError = 0;
        let errorSum = 0;
        let speedL = speed;
        let speedR = speed;
        stopDrive = false;

        while (input.runningTime() - startTime < 30000) {
            if (stopDrive) break;

            if (distance != null && CutebotPro.readDistance(CutebotProMotors1.M1) * modifier > targetDegrees) {
                break;
            }

            let heading = MINTsparkMpu6050.UpdateMPU6050().orientation.yaw;
            let error = targetHeading - heading;
            if (error > 180) { error -= 360 };
            if (error < -180) { error += 360 };

            let errorChange = error - lastError;
            let deleteError = error;
            let correction = Kp * error + Ki * errorSum + Kd * errorChange;

            lastError = error;

            if (error <= 10 && error >= -10) {
                errorSum += error;
            }
            else if (error > 10) {
                errorSum += 10;
            }
            else {
                errorSum -= 10;
            }

            speedL = speed + correction;
            speedR = speed - correction;
            if (speedL < 0) { speedL = 0 };
            if (speedR < 0) { speedR = 0 };
            if (speedL > 50) { speedL = 50 };
            if (speedR > 50) { speedR = 50 };

            /*datalogger.log(
                datalogger.createCV("heading", heading),
                datalogger.createCV("error", error),
                datalogger.createCV("errorSum", errorSum),
                datalogger.createCV("errorChange", errorChange),
                datalogger.createCV("correct", correction),
                datalogger.createCV("sl", speedL),
                datalogger.createCV("sr", speedR),
                datalogger.createCV("sr", speedR)
            )
            */

            // Change motor speed
            if (stopDrive) break;
            CutebotPro.pwmCruiseControl(speedL, speedR);
            basic.pause(10);
        }

        stopDrive = true;
        CutebotPro.stopImmediately(CutebotProMotors.ALL);
    }

    //% group="Drive"
    //% block="drive left motor speed %speedL and right motor speed %speedR || for %seconds seconds"
    //% inlineInputMode=inline
    //% speedL.min=25 speedL.max=50 speedL.defl=30 speedR.min=25 speedR.max=50 speedR.defl=30
    //% weight=81
    export function driveCurve(speedL: number, speedR: number, seconds?: number): void {
        stopDrive = true;
        speedL = restictSpeed(speedL);
        speedR = restictSpeed(speedR);
        CutebotPro.pwmCruiseControl(speedL, speedR);

        if (seconds != null) {
            basic.pause(seconds * 1000);
            stopDrive = true;
            CutebotPro.stopImmediately(CutebotProMotors.ALL);
        }
    }

    //% group="Drive"
    //% block="stop drive"
    //% inlineInputMode=inline
    //% weight=80
    export function stop(): void {
        stopDrive = true;
        CutebotPro.stopImmediately(CutebotProMotors.ALL);
    }

    //% group="Drive"
    //% block="set steering correction to %correction \\%"
    //% weight=20
    export function setSteeringCorrection(correction: number): void{
        steeringCorrection = correction / 100;
    }

    //% group="Turn"
    //% weight=100
    //% block="turn %turn for angle %angle"
    export function turn (turn: TurnDirection, angle: number): void {
        stopDrive = true;
        let buf = pins.createBuffer(7);
        let orientation = 0;
        let cmd = 0;
        let tempangle = Math.map(angle, 0, 180, 0, 650);
        CutebotPro.pwmCruiseControl(0, 0);
        basic.pause(500);
        orientation = CutebotProWheel.AllWheel
        cmd = 23
        tempangle = tempangle + 4
        
        buf[0] = 0x99;
        buf[1] = cmd;
        buf[2] = orientation;
        buf[3] = (tempangle >> 8) & 0xff;
        buf[4] = (tempangle >> 0) & 0xff;
        if (turn == TurnDirection.Right)
            buf[5] = 0x00;
        else
            buf[5] = 0x01;
        buf[6] = 0x88;
        pins.i2cWriteBuffer(i2cAddr, buf)

        basic.pause(500)
        while (1) {
            if (CutebotPro.readSpeed(CutebotProMotors1.M1, CutebotProSpeedUnits.Cms) == 0 && CutebotPro.readSpeed(CutebotProMotors1.M2, CutebotProSpeedUnits.Cms) == 0) {
                basic.pause(1000)
                if (CutebotPro.readSpeed(CutebotProMotors1.M1, CutebotProSpeedUnits.Cms) == 0 && CutebotPro.readSpeed(CutebotProMotors1.M2, CutebotProSpeedUnits.Cms) == 0)
                    break
            }

        }
        basic.pause(500)
    }

    //% group="Turn"
    //% block="gyro turn %turn for angle %angle\\% || with speed %speed"
    //% expandableArgumentMode="toggle"
    //% inlineInputMode=inline
    //% speedL.min=25 speedL.max=50 speedL.defl=25 angle.min=1 angle.max=180 angle.defl=90
    //% weight=90
    export function turnGyro(turn: TurnDirection, angle: number, speed?: number): void {
        stopDrive = true;
        angle = angle * 0.95;

        if (speed == null)
        {
            speed = 25;
        }
        else
        {
            speed = restictSpeed(speed);
        }

        let speedL = speed;
        let speedR = -speed;

        if (turn == TurnDirection.Left) {
            speedL = -speed;
            speedR = speed;
        }

        // Setup IMU
        if (!MPU6050Initialised) {
            if (MINTsparkMpu6050.InitMPU6050(0)) {
                MPU6050Initialised = true;
            }
            else {
                return;
            }
        }

        MINTsparkMpu6050.Calibrate(1);

        // PID Control
        let startTime = input.runningTime();
        let startHeading = MINTsparkMpu6050.UpdateMPU6050().orientation.yaw;
        let change = 0;

        CutebotPro.pwmCruiseControl(speedL, speedR);
        basic.pause(200);

        while (input.runningTime() - startTime < 5000) {
            let heading = MINTsparkMpu6050.UpdateMPU6050().orientation.yaw;
            let reciprocal = heading + 180;
            if (reciprocal >= 360) reciprocal -= 360;

            if (turn == TurnDirection.Right) {
                if (heading < startHeading && heading < reciprocal) {
                    heading += 360;
                }

                change = heading - startHeading;
            }
            else {
                if (heading > startHeading && heading > reciprocal) {
                    heading -= 360;
                }

                change = startHeading - heading;
            }

            if (change > angle) break;

            /*datalogger.log(
                datalogger.createCV("heading", heading),
                datalogger.createCV("change", change)
            )
            */

            basic.pause(10);
        }

        CutebotPro.stopImmediately(CutebotProMotors.ALL);
    }

    //% group="Claw"
    //% block="open Claw"
    //% weight=90
    export function openClaw() {
        CutebotPro.extendServoControl(ServoType.Servo180, CutebotProServoIndex.S1, 15)
    }

    //% group="Claw"
    //% block="close Claw"
    //% weight=100
    export function closeClaw() {
        CutebotPro.extendServoControl(ServoType.Servo180, CutebotProServoIndex.S1, 68)
    }

    //% group="Lights"
    //% block="set LED Headlight %light color to $color"
    //% color.shadow="colorNumberPicker"
    //% weight=100
    export function colorLight(light: RGBHeadlight, color: number) {
        let cbpLight;

        switch (light) {
            case RGBHeadlight.RGBL:
                cbpLight = CutebotProRGBLight.RGBL;
                break;
            case RGBHeadlight.RGBR:
                cbpLight = CutebotProRGBLight.RGBR;
                break;
            default:
                cbpLight = CutebotProRGBLight.RGBA;
                break;
        }

        CutebotPro.colorLight(cbpLight, color);
    }

    //% group="Lights"
    //% block="turn off all LED headlights"
    //% weight=90
    export function turnOffAllHeadlights(): void {
        CutebotPro.turnOffAllHeadlights();
    }

    //% group="Lights"
    //% block="set all floor lights to %rgb=neopixel_colors"
    //% weight=80
    export function setAllFloorPixelColor(rgb: number): void {
        neopixelStrip.showColor(rgb);
    }

    //% group="Lights"
    //% block="set floor light %position to %rgb=neopixel_colors"
    //% weight=70
    export function setFloorPixelColor(position: TurnDirection, rgb: number): void {
        let pixelNumber = 0;
        if (position == TurnDirection.Right) { pixelNumber = 1 }
        neopixelStrip.setPixelColor(pixelNumber,rgb);
        neopixelStrip.show();
    }

    //% group="Lights"
    //% block="switch floor lights off"
    //% weight=60
    export function setAllFloorPixelOff(): void {
        neopixelStrip.clear();
        neopixelStrip.show();
    }

    //% group="Sonar sensor"
    //% block="sonar sensor distance in %SonarUnit"
    //% weight=220
    export function ultrasonic(unit: SonarUnit, maxCmDistance = 500): number {
        return CutebotPro.ultrasonic(unit, maxCmDistance);
    }

    //% group="Linetracking sensor"
    //% weight=260
    //%block="read line tracking state from Sensor"
    export function readLinetrackingSensorState(): void {
        let i2cBuffer = pins.createBuffer(7);
        i2cBuffer[0] = 0x99;
        i2cBuffer[1] = 0x12;
        i2cBuffer[2] = 0x00;
        i2cBuffer[3] = 0x00;
        i2cBuffer[4] = 0x00;
        i2cBuffer[5] = 0x00;
        i2cBuffer[6] = 0x88;
        pins.i2cWriteBuffer(i2cAddr, i2cBuffer)
        currentLineTrackingState = pins.i2cReadNumber(i2cAddr, NumberFormat.UInt8LE, false);
    }

    //% group="Linetracking sensor"
    //% weight=260
    //%block="current line tracking sensor state is %TrackbitStateType"
    export function linetrackingSensorIsState(state: TrackbitStateType): boolean {
        return currentLineTrackingState == state
    }
}
