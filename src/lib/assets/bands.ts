import { Network } from '$lib/mission/enums';

// prettier-ignore
const bands2g = [
	'Gsm 450', 'Gsm 850', 'Gsm P 900', 'Gsm DCS 1800', 'Gsm PCS 1900', 'Gsm E 900', 'Gsm R 900'
] as const;

// prettier-ignore
const bands4g = [
	'Lte 1', 'Lte 2', 'Lte 3', 'Lte 4', 'Lte 5', 'Lte 6', 'Lte 7', 'Lte 8', 'Lte 9', 'Lte 10', 'Lte 11', 'Lte 12',
	'Lte 13', 'Lte 14', 
	'Lte 17', 'Lte 18', 'Lte 19', 'Lte 20', 'Lte 21', 'Lte 22', 'Lte 23', 'Lte 24', 'Lte 25', 'Lte 26', 'Lte 27', 
	'Lte 28', 'Lte 29', 'Lte 30', 'Lte 31', 'Lte 32', 'Lte 33', 'Lte 34', 'Lte 35', 'Lte 36', 'Lte 37', 'Lte 38', 
	'Lte 39', 'Lte 40', 'Lte 41', 'Lte 42', 'Lte 43', 'Lte 44', 'Lte 45', 'Lte 46', 'Lte 47', 'Lte 48', 'Lte 50',
	'Lte 51', 'Lte 52', 'Lte 53', 'Lte 54',
	'Lte 65', 'Lte 66', 'Lte 67', 'Lte 68', 'Lte 69', 'Lte 70', 'Lte 71', 'Lte 72', 'Lte 74', 'Lte 75', 'Lte 76',
	'Lte 85', 'Lte 87', 'Lte 88', 'Lte 103', 'Lte 106', 'Lte 107', 'Lte 108',
] as const;

export const bands = {
	Net2G: bands2g,
	Net4G: bands4g
} as const;

interface IBandInfo {
	name?: string;
	mode?: 'FDD' | 'TDD' | 'SDL';
	arfcnRanges: [number, number][];
	uplink: (number|null)[];
	downlink: number[];
}

interface IBandsInfo {
	[Network.Net2G]: Record<Bands2G, IBandInfo>;
	[Network.Net4G]: Record<Bands4G, IBandInfo>;
}

export const multiplier: Record<Network, number> = {
	Net2G: 0.2,
	Net3G: 0.2, // TODO: Check this
	Net4G: 0.1
} as const;

/* 
	To calculate frequency from arfcn:
	F = f[0] + multiplier * (arfcn - range[0])

	Eg, for Gsm 450: 
	Downlink = 460.6 + 0.2 * (arfcn - 259)
	Uplink   = 450.6 + 0.2 * (arfcn - 259)

	For Lte 1:
	Downlink = 2110 + 0.1 * (arfcn - 0)
	Uplink   = 1920 + 0.1 * (arfcn - 0)
*/

