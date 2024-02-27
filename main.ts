
namespace EasyCbp
{
    let i2cAddr: number = 0x10;

    enum CutebotProOrientation {
        //%block="forward"
        Advance = 1,
        //%block="reverse"
        Retreat = 0
    }

    enum CutebotProDistanceUnits {
        //%block="cm"
        Cm = 0,
        //%block="inch"
        Ft = 1,
    }

//% group="PID Control"
//% weight=200
//% block="go %CutebotProOrientation %distance %CutebotProDistanceUnits"
    export function myDistanceRunning(orientation: CutebotProOrientation, distance: number, distanceUnits: CutebotProDistanceUnits): void {
    let buf = pins.createBuffer(7)
    let curtime = 0
    let oldtime = 0
    let tempdistance = 0
    let temp = 0
    CutebotPro.pwmCruiseControl(0, 0)
    if (distanceUnits == CutebotProDistanceUnits.Cm)
        tempdistance = distance;
    else if (distanceUnits == CutebotProDistanceUnits.Ft)
        tempdistance = distance * 0.3937;

    if (tempdistance > 3) {
        temp = Math.floor(tempdistance / 50) + 1
        tempdistance = tempdistance - temp
    }

    buf[0] = 0x99;
    buf[1] = 0x03;
    buf[2] = orientation;
    buf[3] = tempdistance;
    buf[4] = 0x00;
    buf[5] = 0x00;
    buf[6] = 0x88;
    pins.i2cWriteBuffer(i2cAddr, buf)
    basic.pause(tempdistance * 1000 / 20)
    basic.pause(800)
    }
}