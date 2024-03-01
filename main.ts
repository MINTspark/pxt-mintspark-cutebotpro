//% weight=100 color=#008C8C block="Easy Cutebot Pro" blockId="Cutebot Pro" icon="\uf48b"
namespace EasyCbp
{
    let i2cAddr: number = 0x10;
    let forwardSteeringCorrection = 0;
    let backwardSteeringCorrection = 0;
    let distanceCorrection = 0;
    let neopixelStrip = neopixel.create(DigitalPin.P15, 2, NeoPixelMode.RGB);

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

    //% group="Drive"
    //% block="drive %direction with speed %speed"
    //% inlineInputMode=inline
    //% speed.min=20 speed.max=50 speed.defl=25
    //% weight=90
    export function driveSpeed(direction: DriveDirection, speed: number): void {
        let steeringCorrection = forwardSteeringCorrection;

        if (direction == DriveDirection.Backward) {
            steeringCorrection = backwardSteeringCorrection;
            speed = speed * -1;
        }

        CutebotPro.pwmCruiseControl(speed + steeringCorrection, speed);
    }

    //% group="Drive"
    //% block="drive %direction for %distance %distanceUnits speed %speed"
    //% inlineInputMode=inline
    //% speed.min=20 speed.max=50 speed.defl=25 distanceUnits.defl=DistanceUnits.Cm
    //% weight=80
    export function driveDistance(direction: DriveDirection, distance: number, distanceUnits: DistanceUnits, speed: number): void {
        if (distanceUnits == DistanceUnits.Cm)
            distance = distance;
        else if (distanceUnits == DistanceUnits.Inch)
            distance = distance * 2.54;

        let steeringCorrection = forwardSteeringCorrection;
        let distCorrection = (100 + distanceCorrection) / 100;
        let targetDegrees = (360 / 15.865) * distance * distCorrection;
        let modifier = 1;

        if (direction == DriveDirection.Backward)
        {
            steeringCorrection = backwardSteeringCorrection;
            speed = speed * -1;
            modifier = -1;
        }
       
        CutebotPro.clearWheelTurn(CutebotProMotors1.M1);
        CutebotPro.pwmCruiseControl(speed + steeringCorrection, speed);

        let timeSum = 0;
        while(CutebotPro.readDistance(CutebotProMotors1.M1) * modifier < targetDegrees && timeSum < 30000)
        {
            basic.pause(100);
            timeSum += 100;
        }

        CutebotPro.stopImmediately(CutebotProMotors.ALL);
    }

    //% group="Drive"
    //% block="stop drive"
    //% inlineInputMode=inline
    //% weight=85
    export function stop(): void {
        CutebotPro.stopImmediately(CutebotProMotors.ALL);
    }

    //% group="Drive"
    //% block="set steering correction %direction to %correction \\%"
    //% weight=20
    export function setSteeringCorrection(direction: DriveDirection, correction: number): void{
        if(direction == DriveDirection.Forward)
        {
            forwardSteeringCorrection = correction;
        }
        else{
            backwardSteeringCorrection = -correction;
        }
    }

    //% group="Drive"
    //% block="drive %direction with speed %speed and turn %turnDirection with %amount turn"
    //% inlineInputMode=inline
    //% speed.min=20 speed.max=50 speed.defl=20
    //% weight=87
    export function driveCurve(direction: DriveDirection, speed: number, turnDirection: TurnDirection, amount: EasyAmount): void {
        let turnAddition = 0;
        let multiplier = 1;

        switch(amount){
            case EasyAmount.Small:
                turnAddition = 1;
                break;
            case EasyAmount.Medium:
                turnAddition = 2;
                break;
            case EasyAmount.Big:
                turnAddition = 5;
                break;
        }
  
        if (direction == DriveDirection.Backward) {
            speed = speed * -1;
        }

        if ((turnDirection == TurnDirection.Left && direction == DriveDirection.Forward) || (turnDirection == TurnDirection.Right && direction == DriveDirection.Backward)) {
            turnAddition = -turnAddition;
        }

        CutebotPro.cruiseControl(speed + turnAddition, speed - turnAddition, CutebotProSpeedUnits.Cms);
    }

    //% group="Turn"
    //% weight=190
    //% block="turn %turn for angle %angle"
    export function trolleySteering(turn: TurnDirection, angle: number): void {
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

    //% group="Claw"
    //% block="open Claw"
    //% weight=90
    export function openClaw() {
        CutebotPro.extendServoControl(ServoType.Servo360, CutebotProServoIndex.S1, 50)
    }

    //% group="Claw"
    //% block="close Claw"
    //% weight=100
    export function closeClaw() {
        CutebotPro.extendServoControl(ServoType.Servo360, CutebotProServoIndex.S1, 160)
    }

    //% group="Lights"
    //% block="set LED Headlight %light color to $color"
    //% color.shadow="colorNumberPicker"
    //% weight=100
    export function colorLight(light: CutebotProRGBLight, color: number) {
        CutebotPro.colorLight(light, color);
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
    //% blockId=ultrasonic block="sonar sensor unit %SonarUnit"
    //% weight=220
    export function ultrasonic(unit: SonarUnit, maxCmDistance = 500): number {
        return CutebotPro.ultrasonic(unit, maxCmDistance);
    }
}