export const bandsInfo: IBandsInfo = {
	Net2G: {
		'Gsm 450': {
			arfcnRanges: [[259, 293]],
			downlink: [460.6, 467.4],
			uplink: [450.6, 457.4]
		},
		'Gsm 850': {
			arfcnRanges: [[128, 251]],
			downlink: [869.2, 893.8],
			uplink: [824.2, 848.8]
		},
		'Gsm P 900': {
			arfcnRanges: [[1, 124]],
			downlink: [935.2, 959.8],
			uplink: [890.2, 914.8]
		},
		'Gsm DCS 1800': {
			arfcnRanges: [[512, 885]],
			downlink: [1805.2, 1879.8],
			uplink: [1710.2, 1784.8]
		},
		'Gsm PCS 1900': {
			arfcnRanges: [[512, 810]],
			downlink: [1930.2, 1989.8],
			uplink: [1850.2, 1909.8]
		},
		'Gsm E 900': {
			arfcnRanges: [
				[0, 124],
				[975, 1023]
			],
			downlink: [925.2, 959.8],
			uplink: [880.2, 914.8]
		},
		'Gsm R 900': {
			arfcnRanges: [
				[0, 124],
				[955, 974]
			],
			downlink: [935.2, 959.8],
			uplink: [890.2, 914.8]
		}
	},
	Net4G: {
		'Lte 1': {
			name: '2100',
			mode: 'FDD',
			arfcnRanges: [[0, 599]],
			downlink: [2110, 2170],
			uplink: [1920, 1980]
		},
		'Lte 2': {
			name: '1900 PCS',
			mode: 'FDD',
			arfcnRanges: [[600, 1199]],
			downlink: [1930, 1990],
			uplink: [1850, 1910]
		},
		'Lte 3': {
			name: '1800+',
			mode: 'FDD',
			arfcnRanges: [[1200, 1949]],
			downlink: [1805, 1880],
			uplink: [1710, 1785]
		},
		'Lte 4': {
			name: 'AWS-1',
			mode: 'FDD',
			arfcnRanges: [[1950, 2399]],
			downlink: [2110, 2155],
			uplink: [1710, 1755]
		},
		'Lte 5': {
			name: '850',
			mode: 'FDD',
			arfcnRanges: [[2400, 2649]],
			downlink: [869, 894],
			uplink: [824, 849]
		},
		'Lte 6': {
			name: '850 Japan',
			mode: 'FDD',
			arfcnRanges: [[2650, 2749]],
			downlink: [875, 885],
			uplink: [830, 840]
		},
		'Lte 7': {
			name: '2600',
			mode: 'FDD',
			arfcnRanges: [[2750, 3449]],
			downlink: [2620, 2690],
			uplink: [2500, 2570]
		},
		'Lte 8': {
			name: '900 GSM',
			mode: 'FDD',
			arfcnRanges: [[3450, 3799]],
			downlink: [925, 960],
			uplink: [880, 915]
		},
		'Lte 9': {
			name: '1800',
			mode: 'FDD',
			arfcnRanges: [[3800, 4149]],
			downlink: [1844.9, 1879.9],
			uplink: [1749.9, 1784.9]
		},
		'Lte 10': {
			name: 'AWS-3',
			mode: 'FDD',
			arfcnRanges: [[4150, 4749]],
			downlink: [2110, 2170],
			uplink: [1710, 1770]
		},
		'Lte 11': {
			name: '1500 Lower',
			mode: 'FDD',
			arfcnRanges: [[4750, 4949]],
			downlink: [1475.9, 1495.9],
			uplink: [1427.9, 1447.9]
		},
		'Lte 12': {
			name: '700 a',
			mode: 'FDD',
			arfcnRanges: [[5010, 5179]],
			downlink: [729, 746],
			uplink: [699, 716]
		},
		'Lte 13': {
			name: '700 c',
			mode: 'FDD',
			arfcnRanges: [[5180, 5279]],
			downlink: [746, 756],
			uplink: [777, 787]
		},
		'Lte 14': {
			name: '700 PS',
			mode: 'FDD',
			arfcnRanges: [[5280, 5379]],
			downlink: [758, 768],
			uplink: [788, 798]
		},
		'Lte 17': {
			name: '700 b',
			mode: 'FDD',
			arfcnRanges: [[5730, 5849]],
			downlink: [734, 746],
			uplink: [704, 716]
		},
		'Lte 18': {
			name: '800 Lower',
			mode: 'FDD',
			arfcnRanges: [[5850, 5999]],
			downlink: [860, 875],
			uplink: [815, 830]
		},
		'Lte 19': {
			name: '800 Upper',
			mode: 'FDD',
			arfcnRanges: [[6000, 6149]],
			downlink: [875, 890],
			uplink: [830, 845]
		},
		'Lte 20': {
			name: '800 DD',
			mode: 'FDD',
			arfcnRanges: [[6150, 6449]],
			downlink: [791, 821],
			uplink: [832, 862]
		},
		'Lte 21': {
			name: '1500 Upper',
			mode: 'FDD',
			arfcnRanges: [[6450, 6599]],
			downlink: [1495.9, 1510.9],
			uplink: [1447.9, 1462.9]
		},
		'Lte 22': {
			name: '3500',
			mode: 'FDD',
			arfcnRanges: [[6600, 7399]],
			downlink: [3510, 3590],
			uplink: [3410, 3490]
		},
		'Lte 23': {
			name: '2000 S-band',
			mode: 'FDD',
			arfcnRanges: [[7500, 7699]],
			downlink: [2180, 2200],
			uplink: [2000, 2020]
		},
		'Lte 24': {
			name: '1600 L-band',
			mode: 'FDD',
			arfcnRanges: [[7700, 8039]],
			downlink: [1525, 1559],
			uplink: [1626.5, 1660.5]
		},
		'Lte 25': {
			name: '1900+',
			mode: 'FDD',
			arfcnRanges: [[8040, 8689]],
			downlink: [1930, 1995],
			uplink: [1850, 1915]
		},
		'Lte 26': {
			name: '850+',
			mode: 'FDD',
			arfcnRanges: [[8690, 9039]],
			downlink: [859, 894],
			uplink: [814, 849]
		},
		'Lte 27': {
			name: '800 SMR',
			mode: 'FDD',
			arfcnRanges: [[9040, 9209]],
			downlink: [852, 869],
			uplink: [807, 824]
		},
		'Lte 28': {
			name: '700 APT',
			mode: 'FDD',
			arfcnRanges: [[9210, 9659]],
			downlink: [758, 803],
			uplink: [703, 748]
		},
		'Lte 29': {
			name: '700 d',
			mode: 'SDL',
			arfcnRanges: [[9660, 9769]],
			downlink: [717, 728],
			uplink: [null, 11.3]
		},
		'Lte 30': {
			name: '2300 WCS',
			mode: 'FDD',
			arfcnRanges: [[9770, 9869]],
			downlink: [2350, 2360],
			uplink: [2305, 2315]
		},
		'Lte 31': {
			name: '450',
			mode: 'FDD',
			arfcnRanges: [[9870, 9919]],
			downlink: [462.5, 467.5],
			uplink: [452.5, 457.5]
		},
		'Lte 32': {
			name: '1500 L-band',
			mode: 'SDL',
			arfcnRanges: [[9920, 10359]],
			downlink: [1452, 1496],
			uplink: [null, 12.4]
		},
		'Lte 33': {
			name: 'TD 1900',
			mode: 'TDD',
			arfcnRanges: [[36000, 36199]],
			downlink: [1900, 1920],
			uplink: [null, 8]
		},
		'Lte 34': {
			name: 'TD 2000',
			mode: 'TDD',
			arfcnRanges: [[36200, 36349]],
			downlink: [2010, 2025],
			uplink: [null, 8]
		},
		'Lte 35': {
			name: 'TD PCS Lower',
			mode: 'TDD',
			arfcnRanges: [[36350, 36949]],
			downlink: [1850, 1910],
			uplink: [null, 8]
		},
		'Lte 36': {
			name: 'TD PCS Upper',
			mode: 'TDD',
			arfcnRanges: [[36950, 37549]],
			downlink: [1930, 1990],
			uplink: [null, 8]
		},
		'Lte 37': {
			name: 'TD PCS Center gap',
			mode: 'TDD',
			arfcnRanges: [[37550, 37749]],
			downlink: [1910, 1930],
			uplink: [null, 8]
		},
		'Lte 38': {
			name: 'TD 2600',
			mode: 'TDD',
			arfcnRanges: [[37750, 38249]],
			downlink: [2570, 2620],
			uplink: [null, 8]
		},
		'Lte 39': {
			name: 'TD 1900+',
			mode: 'TDD',
			arfcnRanges: [[38250, 38649]],
			downlink: [1880, 1920],
			uplink: [null, 8]
		},
		'Lte 40': {
			name: 'TD 2300',
			mode: 'TDD',
			arfcnRanges: [[38650, 39649]],
			downlink: [2300, 2400],
			uplink: [null, 8]
		},
		'Lte 41': {
			name: 'TD 2600+',
			mode: 'TDD',
			arfcnRanges: [[39650, 41589]],
			downlink: [2496, 2690],
			uplink: [null, 10]
		},
		'Lte 42': {
			name: 'TD 3500',
			mode: 'TDD',
			arfcnRanges: [[41590, 43589]],
			downlink: [3400, 3600],
			uplink: [null, 10]
		},
		'Lte 43': {
			name: 'TD 3700',
			mode: 'TDD',
			arfcnRanges: [[43590, 45589]],
			downlink: [3600, 3800],
			uplink: [null, 10]
		},
		'Lte 44': {
			name: 'TD 700',
			mode: 'TDD',
			arfcnRanges: [[45590, 46589]],
			downlink: [703, 803],
			uplink: [null, 11.1]
		},
		'Lte 45': {
			name: 'TD 1500',
			mode: 'TDD',
			arfcnRanges: [[46590, 46789]],
			downlink: [1447, 1467],
			uplink: [null, 13.2]
		},
		'Lte 46': {
			name: 'TD Unlicensed',
			mode: 'TDD',
			arfcnRanges: [[46790, 54539]],
			downlink: [5150, 5925],
			uplink: [null, 13.2]
		},
		'Lte 47': {
			name: 'TD V2X',
			mode: 'TDD',
			arfcnRanges: [[54540, 55239]],
			downlink: [5855, 5925],
			uplink: [null, 14.1]
		},
		'Lte 48': {
			name: 'TD 3600',
			mode: 'TDD',
			arfcnRanges: [[55240, 56739]],
			downlink: [3550, 3700],
			uplink: [null, 14.2]
		},
		'Lte 50': {
			name: 'TD 3600r',
			mode: 'TDD',
			arfcnRanges: [[56740, 58239]],
			downlink: [3550, 3700],
			uplink: [null, 15.1]
		},
		'Lte 51': {
			name: 'TD 1500+',
			mode: 'TDD',
			arfcnRanges: [[58240, 59089]],
			downlink: [1432, 1517],
			uplink: [null, 15]
		},
		'Lte 52': {
			name: 'TD 1500-',
			mode: 'TDD',
			arfcnRanges: [[59090, 59139]],
			downlink: [1427, 1432],
			uplink: [null, 15]
		},
		'Lte 53': {
			name: 'TD 3300',
			mode: 'TDD',
			arfcnRanges: [[59140, 60139]],
			downlink: [3300, 3400],
			uplink: [null, 15.2]
		},
		'Lte 54': {
			name: 'TD 2500',
			mode: 'TDD',
			arfcnRanges: [[60140, 60254]],
			downlink: [2483.5, 2495],
			uplink: [null, 16]
		},
		'Lte 65': {
			name: 'TD 1700',
			mode: 'TDD',
			arfcnRanges: [[60255, 60304]],
			downlink: [1670, 1675],
			uplink: [null, 18]
		},
		'Lte 66': {
			name: '2100+',
			mode: 'FDD',
			arfcnRanges: [[65536, 66435]],
			downlink: [2110, 2200],
			uplink: [1920, 2010]
		},
		'Lte 67': {
			name: 'AWS',
			mode: 'FDD',
			arfcnRanges: [[66436, 67335]],
			downlink: [2110, 2200],
			uplink: [1710, 1780]
		},
		'Lte 68': {
			name: '700 EU',
			mode: 'SDL',
			arfcnRanges: [[67336, 67535]],
			downlink: [738, 758],
			uplink: [null, 13.2]
		},
		'Lte 69': {
			name: '700 ME',
			mode: 'FDD',
			arfcnRanges: [[67536, 67835]],
			downlink: [753, 783],
			uplink: [698, 728]
		},
		'Lte 70': {
			name: 'DL b38',
			mode: 'SDL',
			arfcnRanges: [[67836, 68335]],
			downlink: [2570, 2620],
			uplink: [null, 14]
		},
		'Lte 71': {
			name: 'AWS-4',
			mode: 'FDD',
			arfcnRanges: [[68336, 68585]],
			downlink: [1995, 2020],
			uplink: [1695, 1710]
		},
		'Lte 72': {
			name: '600',
			mode: 'FDD',
			arfcnRanges: [[68586, 68935]],
			downlink: [617, 652],
			uplink: [663, 698]
		},
		'Lte 74': {
			name: '450 PMR/PAMR',
			mode: 'FDD',
			arfcnRanges: [[68936, 68985]],
			downlink: [461, 466],
			uplink: [451, 456]
		},
		'Lte 75': {
			name: '450 APAC',
			mode: 'FDD',
			arfcnRanges: [[68986, 69035]],
			downlink: [460, 465],
			uplink: [450, 455]
		},
		'Lte 76': {
			name: 'L-band',
			mode: 'FDD',
			arfcnRanges: [[69036, 69465]],
			downlink: [1475, 1518],
			uplink: [1427, 1470]
		},
		'Lte 85': {
			name: 'DL b50',
			mode: 'SDL',
			arfcnRanges: [[69466, 70315]],
			downlink: [1432, 1517],
			uplink: [null, 15]
		},
		'Lte 87': {
			name: 'DL b51',
			mode: 'SDL',
			arfcnRanges: [[70316, 70365]],
			downlink: [1427, 1432],
			uplink: [null, 15]
		},
		'Lte 88': {
			name: '700 a+',
			mode: 'FDD',
			arfcnRanges: [[70366, 70545]],
			downlink: [728, 746],
			uplink: [698, 716]
		},
		'Lte 103': {
			name: '410',
			mode: 'FDD',
			arfcnRanges: [[70546, 70595]],
			downlink: [420, 425],
			uplink: [410, 415]
		},
		'Lte 106': {
			name: '410+',
			mode: 'FDD',
			arfcnRanges: [[70596, 70645]],
			downlink: [422, 427],
			uplink: [412, 417]
		},
		'Lte 107': {
			name: 'NB-IoT',
			mode: 'FDD',
			arfcnRanges: [[70646, 70655]],
			downlink: [757, 758],
			uplink: [787, 788]
		},
		'Lte 108': {
			name: '900',
			mode: 'FDD',
			arfcnRanges: [[70656, 70705]],
			downlink: [935, 940],
			uplink: [896, 901]
		}
	}
};

