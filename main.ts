//% weight=100 color=#008C8C block="Easy Cutebot Pro" blockId="Easy Cutebot Pro" icon="\uf48b"
namespace EasyCbp
{
    let forwardSteeringCorrection = 0;
    let backwardSteeringCorrection = 0;
    let distanceCorrection = 0;

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

    //% group="Drive"
    //% block="drive %direction for %distance %distanceUnits speed %speed"
    //% speed.min=0 speed.max=100
    //% weight=200
    export function driveDistance(direction: DriveDirection, distance: number, distanceUnits: DistanceUnits, speed: number): void {
        if (distanceUnits == DistanceUnits.Cm)
            distance = distance;
        else if (distanceUnits == DistanceUnits.Inch)
            distance = distance * 2.54;

        let steeringCorrection = forwardSteeringCorrection;
        let distCorrection = (100 + distanceCorrection) / 100;
        let targetDegrees = (360 / 15.865) * distance * distCorrection;

        if (direction == DriveDirection.Backward)
        {
            steeringCorrection = backwardSteeringCorrection;
            speed = speed * -1;
        }
       
        CutebotPro.clearWheelTurn(CutebotProMotors1.M1);
        CutebotPro.pwmCruiseControl(speed + steeringCorrection, speed);

        while(CutebotPro.readDistance(CutebotProMotors1.M1) < targetDegrees)
        {
            basic.pause(100);
        }

        CutebotPro.stopImmediately(CutebotProMotors.ALL);
    }

    //% group="Drive"
    //% block="set steering correction %direction to %correction \\%"
    //% weight=180
    export function setSteeringCorrection(direction: DriveDirection, correction: number): void{
        if(direction = DriveDirection.Forward)
        {
            forwardSteeringCorrection = correction;
        }
        else{
            backwardSteeringCorrection = correction;
        }
    }
}