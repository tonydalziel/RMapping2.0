import * as turf from '@turf/turf';
import type { GeoJSONSource } from 'mapbox-gl';
import type { CatchResults2g, CatchResults4g, CatchResults } from '$lib/classes/results';

// Extent from the CatchResults type with the parameter `maxDistance`

interface Sample2g extends CatchResults2g {
    maxDistance: number;
}

interface Sample4g extends CatchResults4g {
    maxDistance: number;
}

type Samples = Sample2g | Sample4g;

interface Device {
	imsi: string;
	imei: string;
	predicted_lat: number | null;
	predicted_lon: number | null;
	last_seen: Date;
	last_rssi: number;
	hits: number;
	samples: Samples[];
	hexIds: number[];
}

export class Heatmap {
	hexGrid: turf.helpers.FeatureCollection<
		turf.helpers.Polygon,
		{ intensity: number; target_status: number; devices: string[]; targets: string[] }
	>;
	displayedData: Record<string, Device>; // Stores all displayed data in the form IMSI:Device
	configured: boolean; // Configures the center of the heatmap
	targets: Set<string>; // List of imsi's used for target filtering
	increment: number; // Determines how much each hit impact's the map
	targetsOnly: boolean; // Determines whether just targets should be displayed
	triangleAreaThreshold: number; // Smallest triangle area to be considered for trilateration (km^3)
	referenceDistance: number; // Reference distance in meters
	referenceRSSI: number; // RSSI at the reference distance
	pathLossExponent: number; // Path loss exponent (can vary based on environment)
	correctionFactor: number; // Correction factor for specific environment
	hexMultipoint: turf.Feature<turf.MultiPoint>; // Multipoint used to quickly assign a hit to a hexagon
	flightPath: turf.helpers.Feature<turf.helpers.LineString, turf.helpers.Properties>; // Flight path of the drone

	constructor(
		lat: number | null = null,
		lon: number | null = null,
		referenceDistance = 0.01,
		referenceRSSI = -45,
		pathLossExponent = 3.5,
		correctionFactor = 0,
		increment = 0.2,
		targetsOnly = false,
		triangleAreaThreshold = 1
	) {
		// If lat and lon are null, set the configured value to false
		if (lat == null || lon == null) {
			lat = lon = 0;
			this.configured = false;
		} else {
			this.configured = true;
		}
		// Create a buffer around the point using turf
		const buffer = turf.buffer(turf.point([lon, lat]), 3, { units: 'kilometers' });

		// Create a hexagonal grid that covers the buffer
		// Outline contains a count of known targets then a count of precise locations within the area
		this.hexGrid = turf.hexGrid(turf.bbox(buffer), 0.05, {
			units: 'kilometers',
			properties: { intensity: 0, target_status: 0, devices: [], targets: [] }
		});

		this.displayedData = {};
		this.targets = new Set();
		this.increment = increment;
		this.targetsOnly = targetsOnly;
		this.triangleAreaThreshold = triangleAreaThreshold;
		this.referenceDistance = referenceDistance;
		this.referenceRSSI = referenceRSSI;
		this.pathLossExponent = pathLossExponent;
		this.correctionFactor = correctionFactor;

		// Hashmap used to quiclkly assign a hit to a hexagon
		const hex_lookup = [];
		for (let i = 0; i < this.hexGrid.features.length; i++) {
			const temp_point = turf.centerOfMass(this.hexGrid.features[i]);
			if (temp_point.properties === null) temp_point.properties = { id: i };
			else temp_point.properties.id = i;
			hex_lookup.push(temp_point);
		}

		// @ts-ignore
		this.hexMultipoint = turf.multiPoint(hex_lookup);

		this.flightPath = turf.lineString(
			[
				[lon, lat],
				[lon, lat]
			],
			{ name: 'flight-path' }
		);
	}

