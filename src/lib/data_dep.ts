import catchData from '$lib/assets/found_devices.json';
import { CatchResults2g } from './classes/results';
import * as turf from '@turf/turf';

// This is the type of data we would recieve after a catch request
const iCatchData2G: ICatchResponse2G[] = catchData.map((data: any, index) => {

    // 0.1 + ((Math.random() * 4) * turf.lengthToDegrees(3, 'kilometers'))

    return {
        requestType: 'catch',
        imsi: data['IMSI'],
        imei: data['IMEI'],
        cellSignalStrength: data['RSSI'],
        radio: 1,
        timingAdvance: data['Timing Advance'],
        gpsData: {
            success: data['Latitude'] && data['Longitude'],
            latitude: data['Latitude'],
            longitude: data['Longitude'],
        },
        signalNoiseRatio: "demo",
        tmsi: "demo"
    }
});

export const catchData2G: CatchResults2g[] = iCatchData2G.map((data: ICatchResponse2G) => {
    const result = new CatchResults2g();
    result.fromCatch(data, "Gsm 450");
    return result;
});