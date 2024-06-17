import { Network } from '$lib/mission/enums';
import { CellSettings2g, CellSettings4g } from './setup';

interface ISurveyResults {
	surveyId: string;

	fromSurvey(survey: ISurveyResponseAny): SurveyResults;
	fromJSON(data: SurveyResults): SurveyResults;
	fromCSV(data: Record<string, string | number>): SurveyResults;

	keys(): string[];
	entries(): Record<string, string | number>;
}

export class SurveyResults2g extends CellSettings2g implements ISurveyResults {
	c1: number;
	c2: number;
	rxlevAccMin: number;
	msTxpwrMaxCcch: number;
	cro: number;
	tempOffset: number;
	penaltyTime: number;
	t3212: number;
	rssi: number;
	snr: number;
	frequency: number;
	tac: string;
	arfcnNeighbours: number[];
	surveyId: string;

	constructor(uuid?: string, surveyId?: string) {
		super(uuid);
		if (surveyId) this.surveyId = surveyId;
        else this.surveyId = 'Unknown';
		this.c1 = 0;
		this.c2 = 0;
		this.rxlevAccMin = 0;
		this.msTxpwrMaxCcch = 0;
		this.cro = 0;
		this.tempOffset = 0;
		this.penaltyTime = 0;
		this.t3212 = 0;
		this.rssi = 0;
		this.snr = 0;
		this.frequency = 0;
		this.tac = '';
		this.arfcnNeighbours = [];
	}

	fromSurvey(survey: ISurveyCellResponse2G) {
		super.fromSurvey(survey);
		this.c1 = survey.c1;
		this.c2 = survey.c2;
		this.rxlevAccMin = survey.rxlevAccMin;
		this.msTxpwrMaxCcch = survey.msTxpwrMaxCcch;
		this.cro = survey.cro;
		this.tempOffset = survey.tempOffset;
		this.penaltyTime = survey.penaltyTime;
		this.t3212 = survey.t3212;
		this.rssi = survey.rssi;
		this.snr = survey.snr;
		this.frequency = survey.arfcn;
		if (survey.arfcnNeighbours) this.arfcnNeighbours = survey.arfcnNeighbours;
		else this.arfcnNeighbours = [];

		return this;
	}

	fromJSON(data: SurveyResults2g) {
		super.fromJSON(data);
		this.c1 = data.c1;
		this.c2 = data.c2;
		this.rxlevAccMin = data.rxlevAccMin;
		this.msTxpwrMaxCcch = data.msTxpwrMaxCcch;
		this.cro = data.cro;
		this.tempOffset = data.tempOffset;
		this.penaltyTime = data.penaltyTime;
		this.t3212 = data.t3212;
		this.rssi = data.rssi;
		this.snr = data.snr;
		this.frequency = data.frequency;
		this.tac = data.tac;
		if (data.arfcnNeighbours) this.arfcnNeighbours = data.arfcnNeighbours;
		else this.arfcnNeighbours = [];

		return this;
	}

	fromCSV(data: Record<string, string>) {
		super.fromCSV(data);
		this.c1 = Number(data.c1);
		this.c2 = Number(data.c2);
		this.rxlevAccMin = Number(data.rxlevAccMin);
		this.msTxpwrMaxCcch = Number(data.msTxpwrMaxCcch);
		this.cro = Number(data.cro);
		this.tempOffset = Number(data.tempOffset);
		this.penaltyTime = Number(data.penaltyTime);
		this.t3212 = Number(data.t3212);
		this.rssi = Number(data.rssi);
		this.snr = Number(data.snr);
		this.frequency = Number(data.frequency);
		this.tac = data.tac;
		this.arfcnNeighbours = data.arfcnNeighbours.split('|').map(Number);

		return this;
	}

	keys(): string[] {
		return [
			...super.keys(),
			'c1',
			'c2',
			'rxlevAccMin',
			'msTxpwrMaxCcch',
			'cro',
			'tempOffset',
			'penaltyTime',
			't3212',
			'rssi',
			'snr',
			'frequency',
			'tac',
			'arfcnNeighbours',
			'surveyId'
		];
	}

	entries(): Record<string, string | number> {
		const neighbours_string = this.arfcnNeighbours.join(', ');
		return {
			...super.entries(),
			c1: this.c1,
			c2: this.c2,
			rxlevAccMin: this.rxlevAccMin,
			msTxpwrMaxCcch: this.msTxpwrMaxCcch,
			cro: this.cro,
			'Temperature Offset': this.tempOffset,
			penaltyTime: this.penaltyTime,
			t3212: this.t3212,
			RSSI: this.rssi.toFixed(2),
			snr: this.snr,
			frequency: this.frequency,
			// tac: this.tac,
			arfcnNeighbours: neighbours_string,
			'Survey ID': this.surveyId
		};
	}
}


export class SurveyResults4g extends CellSettings4g implements ISurveyResults {
	rssi: number;
	rsrp: number;
	rsrq: number;

	surveyId: string;

	constructor(uuid?: string, surveyId?: string) {
		super(uuid);
		if (surveyId) this.surveyId = surveyId;
        else this.surveyId = 'Unknown';
		this.rssi = 0;
		this.rsrp = 0;
		this.rsrq = 0;
	}