	// Function to change the lat lon of the heatmap and refresh the grid
	setLatLon(lat: number, lon: number) {
		this.clearGrid();
		this.configured = true;
		// Create a buffer around the point using turf
		const buffer = turf.buffer(turf.point([lon, lat]), 3, { units: 'kilometers' });

		// Create a hexagonal grid that covers the buffer
		// Outline contains a count of known targets then a count of precise locations within the area
		this.hexGrid = turf.hexGrid(turf.bbox(buffer), 0.05, {
			units: 'kilometers',
			properties: { intensity: 0, target_status: 0, devices: [], targets: [] }
		});

		// Hashmap used to quiclkly assign a hit to a hexagon
		const hex_lookup = [];
		for (let i = 0; i < this.hexGrid.features.length; i++) {
			const temp_point = turf.centerOfMass(this.hexGrid.features[i]);
			if (temp_point.properties === null) temp_point.properties = { id: i };
			else temp_point.properties.id = i;
			hex_lookup.push(temp_point);
		}

		// @ts-ignore
		this.hexMultipoint = turf.multiPoint(hex_lookup);

		// Update the flight path
		this.flightPath = turf.lineString(
			[
				[lon, lat],
				[lon, lat]
			],
			{ name: 'flight-path' }
		);
	}

	// Function to clear the entire heatmap back to clear
	clearGrid() {
		for (const feature of this.hexGrid.features) {
			feature.properties.intensity = 0;
			feature.properties.target_status = 0;
			feature.properties.devices = [];
			feature.properties.targets = [];
		}
		this.displayedData = {};
		this.targets = new Set();
		this.flightPath = turf.lineString(
			[
				[0, 0],
				[0.1, 0]
			],
			{ name: 'flight-path' }
		);
	}

	// Function to toggle targets only then refresh the grid to display the change
	toggleTargetsOnly() {
		this.targetsOnly = !this.targetsOnly;
		this.refreshGrid();
	}

	// Function to add a target
	addTarget(imsi: string) {
		this.targets.add(imsi);

		// Want to change the target_status of any hexagons in which it is located to 2 and change the lists of targets and devices to match this change
		if (imsi in this.displayedData) {
			for (const hexId of this.displayedData[imsi].hexIds) {
				this.hexGrid.features[hexId].properties.target_status = 2;
				// Remove the imsi from the devices list
				const index = this.hexGrid.features[hexId].properties.devices.indexOf(imsi);
				if (index > -1) {
					this.hexGrid.features[hexId].properties.devices.splice(index, 1);
				}
				// Add the device to the target list
				this.hexGrid.features[hexId].properties.targets.push(imsi);
				this.setOutline(hexId);
			}
		}

		if (!this.targetsOnly) {
			this.toggleTargetsOnly();
		}
	}

	isTarget(imsi: string) {
		return this.targets.has(imsi);
	}

	// Function to remove a target
	removeTarget(imsi: string) {
		const isTarget = this.isTarget(imsi);
		if (isTarget) {
			this.targets.delete(imsi);

			// For any hexagons containing this device, remove the device from the targets list and add it to the devices list
			if (imsi in this.displayedData) {
				for (const hexId of this.displayedData[imsi].hexIds) {
					// Set the status to 1 if there are no other targets in the hexagon
					if (this.hexGrid.features[hexId].properties.targets.length == 1) {
						this.hexGrid.features[hexId].properties.target_status = 1;
					}

					// Remove the imsi from the targets list
					const index = this.hexGrid.features[hexId].properties.targets.indexOf(imsi);
					if (index > -1) {
						this.hexGrid.features[hexId].properties.targets.splice(index, 1);
					}

					// Add the device to the devices list
					this.hexGrid.features[hexId].properties.devices.push(imsi);
					this.setOutline(hexId);
				}
			}
		}

		// If there are no targets left, set targetsOnly to false
		if (this.targets.size == 0 && this.targetsOnly) {
			this.toggleTargetsOnly();
		}
	}

	// Function to clear all targets
	clearTargets() {
		// Loop through each target and run the removeTarget function
		this.targets.clear();
		this.targetsOnly = false;
		this.refreshGrid();
	}

	// Function to clear the hex grid then add all devices back using the displayed data
	refreshGrid() {
		const displayed_copy = this.displayedData;
		const targets = this.targets;
		this.clearGrid();
		this.targets = targets;
		for (const key in displayed_copy) {
			this.addHits(displayed_copy[key].samples);
		}
	}

