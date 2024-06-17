declare interface IResponse {
	requestType: string;
	success?: boolean;
	details?: string;
	incomplete?: boolean;
	uuid?: string;
	responseType?: string;
}

declare interface IGenericResponse extends IResponse {
	[key: string]: unknown;
}

interface IGPSData {
	latitude: number;
	longitude: number;
	altitude: number;
	'3DFix': boolean;
}

/* Catch Result types */
interface ICatchResponse extends IResponse {
	requestType: 'IMSICatch2G' | 'IMSICatch3G' | 'IMSICatch4G';
	responseType: 'IMSICatchCell';
	imsi: string;
	imei: string;
	radio: number;
	timingAdvance: string;
	gpsData: IGPSData;
}

declare interface ICatchResponse2G extends ICatchResponse {
	requestType: 'IMSICatch2G';
	cellSignalStrength: string;
	tmsi: string;
	signalNoiseRatio: string;
}

declare interface ICatchResponse3G extends ICatchResponse {
	requestType: 'IMSICatch3G';
	// TODO: Add 3G specific fields
}

declare interface ICatchResponse4G extends ICatchResponse {
	requestType: 'IMSICatch4G';
	guti: {
		mcc: string;
		mnc: string;
		mmegrpID: string;
		mmeCode: string;
		mtmsi: string;
	};
	listType: string;
	lastTac: number;
	encodedCM2: string;
	encodedCM3: string;
	hasBeenRedirected: boolean;
	lastLac: number;
	rssidB: string;
	rsrpdB: string;
	rsrqdB: string;
}

declare type ICatchResponseAny = ICatchResponse2G | ICatchResponse3G | ICatchResponse4G;

/* Survey Result types */
interface ISurveyLoadingResponse extends IResponse {
	requestType: 'Survey2G' | 'Survey3G' | 'Survey4G';
	success: boolean;
	details: string;
	radio: number;
	incomplete: boolean;
	gpsData: IGPSData;
	band: string;
	percentageOfBandScanned: number;
	responseType: 'Survey2GLoading' | 'Survey3GLoading' | 'Survey4GLoading';
}

interface ISurveyCellResponse extends IResponse {
	requestType: 'Survey2G' | 'Survey3G' | 'Survey4G';
	success: boolean;
	details: string;
	radio: number;
	incomplete: boolean;
	gpsData: IGPSData;
	band: string;
	responseType: 'Survey2GCell' | 'Survey3GCell' | 'Survey4GCell';
}

declare interface ISurveyCellResponse2G extends ISurveyCellResponse {
	requestType: 'Survey2G';
	responseType: 'Survey2GCell';
	arfcn: number;
	rssi: number;
	snr: number;
	lac: number;
	cellId: number;
	ncc: number;
	bcc: number;
	arfcnNeighbours: number[];
	c1: number;
	c2: number;
	rxlevAccMin: number;
	msTxpwrMaxCcch: number;
	cro: number;
	tempOffset: number;
	penaltyTime: number;
	hoppingList: number[];
	t3212: number;
	mnc: string;
	mcc: string;
}

declare interface ISurveyCellResponse3G extends ISurveyCellResponse {
	requestType: 'Survey3G';
	responseType: 'Survey3GCell';
	uarfcn: number;
	mibPlmnIdentity: number;
	plmns: { mcc: string; mnc: string }[];
	lac: number;
	rac: number;
	t3212: number;
	nmo: number;
	pci: number;
	cellInfo: {
		cellId: number;
		rssi: number;
		rsrp: number;
		rsrq: number;
	}[];
	priorityCellInfo: {
		cellId: number;
		rssi: number;
		rsrp: number;
		rsrq: number;
	}[];
}

