<script lang="ts">
    import UploadIcon from '$lib/icons/upload.svelte';

    import { CatchResults2g, CatchResults4g } from '$lib/classes/results';
    import { FileButton } from '@skeletonlabs/skeleton';
    import ExcelJS from 'exceljs';
    import { createEventDispatcher } from 'svelte';

    export let currentData: (CatchResults2g|CatchResults4g)[] = [];

    const dispatch = createEventDispatcher();

    const missionExportUpload = async (e: Event) => {
        const files = (e.target as HTMLInputElement).files;

        if (files && files[0]) {
            const file = files[0];
            const reader = new FileReader();

            reader.onload = async (event) => {
                const buffer = event.target?.result as ArrayBuffer;
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buffer);
                const worksheet = workbook.getWorksheet('Found devices (All hits)');

                const extractedData:(CatchResults2g|CatchResults4g)[] = [];

                if (!worksheet) return;

                let headers: string[] = [];
                

                worksheet.eachRow((row, rowNumber) => {
                    // Use the first row to find the column index of the required fields
                    if (rowNumber === 1){
                        headers = (row.values as ExcelJS.CellValue[]).map((value) => value? value.toString(): '');
                        return;
                    }

                    const catchDate = row.getCell(headers.indexOf('Catch Date')).value?.toString();
                    const imsi = row.getCell(headers.indexOf('IMSI')).value?.toString();
                    const latitude = row.getCell(headers.indexOf('Latitude')).value?.toString();
                    const longitude = row.getCell(headers.indexOf('Longitude')).value?.toString();
                    const timingAdvance = row.getCell(headers.indexOf('Timing Advance')).value?.toString();
                    const rat = row.getCell(headers.indexOf('RAT')).value?.toString();
                    const cellSignalStrength = row.getCell(headers.indexOf('RSSI')).value?.toString();
                    

                    // Continue if any of the fields are undefined
                    if (!catchDate || !imsi || !latitude || !longitude || !timingAdvance || !rat || !cellSignalStrength) return;


                    if (rat === '2G') {
                        const catchResult: CatchResults2g = new CatchResults2g("Gsm 450");
                        catchResult.fromCatch({
                            imsi,
                            timingAdvance,
                            gpsData: {
                                latitude: parseFloat(latitude),
                                longitude: parseFloat(longitude),
                                altitude: 0,
                                '3DFix': true,
                            },
                            requestType: 'IMSICatch2G',
                            tmsi: '',
                            signalNoiseRatio: '',
                            responseType: 'IMSICatchCell',
                            imei: '',
                            cellSignalStrength,
                            radio: 0
                        }, "Gsm 450");
                        extractedData.push(catchResult);
                    } else {
                        const catchResult: CatchResults4g = new CatchResults4g("Lte 1");
                        catchResult.fromCatch({
                            imsi,
                            timingAdvance,
                            gpsData: {
                                latitude: parseFloat(latitude),
                                longitude: parseFloat(longitude),
                                altitude: 0,
                                '3DFix': true,
                            },
                            requestType: 'IMSICatch4G',
                            responseType: 'IMSICatchCell',
                            imei: '',
                            radio: 0,
                            guti: {
                                mcc: '',
                                mnc: '',
                                mmegrpID: '',
                                mmeCode: '',
                                mtmsi: ''
                            },
                            listType: '',
                            lastTac: 0,
                            encodedCM2: '',
                            encodedCM3: '',
                            hasBeenRedirected: false,
                            lastLac: 0,
                            rssidB: '',
                            rsrpdB: '',
                            rsrqdB: ''
                        }, "Lte 1");
                        extractedData.push(catchResult);
                    }
                });

                currentData = extractedData;
                dispatch('newUpload');
            }

            reader.readAsArrayBuffer(file);
        }
    }
</script>

<FileButton name="missionExports" on:change={missionExportUpload} button="py-1 px-4 h-10 w-20 m-2 rounded-md shadow-md hover:scale-105 transition-all bg-blue-200">
    <UploadIcon svgClasses={["h-full mx-auto py-1"]} />
</FileButton>
