//% weight=100 color=#008C8C block="Easy Cutebot Pro" blockId="Easy Cutebot Pro" icon="\uf48b"
namespace EasyCbp
{
    let forwardSteeringCorrection = 0;
    let backwardSteeringCorrection = 0;
    let distanceCorrection = 0;

    enum DriveDirection {
        //%block="forward"
        Forward = 1,
        //%block="reverse"
        Backward = 0
    }

    enum DistanceUnits {
        //%block="cm"
        Cm = 0,
        //%block="inch"
        Inch = 1,
    }

    //% group="Drive Controls"
    //% weight=20
    //% block="drive %direction %distance %distanceUnits at speed %speed"
     //% speed.min=-100 speed.max=100
    export function driveDistance(direction: DriveDirection, distance: number, distanceUnits: DistanceUnits, speed: number): void {
        if (distanceUnits == DistanceUnits.Cm)
            distance = distance;
        else if (distanceUnits == DistanceUnits.Inch)
            distance = distance * 2.54;

        let steeringCorrection = forwardSteeringCorrection;
        let distCorrection = (100 + distanceCorrection) / 100;
        let targetDegrees = (360 / 158.65) * distance * distCorrection;

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
}