	fromSurvey(survey: ISurveyCellResponse4G) {
		super.fromSurvey(survey);
		this.rssi = survey.rssi;
		this.rsrp = survey.rsrp;
		this.rsrq = survey.rsrq;

		return this;
	}

	fromJSON(data: SurveyResults4g) {
		super.fromJSON(data);
		this.rssi = data.rssi;
		this.rsrp = data.rsrp;
		this.rsrq = data.rsrq;

		return this;
	}

	fromCSV(data: Record<string, string>) {
		super.fromCSV(data);
		this.rssi = Number(data.rssi);
		this.rsrp = Number(data.rsrp);
		this.rsrq = Number(data.rsrq);
		this.surveyId = data.surveyId;

		return this;
	}

	keys(): string[] {
		return [...super.keys(), 'rssi', 'rsrp', 'rsrq', 'surveyId'];
	}

	entries(): Record<string, string | number> {
		return {
			...super.entries(),
			RSSI: this.rssi.toFixed(2),
			RSRP: this.rsrp.toFixed(2),
			RSRQ: this.rsrq.toFixed(2),
			'Survey ID': this.surveyId
		};
	}
}

export type SurveyResults = SurveyResults2g | SurveyResults4g;

class BaseCatchResults {
	raw: ICatchResponseAny;
	time: Date;
	network: Network;
	band: Bands2G | Bands4G;
	uuid: string;
	catchId: string;

	lat?: number;
	lon?: number;
	timingAdvance?: number;
	rssi?: number;

	constructor(network: Network, band: Bands, catchId?: string) {
        this.raw = {} as ICatchResponseAny;
		this.time = new Date();
		this.uuid = Math.random().toString(36).substring(2);
		if (catchId !== undefined) this.catchId = catchId;
		else this.catchId = 'Unknown';
        this.network = network;
        this.band = band;
	}

	private getRSSIfromRaw() {
		if (this.raw.requestType === 'IMSICatch2G') this.rssi = parseFloat(this.raw.cellSignalStrength);
		else if (this.raw.requestType === 'IMSICatch4G') this.rssi = parseFloat(this.raw.rssidB);

		return this.rssi;
	}

	fromCatch(data: ICatchResponseAny, band: Bands2G | Bands4G) {
		this.raw = data;
		if (data.gpsData['3DFix']) {
			this.lat = data.gpsData.latitude;
			this.lon = data.gpsData.longitude;
		}
		this.band = band;
		this.timingAdvance = parseInt(data.timingAdvance);
		
		this.rssi = this.getRSSIfromRaw();
		
		return this;
	}

	fromJSON(data: CatchResults) {
		this.raw = data.raw;
		this.lat = data.lat;
		this.lon = data.lon;
		this.rssi = data.rssi ?? this.getRSSIfromRaw();
		this.timingAdvance = data.timingAdvance ?? parseInt(data.raw.timingAdvance);
		this.time = data.time;
		this.network = data.network;
		this.uuid = data.uuid;
		this.catchId = data.catchId || 'Unknown';
		this.band = data.band;
		return this;
	}

	setGPS(lat: number, lon: number) {
		this.lat = lat;
		this.lon = lon;
	}

	entries(): Record<string, string | number | undefined> {
		const networkMap: Record<Network, string> = {
			[Network.Net2G]: '2G',
			[Network.Net4G]: '4G',
			[Network.Net3G]: '3G'
		};
		return {
			'Catch ID': this.catchId,
			Time: this.time.toLocaleString(),
			UUID: this.uuid,
			Band: this.band,
			Network: networkMap[this.network],
			Lat: this.lat,
			Lon: this.lon,
			IMSI: this.raw.imsi,
			IMEI: this.raw.imei,
			'Timing Advance': this.timingAdvance,
			RSSI: this.getRSSIfromRaw()?.toFixed(2)
		};
	}
}

export class CatchResults2g extends BaseCatchResults {
	raw = {} as ICatchResponse2G;
	network = Network.Net2G as const;
	band = 'Gsm 450' as Bands2G;

	constructor(band: Bands2G, catchId?: string) {
		super(Network.Net2G, band, catchId);
		this.network = Network.Net2G;
	}

	get tac() {
		return this.raw.imei.slice(0, 8);
	}

	fromCatch(data: ICatchResponse2G, band: Bands2G) {
		super.fromCatch(data, band);

		return this;
	}

	fromJSON(data: CatchResults2g) {
		super.fromJSON(data);
		return this;
	}

	entries(): Record<string, string | number | undefined> {
		return {
			...super.entries()
		};
	}
}

export class CatchResults4g extends BaseCatchResults {
	raw = {} as ICatchResponse4G;
	network = Network.Net4G as const;
	band = 'Lte 1' as Bands4G;

	constructor(band: Bands4G, catchId?: string) {
		super(Network.Net4G, band, catchId);
		this.network = Network.Net4G;
	}

	fromCatch(data: ICatchResponse4G, band: Bands4G) {
		super.fromCatch(data, band);
		return this;
	}

	fromJSON(data: CatchResults4g) {
		super.fromJSON(data);
		return this;
	}

	entries(): Record<string, string | number | undefined> {
		return {
			...super.entries()
		};
	}
}

export type CatchResults = CatchResults2g | CatchResults4g;
