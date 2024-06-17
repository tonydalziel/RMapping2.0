import { writable, type Writable } from 'svelte/store';
import { ops } from '$lib/assets/operators';
import { Network } from '$lib/mission/enums';
import { lookup } from '$lib/assets/mcc';
import { downlink, type Bands, type Bands2G } from '$lib/assets/bands';
import { attenuation } from '$lib/assets/attenuation';

class BaseCatchSettings {
	network: Network;
	radio?: number;
	running?: Writable<boolean>;
	time: Date;
	uuid: string;
	band: Bands;
	rejectionReason: number;
	powerPercentage: number;
	txdownlink: number;
	rxgain: number; // Needs some trial and error (Not provided to the user)

	changedTxAndSetPA: boolean;

	constructor(network: Network, uuid?: string) {
		this.uuid = uuid || Math.random().toString(36).substring(2);
		this.running = writable(false);
		this.time = new Date();
		this.radio = undefined;
		this.band = 'Gsm 850';

		this.rejectionReason = 0;
		this.powerPercentage = 0;
		this.txdownlink = 0;
		this.rxgain = 35;

		this.changedTxAndSetPA = false;
        this.network = network;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	fromSurvey(data: ISurveyResponseAny) {
		this.band = data.band as Bands;
		this.rxgain = 35;
		this.txdownlink = 161;
		this.rejectionReason = 0;
		this.powerPercentage = 0;
		this.radio = data.radio - 1;
		return this;
	}

	fromJSON(data: BaseCatchSettings) {
		this.uuid = data.uuid;
		this.band = data.band;
		this.time = new Date(data.time);
		this.txdownlink = data.txdownlink;
		this.rejectionReason = data.rejectionReason;
		this.powerPercentage = data.powerPercentage;
		this.rxgain = data.rxgain;
		return this;
	}

	fromCSV(data: Record<string, string>) {
		this.uuid = data.uuid;
		this.band = data.band as Bands;
		this.time = new Date(data.time);
		this.txdownlink = Number(data.txdownlink);
		this.rejectionReason = Number(data.rejectionReason);
		this.powerPercentage = Number(data.powerPercentage);
		this.rxgain = Number(data.rxgain);

		return this;
	}

	keys(): string[] {
		return ['uuid', 'band', 'time', 'rxgain', 'txdownlink', 'rejectionReason', 'powerPercentage'];
	}

	entries(): Record<string, string | number> {
		const networkStringMap = {
			Net2G: '2G',
			Net3G: '3G',
			Net4G: '4G'
		};

		return {
			UUID: this.uuid,
			Time: new Date(this.time).toISOString(),
			Network: networkStringMap[this.network],
			Band: this.band,
			'RX Gain': this.rxgain,
			'TX Downlink': this.txdownlink,
			'Rejection Reason': this.rejectionReason,
			'Power Percentage': this.powerPercentage
		};
	}
}

export class CellSettings2g extends BaseCatchSettings {
	network = Network.Net2G as const;
	cellId: number;
	mnc: number;
	mcc: number;
	lac: number;
	band = '' as Bands2G;
	arfcn: number;
	ncc: number;
	bcc: number;

	constructor(uuid?: string) {
		super(Network.Net2G, uuid);
		this.network = Network.Net2G;
		this.cellId = 0;
		this.mnc = 0;
		this.mcc = 0;
		this.lac = 0;
		this.band = 'Gsm 850';
		this.arfcn = 0;
		this.ncc = 0;
		this.bcc = 0;
	}

	get downlink() {
		return downlink(this.band, this.arfcn);
	}

	get operator() {
		return this.plmn in ops ? ops[this.plmn] : '';
	}

	get plmn() {
		return `${('000' + this.mcc).slice(-3)}${('00' + this.mnc).slice(-2)}`;
	}

	set plmn(plmn: string) {
		if (plmn.length !== 5 && plmn.length !== 6) throw new Error('PLMN must be 5 or 6 digits long');
		this.mcc = parseInt(plmn.slice(0, 3));
		this.mnc = parseInt(plmn.slice(3));
	}

	get powerDict() {
		const all = attenuation.Net2G;

        if (this.downlink === null) return all[0];

		for (let i = all.length - 1; i >= 0; i--) {
			if (all[i].lowerBound < this.downlink) return all[i];
		}

		return all[0];
	}

	fromSurvey(survey: ISurveyCellResponse2G) {
		super.fromSurvey(survey);
		this.arfcn = survey.arfcn;
		this.lac = survey.lac;
		this.cellId = survey.cellId;
		this.ncc = survey.ncc;
		this.bcc = survey.bcc;
		this.mcc = parseInt(survey.mcc);
		this.mnc = parseInt(survey.mnc);
		return this;
	}

	fromJSON(data: CellSettings2g) {
		super.fromJSON(data);
		this.cellId = data.cellId;
		this.mnc = data.mnc;
		this.mcc = data.mcc;
		this.lac = data.lac;
		this.arfcn = data.arfcn;
		this.ncc = data.ncc;
		this.bcc = data.bcc;
		return this;
	}