	// Set outline value of a hexagon
	setOutline(hexID: number) {
		// Check if the hexagon includes a target then set the status to 2
		// Else check if the hexagon has a device then set the status to 1
		// Else 0
		if (this.hexGrid.features[hexID].properties.targets.length > 0) {
			this.hexGrid.features[hexID].properties.target_status = 2;
		} else if (this.hexGrid.features[hexID].properties.devices.length > 0) {
			this.hexGrid.features[hexID].properties.target_status = 1;
		} else {
			this.hexGrid.features[hexID].properties.target_status = 0;
		}
	}

	clearKnownLocation(imsi: string) {
		// Set the predicted_lat and predicted_lon of a device to null
		if (imsi in this.displayedData) {
			this.displayedData[imsi].predicted_lat = null;
			this.displayedData[imsi].predicted_lon = null;
			// Loop through each hexagon in which the device is located and remove the device from the list of devices or targets then run setOutline
			for (const hexId of this.displayedData[imsi].hexIds) {
				// Remove the imsi from the devices list
				if (this.isTarget(imsi)) {
					const index = this.hexGrid.features[hexId].properties.targets.indexOf(imsi);
					if (index > -1) {
						this.hexGrid.features[hexId].properties.targets.splice(index, 1);
					}
				} else {
					const index = this.hexGrid.features[hexId].properties.devices.indexOf(imsi);
					if (index > -1) {
						this.hexGrid.features[hexId].properties.devices.splice(index, 1);
					}
				}
				this.setOutline(hexId);
			}
		}
	}

	// Function to add / change a known location
	#addKnownLocation(imsi: string, lat: number, lon: number, width: number) {
		// Set the predicted_lat and predicted_lon of a device
		if (imsi in this.displayedData) {
			this.displayedData[imsi].predicted_lat = lat;
			this.displayedData[imsi].predicted_lon = lon;
		}

		// Check which points are within a buffer of the hit
		const temp_multipoint_buffer = turf.buffer(turf.point([lon, lat]), width, {
			units: 'kilometers'
		});

		const temp_points_within = turf.pointsWithinPolygon(this.hexMultipoint, temp_multipoint_buffer);