export type Bands4G = (typeof bands)['Net4G'][number];
export type Bands2G = (typeof bands)['Net2G'][number];
export type Bands = Bands2G | Bands4G;

export const downlink = (band: Bands, arfcn: number): null | number => {

    let range: [number, number] | undefined;
    let downlinkVal: number | undefined;
    let multiplierVal: number | undefined;

    // If the bands are Bands2G, then the network is Net2G
    if (bands.Net2G.includes(band as Bands2G)){
        const { arfcnRanges, downlink } = bandsInfo[Network.Net2G][(band as Bands2G)];
        range = arfcnRanges.find(([start, end]) => arfcn >= start && arfcn <= end);

        downlinkVal = downlink[0];
        multiplierVal = multiplier[Network.Net2G];
    } else if (bands.Net4G.includes(band as Bands4G)){
        const { arfcnRanges, downlink } = bandsInfo[Network.Net4G][(band as Bands4G)];
        range = arfcnRanges.find(([start, end]) => arfcn >= start && arfcn <= end);

        downlinkVal = downlink[0];
        multiplierVal = multiplier[Network.Net4G];
    }

	if (!range) return null;
	if (downlinkVal === undefined) return null;
    if (multiplierVal === undefined) return null;

	return downlinkVal + multiplierVal * (arfcn - range[0]);
};