	fromCSV(data: Record<string, string>): this {
		super.fromCSV(data);
		this.cellId = Number(data.cellId);
		this.mnc = Number(data.mnc);
		this.mcc = Number(data.mcc);
		this.lac = Number(data.lac);
		this.arfcn = Number(data.arfcn);
		this.ncc = Number(data.ncc);
		this.bcc = Number(data.bcc);
		return this;
	}

	fromRecommendation(data: {
		mcc: number;
		mnc: number;
		arfcn: number;
		band: Bands2G;
		cellId: number;
		lac: number;
	}) {
		this.mcc = data.mcc;
		this.mnc = data.mnc;
		this.bcc = Math.floor(Math.random() * 7);
		this.ncc = Math.floor(Math.random() * 7);
		this.arfcn = data.arfcn;
		this.band = data.band;
		this.cellId = data.cellId;
		this.lac = data.lac;
		return this;
	}

	keys(): string[] {
		return [...super.keys(), 'cellId', 'arfcn', 'ncc', 'bcc', 'lac', 'mcc', 'mnc', 'plmn'];
	}

	dataEntryKeys(): [string, [string, number, number]][] {
		return [
			[
				'lac',
				[
					'It is reccomended to randomise the LAC for each catch. Alternatively, select a survey result and keep the provided value to mirror the cell tower.',
					0,
					65535
				]
			],
			[
				'cellId',
				[
					'It is reccomended to randomise the CellID for each catch. Alternatively, select a survey result and keep the provided value to mirror the cell tower.',
					0,
					65535
				]
			],
			['ncc', ['', 0, 7]],
			['bcc', ['', 0, 7]]
		];
	}

	entries(): Record<string, string | number> {
		const country = lookup(this.mcc);
		return {
			...super.entries(),
			Operator: this.operator ?? 'Unknown',
			CountryIso: country?.iso,
			Country: country?.name,
			'Cell ID': this.cellId,
			Lac: this.lac,
			ARFCN: this.arfcn,
			NCC: this.ncc,
			BCC: this.bcc,
			MCC: this.mcc,
			MNC: this.mnc,
			PLMN: this.plmn
		};
	}

	toRequest(): ICatchRequest2G {
		return {
			requestType: 'IMSICatch2G',
			radio: (this.radio ?? -1) + 1,
			band: this.band,
			txDownlink: this.txdownlink,
			rxGain: this.rxgain,
			rejectReason: this.rejectionReason.toString(),
			// powerPercentage: this.powerPercentage,
			arfcn: this.arfcn,
			ncc: this.ncc,
			bcc: this.bcc,
			// plmn: this.plmn,
			lac: this.lac,
			cellId: this.cellId,
			mcc: this.mcc.toString(),
			mnc: this.mnc.toString()
		};
	}
}

export class CellSettings4g extends BaseCatchSettings {
	network = Network.Net4G as const;
	band = '' as Bands4G;
	earfcn: number;
	plmn: string;
	l3cellId: number;
	phyCellId: number;
	tac: number;
	cellReselectionPriority: number;
	minTaValue: number;
	relativeD: number;
	lteBandwidth: '1.4mHz' | '3mHz' | '5mHz' | '10mHz' | '15mHz' | '20mHz';

	constructor(uuid?: string) {
		super(Network.Net4G, uuid);
		this.network = Network.Net4G;
		this.band = 'Lte 1';
		this.earfcn = 0;
		this.plmn = '';
		this.l3cellId = 0;
		this.phyCellId = 0;
		this.tac = 0;
		this.cellReselectionPriority = 0;
		this.minTaValue = 0;
		this.relativeD = 0;
		this.lteBandwidth = '20mHz';
	}

	get downlink() {
		return downlink(this.band, this.arfcn);
	}

	get arfcn() {
		return this.earfcn;
	}

	get cellId() {
		return this.l3cellId;
	}

	get mcc() {
		return this.plmn ? parseInt(String(this.plmn).slice(0, 3)) : 0;
	}

	get mnc() {
		return this.plmn ? parseInt(String(this.plmn).slice(3)) : 0;
	}

	get operator() {
		return this.plmn in ops ? ops[this.plmn] : '';
	}

	get flooredLteBandwidth() {
		if (this.lteBandwidth === '1.4mHz') return '10mHz';
		if (this.lteBandwidth === '3mHz') return '10mHz';
		if (this.lteBandwidth === '5mHz') return '10mHz';
		return this.lteBandwidth;
	}

	get powerDict() {
		const all = attenuation.Net4G[this.flooredLteBandwidth];

        if (this.downlink === null) return all[0];

		for (let i = all.length - 1; i >= 0; i--) {
			if (all[i].lowerBound < this.downlink) return all[i];
		}

		return all[0];
	}