declare interface ISurveyCellResponse4G extends ISurveyCellResponse {
	requestType: 'Survey4G';
	responseType: 'Survey4GCell';
	earfcn: number;
	rssi: number;
	rsrp: number;
	rsrq: number;
	phyCellId: number;
	dlBw: 'N6' | 'N15' | 'N25' | 'N50' | 'N75' | 'N100';
	noOfTxAntPorts: number;
	phichDuration: string;
	phichResource: string;
	radio: number;
	sibMask: number;
	sib1: {
		tac: number;
		l3cellId: number;
		plmn: string[];
		qRxLevMin: number;
		qRxLevMinOffset: number;
		freqBandIndicator: number;
		isCellBarred: boolean;
		isIntraFreqSelection: boolean;
	};
	sib2: {
		drxCycle: number;
		prachConfigIdx: number;
	};
	sib3: {
		qHyst: number;
		cellReselectionPriority: number;
		threshServingLow: number;
		qRxLevMin: number;
		tReselectionEUTRA: number;
		sNonIntraSearch: number;
		sIntraSearch: number;
	};
	sib4: {
		noOfIntraFreqNeighbors: null;
		intraFreqBlacklistedCellPci: null;
	};
	sib5: {
		interFreqNeighbors: null;
	};
	sib6: {
		uarfcnInterRatNeighbors: null;
		tReselectionUTRA: number;
	};
	sib7: {
		startingArfcnInterRatNeighbors: null;
		bandIndicator: null;
	};
	sib8: {
		tReselectionCDMA2000: number;
		numberOfBandClass: number;
		numberOfNeighCellPerBand: number;
		regParamValid: boolean;
		RegParams: {
			sid: number;
			nid: number;
			multipleSID: number;
			multipleNID: number;
			homeReg: number;
			foreignSIDReg: number;
			foreignNIDReg: number;
			parameterReg: number;
			powerUpReg: number;
			registrationPeriod: number;
			registrationZone: number;
			totalZone: number;
			zoneTimer: number;
		};
		cdmaBandClass: null;
		CdmaNeighCellPerBand: null;
	};
	relativeD: number;
}

declare type ISurveyResponseAny =
	| ISurveyCellResponse2G
	| ISurveyCellResponse3G
	| ISurveyCellResponse4G
	| ISurveyLoadingResponse;

/* Status Result types */
interface IRadioStatus {
	radio: number;
	procedureRequestType: string;
}

declare interface IStatusResponse extends IResponse {
	requestType: 'Status';
	details: string;
	gps: IGPSData;
	incomplete: boolean;
	uuid: string;
	softwareVersion: string;
	radioStatus: IRadioStatus[];
	octasicSDRTemperature: number;
	octasicSDRVoltage: number;
}

type Events = 'surveyResult' | 'catchResult';

type Bands2G = import('$lib/assets/bands').Bands2G;
type Bands3G = import('$lib/assets/bands').Bands3G;
type Bands4G = import('$lib/assets/bands').Bands4G;
type Bands = import('$lib/assets/bands').Bands;

declare interface IRequest {
	requestType: string;
}

declare interface IGenericRequest extends IRequest {
	[key: string]: unknown;
}

interface ISurveyRequest extends IRequest {
	requestType: 'Survey2G' | 'Survey3G' | 'Survey4G';
	radio: number;
	bands: Bands[];
	rssiThreshold: number;
	// scanType: 'exhaustive' | 'rssi' | 'rssiAndExhaustive';
	noOfInterationsToScan?: number;
}

interface ICatchRequest extends IRequest {
	requestType: 'IMSICatch2G' | 'IMSICatch3G' | 'IMSICatch4G'
	radio: number;

	band: Bands;
	txDownlink: number;
	rejectReason: string;
}

declare interface ICatchRequest2G extends ICatchRequest {
	requestType: 'IMSICatch2G';
	band: Bands2G;
	lac: number;
	cellId: number;
	arfcn: number;
	ncc: number;
	bcc: number;
	rxGain: number;
	txDownlink: number;
	mcc: string;
	mnc: string;
}

declare interface ICatchRequest3G extends ICatchRequest {
	requestType: 'IMSICatch3G';
	band: Bands3G;
	// TODO: Add 3G specific fields
}

declare interface ICatchRequest4G extends ICatchRequest {
	requestType: 'IMSICatch4G';
	band: Bands4G;
	earfcn: number;
	phyCellId: number;
	layer3CellId: number;
	plmns: {mcc: string, mnc: string}[];
	tac: number;
	redirectionType: 'noredirection'; // TODO: Add more types
	// redirectionInfo: {};
	txDownlink: number;
	rejectReason: string;
	ulRxGain: number;
	lteBandwidth: number;
	minTaValue: number;
	maxTaValue: number;
	relativeDelay: number;
	usePilotBoost: boolean;
	useOneShotRedirection: boolean;
	refSignalPower: number;
	maxLteTxPower: number;
	refClockPresent: number;
}

declare type ICatchRequestAny = ICatchRequest2G | ICatchRequest3G | ICatchRequest4G;