		// Loop through temp_multipoint_within and increase the intensity of each hexagon by the increment using the point property id
		// Try except statement for js
		try {
			for (const feature of temp_points_within.features[0].geometry.coordinates) {
				// @ts-ignore
				const hexID = feature.properties.id;
				// If the imsi is a target, add to the target list of the hexagon else add to the devices list
				if (this.isTarget(imsi)) {
					this.hexGrid.features[hexID].properties.targets.push(imsi);
				} else {
					this.hexGrid.features[hexID].properties.devices.push(imsi);
				}
				this.displayedData[imsi].hexIds.push(hexID);
				this.setOutline(hexID);
			}
		} catch (err) {
			console.error(err);
		}
	}

	// Function to change the incremenet value
	setIncrement(increment: number) {
		this.increment = increment;
		this.refreshGrid();
	}

	// Function used to reduce all intensity values on the map (used for aging between hits)
	reduceIntensity(amount: number) {
		for (const feature of this.hexGrid.features) {
			feature.properties.intensity = Math.max(0, feature.properties.intensity - amount);
		}
	}

	// Function to add an array of new hits
	addHits(data: CatchResults[]) {
		data.forEach(this.addHit.bind(this));
	}

	// Calculate the max distance a device could be from the catcher and return it
	#calculateMaxDistance(hit: CatchResults) {
		//TODO: Implement alternative methods for calculating max distance
		const ts = 1 / 30720000;
		const nta = 16 * Math.max(hit.timingAdvance, 0) * ts;
		return (3 * 10 ** 8 * nta) / 2000;
	}

	// Helper function to calculate the area of a triangle given three points
	#triangleArea(point1: turf.Position, point2: turf.Position, point3: turf.Position) {
		return turf.area(turf.polygon([[point1, point2, point3, point1]]));
	}

	// Function for calculating the best three points for trilateration (reducing tendancy toward's the drone path)
	// Currenlty used to determine whether the most recent 15 hits are capable of forming a triangle in which case they are used for trilateration
	#convexHullBestThree(points: number[][]) {
		// Create an array of Turf.js Point features from the input values
		const features = points.map((point) => turf.point(point.slice(0, 2), { rssi: point[2] }));

		// Create a FeatureCollection from the Point features
		const featureCollection = turf.featureCollection(features);

		// Calculate the convex hull using Turf.js
		const convexHull = turf.convex(featureCollection);
		if (!convexHull) {
			return false;
		}

		for (let i = 0; i < convexHull.geometry.coordinates[0].length - 2; i++) {
			for (let j = i + 1; j < convexHull.geometry.coordinates[0].length - 1; j++) {
				for (let k = j + 1; k < convexHull.geometry.coordinates[0].length; k++) {
					const area = this.#triangleArea(
						convexHull.geometry.coordinates[0][i],
						convexHull.geometry.coordinates[0][j],
						convexHull.geometry.coordinates[0][k]
					);
					if (area > this.triangleAreaThreshold) return true;
				}
			}
		}

		return false;
	}

	// Generalised trilateration function which takes a number of circular regions and finds the areas of intersection
	#trilaterateGeneral(referencePoints: number[][]) {
		// Ensure we have at least three reference points
		if (referencePoints.length < 3) {
			throw new Error('Trilateration requires at least three reference points.');
		}

		// Extract reference point coordinates and distances
		const points = [];
		const distances = [];
		for (let i = 0; i < referencePoints.length; i++) {
			points.push(turf.point(referencePoints[i].slice(0, 2)));
			distances.push(referencePoints[i][3]);
		}

		// Calculate the intersection of all circles (trilateration)
		const units: turf.Units = 'kilometers';
		const options = { units }; // Adjust the units if needed
		const circles = [];
		for (let i = 0; i < points.length; i++) {
			circles.push(turf.circle(points[i], distances[i], options));
		}

		let intersection: turf.helpers.Feature<
			turf.helpers.Polygon | turf.helpers.MultiPolygon,
			turf.helpers.Properties
		> = circles[0];
		for (let i = 1; i < circles.length; i++) {
			const new_intersect = turf.intersect(intersection, circles[i]);
			if (!new_intersect) return intersection;
			intersection = new_intersect;
		}

		return intersection;
	}

	// Function to estimate distance in metres based on RSSI
	#estimateDistance(rssi: number) {
		// Calculate the estimated distance using the log-distance path loss model
		const distance =
			this.referenceDistance *
			Math.pow(
				10,
				(this.referenceRSSI - rssi + this.correctionFactor) / (10 * this.pathLossExponent)
			);
		return distance;
	}

	// Function to generate the flight path
	#generateFlightPath() {
		const coords = Object.values(this.displayedData)
			.flat()
			.map((capture) => capture.samples)
			.flat()
			.filter(
				(capture, index, self) =>
					self.findIndex((c) => c.lat === capture.lat && c.lon === capture.lon) === index
			)
			.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
			.map((capture) => [capture.lon, capture.lat]);
		if (coords.length < 2) return;
		const lineString = turf.lineString(coords, { name: 'flight-path' });
		this.flightPath = lineString;
	}

	// Function to add a new hit to the grid
	addHit(hit: CatchResults) {
		// Reduce the visibility of prior hits by 0.1% of the increment value
		// this.reduceIntensity(this.increment * 0.?);

		// Skip if the hit doesn't include lat or lon
		if (!hit.lat || !hit.lon) return;

		// If the heatmap is not configured, reconfigure it
		if (!this.configured) {
			this.setLatLon(hit.lat, hit.lon);
		}

		if (hit.timingAdvance > 20) return;

        // Re-assign hit to the Samples type
        const hitSample: Samples = hit as Samples;

		// Add hit to the displayed data
		if (hit.raw.imsi in this.displayedData) {
			this.displayedData[hit.raw.imsi].samples.push(hitSample);
			this.displayedData[hit.raw.imsi].hits += 1;
		} else {
			this.displayedData[hit.raw.imsi] = {
				imsi: hit.raw.imsi,
				imei: hit.raw.imei,
				predicted_lat: null,
				predicted_lon: null,
				last_seen: hit.time,
				last_rssi: hit.rssi,
				hits: 1,
				samples: [hitSample],
				hexIds: []
			};
		}

		// Update the flight path
		this.#generateFlightPath();

		// Skip if not a target and targets_only is true (this is why the map must be refreshed after changing targets_only)
		if (this.targetsOnly && !this.isTarget(hit.raw.imsi)) {
			return;
		}

		// If there are more than 2 hits, attempt trilateration using the most recent 15 hits as long as they are capable of forming a sufficient triangle
		if (this.displayedData[hit.raw.imsi].samples.length > 2) {
			// Check if the most recent 15 hits are capable of forming a triangle
			const temp_hit_data = this.displayedData[hit.raw.imsi].samples.slice(-15);

			const positions = [];
			for (let i = 0; i < temp_hit_data.length; i++) {
				// Only add positions with a valid RSSI value of -100 or greater
				//TODO: Sould be able to configure the RSSI threshold value
				if (temp_hit_data[i].rssi < -100) continue;

				// Add each position to an array in the format [lon, lat, rssi ]
				positions.push([
					this.displayedData[hit.raw.imsi].samples[i].lon,
					this.displayedData[hit.raw.imsi].samples[i].lat,
					this.displayedData[hit.raw.imsi].samples[i].rssi
				]);
			}

			// Check for sufficient positions after filtering out invalid RSSI values
			if (positions.length > 3) {
				// Ensuring that the most recent 15 hits are capable of forming a sufficiently large triangle
				if (this.#convexHullBestThree(positions)) {
					// Use trilateration to calculate all cross over points
					try {
						// Put all positions into the correct format [lon, lat, rssi, distance]
						for (let i = 0; i < positions.length; i++) {
							positions[i].push(this.#estimateDistance(positions[i][2]));
						}

						// Trilaterate the positions
						const centroid = this.#trilaterateGeneral(positions);

						// Clear the known location of the imsi
						this.clearKnownLocation(hit.raw.imsi);

						// Find the centroid of each polygon and add it to the map with a 50m buffe
						if (centroid.geometry.type == 'Polygon') {
							const temp_point = turf.centerOfMass(centroid);
							this.#addKnownLocation(
								hit.raw.imsi,
								temp_point.geometry.coordinates[1],
								temp_point.geometry.coordinates[0],
								0.05
							);
						} else if (centroid.geometry.type == 'MultiPolygon') {
							for (let i = 0; i < centroid.geometry.coordinates.length; i++) {
								const temp_point = turf.centerOfMass(
									turf.polygon(centroid.geometry.coordinates[i])
								);
								this.#addKnownLocation(
									hit.raw.imsi,
									temp_point.geometry.coordinates[1],
									temp_point.geometry.coordinates[0],
									0.05
								);
							}
						}
					} catch (err) {
						console.log(err);
					}
				}
			}
		}

		hitSample.maxDistance = this.#calculateMaxDistance(hit);

		const lat = hit.lat;
		const lon = hit.lon;

		const temp_point = turf.point([lon, lat]);

		if (hitSample.maxDistance == null) return;

		// Gather all keys of this.hexagon_lookup as a multipoint then check which points are within a buffer of the hit
		const temp_multipoint_buffer = turf.buffer(temp_point, hitSample.maxDistance + 0.085, {
			units: 'kilometers'
		});

		const temp_multipoint_within = turf.pointsWithinPolygon(
			this.hexMultipoint,
			temp_multipoint_buffer
		);

		// Loop through temp_multipoint_within and increase the intensity of each hexagon by the increment using the point property id
		// Try except statement for js
		try {
			for (const feature of temp_multipoint_within.features[0].geometry.coordinates) {
				// @ts-ignore
				const hexID = feature.properties.id;
				this.hexGrid.features[hexID].properties.intensity = Math.min(
					10,
					this.hexGrid.features[hexID].properties.intensity + this.increment
				);
			}
		} catch (err) {
			return;
		}
	}

	updateSource(map: mapboxgl.Map) {
		(map.getSource('hex-grid') as GeoJSONSource).setData(this.hexGrid);
		(map.getSource('flight-path') as GeoJSONSource).setData(this.flightPath);

		const droneLon =
			this.flightPath.geometry.coordinates[this.flightPath.geometry.coordinates.length - 1][0];
		const droneLat =
			this.flightPath.geometry.coordinates[this.flightPath.geometry.coordinates.length - 1][1];
		(map.getSource('drone-marker') as GeoJSONSource).setData(turf.point([droneLon, droneLat]));
	}

	// Function to retrieve the last point on the flight path
	getLastPoint() {
		return this.flightPath.geometry.coordinates[
			this.flightPath.geometry.coordinates.length - 1
		] as [number, number];
	}
}