	fromSurvey(data: ISurveyCellResponse4G) {
		const dlbwMap: Record<typeof data.dlBw, typeof this.lteBandwidth> = {
			N6: '1.4mHz',
			N15: '3mHz',
			N25: '5mHz',
			N50: '10mHz',
			N75: '15mHz',
			N100: '20mHz'
		};

		super.fromSurvey(data);
		this.earfcn = data.earfcn;
		this.plmn = data.sib1.plmn[0];
		this.l3cellId = data.sib1.l3cellId;
		this.phyCellId = data.phyCellId;
		this.tac = data.sib1.tac;
		this.cellReselectionPriority = data.sib3.cellReselectionPriority;
		// this.minTaValue
		this.relativeD = data.relativeD;
		this.lteBandwidth = dlbwMap[data.dlBw];
		return this;
	}

	fromJSON(data: CellSettings4g) {
		super.fromJSON(data);
		this.earfcn = data.earfcn;
		this.plmn = data.plmn;
		this.l3cellId = data.l3cellId;
		this.phyCellId = data.phyCellId;
		this.tac = data.tac;
		this.cellReselectionPriority = data.cellReselectionPriority;
		this.minTaValue = data.minTaValue;
		this.relativeD = data.relativeD;
		this.lteBandwidth = data.lteBandwidth;
		return this;
	}

	fromCSV(data: Record<string, string>): this {
		super.fromCSV(data);
		this.earfcn = Number(data.earfcn);
		this.plmn = data.plmn;
		this.l3cellId = Number(data.l3cellId);
		this.phyCellId = Number(data.phyCellId);
		this.tac = Number(data.tac);
		this.cellReselectionPriority = Number(data.cellReselectionPriority);
		this.minTaValue = Number(data.minTaValue);
		this.relativeD = Number(data.relativeD);
		this.lteBandwidth = data.lteBandwidth as
			| '1.4mHz'
			| '3mHz'
			| '5mHz'
			| '10mHz'
			| '15mHz'
			| '20mHz';

		return this;
	}

	fromRecommendation(data: {
		band: Bands4G;
		earfcn: number;
		plmn: string;
		phyCellId: number;
		l3cellId: number;
		tac: number;
		relativeD: number;
	}) {
		this.plmn = data.plmn;
		this.earfcn = data.earfcn;
		this.band = data.band;
		this.phyCellId = data.phyCellId;
		this.l3cellId = data.l3cellId;
		this.tac = data.tac;
		this.relativeD = data.relativeD;
		// TODO: Randomise these values
		this.minTaValue = 0;
		this.cellReselectionPriority = 0;
		this.lteBandwidth = '20mHz';
		return this;
	}

	keys(): string[] {
		return [
			...super.keys(),
			'plmn',
			'l3cellId',
			'phyCellId',
			'tac',
			'earfcn',
			'cellReselectionPriority',
			'minTaValue',
			'relativeD'
		];
	}

	dataEntryKeys(): [string, [string, number, number]][] {
		return [
			['phyCellId', ['Physical Cell ID', 0, 999]],
			['l3cellId', ['L3 Cell ID', 0, 999999]]
		];
	}

	entries(): Record<string, string | number> {
		const country = lookup(this.mcc);
		return {
			...super.entries(),
			Operator: this.operator ?? 'Unknown',
			CountryIso: country?.iso,
			Country: country?.name,
			'Cell ID': this.l3cellId,
			EARFCN: this.arfcn,
			PhyCellId: this.phyCellId,
			PLMN: this.plmn,
			Tac: this.tac,
			'Cell Reselection Priority': this.cellReselectionPriority,
			'Min TA Value': this.minTaValue,
			'Relative D': this.relativeD,
			'LTE Bandwidth': this.lteBandwidth
		};
	}

	toRequest(): ICatchRequest4G {
		const bandwidths = ['1.4mHz', '3mHz', '5mHz', '10mHz', '15mHz', '20mHz'];
		return {
			requestType: 'IMSICatch4G',
			radio: (this.radio ?? -1) + 1,
			band: this.band,
			txDownlink: this.txdownlink,
			rejectReason: 'IMSIUnknownInHLR', // TODO: Add more reasons
			earfcn: this.arfcn,
			phyCellId: this.phyCellId,
			layer3CellId: this.l3cellId,
			plmns: [{ mcc: this.mcc.toString(), mnc: this.mnc.toString() }],
			tac: this.tac,
			minTaValue: this.minTaValue,
			refSignalPower: 0,
			lteBandwidth: bandwidths.indexOf(this.lteBandwidth),
			redirectionType: 'noredirection',
			// redirectionInfo: '',
			ulRxGain: this.rxgain,
			maxTaValue: 50,
			relativeDelay: this.relativeD,
			usePilotBoost: true,
			useOneShotRedirection: false,
			maxLteTxPower: 30,
			refClockPresent: 1
		};
	}
}

export class SurveySettings {
	network: Network;
	radio?: number;
	bands: Bands[];
	progress: Writable<Record<Bands, number>>;
	repeat: boolean;
	running: boolean;

	constructor(network: Network) {
		this.network = network;
		this.radio = undefined;
		this.bands = [];
		this.progress = writable({} as Record<Bands, number>);
		this.repeat = false;
		this.running = false;
	}
}

export type CellSettings = CellSettings2g | CellSettings4g;
