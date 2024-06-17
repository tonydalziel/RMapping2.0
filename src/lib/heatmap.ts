import * as turf from '@turf/turf';
import type { FeatureCollection, Polygon, Feature, LineString, Point, Position, GeoJsonProperties, MultiPoint, MultiPolygon } from 'geojson';
import type { CatchResults2g, CatchResults4g, CatchResults } from '$lib/classes/results';
import mapboxgl from 'mapbox-gl';
import type { GeoJSONSource } from 'mapbox-gl';
import drone from '$lib/assets/drone.png';
import device from '$lib/assets/device.png';

interface Sample2g extends CatchResults2g {
    distanceRange: Feature<Polygon|MultiPolygon, GeoJsonProperties>; // [min, max] distance range (km)
    distancePrediction: number; // Predicted distance (km)
    lat: number;
    lon: number;
    timingAdvance: number;
    rssi: number;
}

interface Sample4g extends CatchResults4g {
    distanceRange: Feature<Polygon|MultiPolygon, GeoJsonProperties>; // [min, max] distance range (km)
    distancePrediction: number; // Predicted distance (km)
    lat: number;
    lon: number;
    timingAdvance: number;
    rssi: number;
}

type Samples = Sample2g | Sample4g;

type IMSI = string;

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

interface DevicePrediction{
    intersection: Feature<Polygon | MultiPolygon, GeoJsonProperties>;
    area: number;
    imsi: string;
}

// A class to parse and display catch data using the mapbox map
export class MapData {
    // Store all currently displayed hits
    displayedData: Record<IMSI, Device>;

    grids: Record<string, [FeatureCollection<Polygon, {intensity: number, devices: Record<string,number>}>, Feature<Point>]>;
    filteredGrids: Record<string, [FeatureCollection<Polygon, {intensity: number, devices: Record<string,number>}>]>;
    gridSize: number; // Size of the grid (degrees)
    currentGridCoords: Feature<Point> | null; // Coordinates of the current grid
    gridLookUp: Feature<Point,GeoJsonProperties>[];
    gridMaxHeat: number = 10; // Maximum heat value for the grid
    gridMaxHeatTimeout: NodeJS.Timeout | null = null; // Timeout to update the grid max heat value

    triangleAreaThreshold: number = 10; // Smallest triangle area to be considered for trilateration (km^3)

    lastUpdate: Date | null; // Last time the flight path was updated
    flightPath: Feature<LineString>[]; // Flight path of the drone
    followPath: boolean; // Follow the path of the drone
    timeThreshold!: number; // Time threshold to start a new flight path (seconds)
    distanceThreshold!: number; // Distance threshold to start a new flight path (kilometers)

    devicePredictions: Record<string,Feature<Point, DevicePrediction>>;
    filteredDevicePredictions: Record<string,Feature<Point, DevicePrediction>>;

    filterRegex: RegExp[]; // Regex filter applied to imsi's before displaying the data (which IMSI's to show)

    constructor() {
        this.displayedData = {};
        this.lastUpdate = null;
        this.flightPath = [];
        this.followPath = false;
        this.grids = {};
        this.filteredGrids = {};
        this.currentGridCoords = null;

        this.timeThreshold = 5 * 60 ; // 5 minutes
        this.distanceThreshold = 1; // 1000 meters

        this.gridLookUp = [];

        this.gridSize = turf.lengthToDegrees(3, 'kilometers'); // 3km grid in degrees

        this.devicePredictions = {};
        this.filteredDevicePredictions = {};

        this.filterRegex = [];
    }

    // Function to update the filter
    updateFilter(filter: string[], map: mapboxgl.Map){
        this.filterRegex = filter.map((regex) => new RegExp(regex));

        if (this.filterRegex.length == 0){
            this.updateSource(map);
            return;
        };

        // Clear all current intersections from the map
        for (const imsi in this.devicePredictions){
            const intersectionId = `intersection-${imsi}`;

            if (map.getLayer(`heatmap-${intersectionId}`)){
                map.removeLayer(`heatmap-${intersectionId}`);
            }

            if (map.getSource(intersectionId)){
                map.removeSource(intersectionId);
            }
        }
        // Update the filtered device predictions
        this.filteredDevicePredictions = Object.fromEntries(Object.entries(this.devicePredictions).filter(([imsi, _]) => this.filterRegex.some((regex) => regex.test(imsi))));
        
        // Update the filtered grids by filtering the devices in the grid then updating the intesity values
        this.filteredGrids = {};

        for (const grid in this.grids){
            this.filteredGrids[grid] = [turf.featureCollection(this.grids[grid][0].features.map((feature) => {
                return turf.feature(feature.geometry, {intensity: 0, devices: Object.fromEntries(Object.entries(feature.properties.devices).filter(([imsi, _]) => this.filterRegex.some((regex) => regex.test(imsi))))});
            }))];

            this.filteredGrids[grid][0].features.forEach((feature) => {
                feature.properties.intensity = Object.values(feature.properties.devices).length > 0 ? Math.min(Math.max(...Object.values(feature.properties.devices)),10): 0;
            });
        }

        this.updateSource(map);
    }

    // Function to add an array of new hits
	addHits(data: CatchResults[]) {
		data.forEach(this.addHit.bind(this));
	}

    // Add a new hit to the displayed data
    addHit(hit: CatchResults){

        // Skip if the hit doesn't include lat, lon, or timing advance (required for mapping)
	    if (!hit.lat || !hit.lon || (hit.timingAdvance === undefined)) return;

        // Reject out of range lat / lon
        if (hit.lat < -90 || hit.lat > 90 || hit.lon < -180 || hit.lon > 180) return;

        // Re-assign hit to the Samples type (includes the max. distance property)
        const hitSample: Samples = hit as Samples;
        
        // Update the distance range (or create a polygon of size 0)
        hitSample.distanceRange = this.#updateIntensity(hitSample, hit.raw.imsi) ?? turf.polygon([[[hit.lon, hit.lat]]]);
    
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
				last_rssi: (hit.rssi ?? 0),
				hits: 1,
				samples: [hitSample],
				hexIds: []
			};
		}

        // Update the flight path
        this.#updateFlightPath(hit.lat, hit.lon, hit.time);

        // Update the relevant device prediction
        this.#updateDevicePredictions(hit.raw.imsi);
    }

    // Update the intensity of visible grid squares
    #updateIntensity(hit: Samples, imsi:string): Feature<Polygon|MultiPolygon, GeoJsonProperties> | null{
        const [minDistance, maxDistance] = this.#calculateDistanceRange(hit);

        let searchBuffer: Feature<Polygon|MultiPolygon, GeoJsonProperties> | null = turf.buffer(turf.point([hit.lon, hit.lat]), maxDistance/2, {
			units: 'kilometers'
		}) ?? null;

        if (!searchBuffer) return null;

        // If the min distance produces a ring greater than 10m, remove it from the search buffer
        if (minDistance/2 > 1e-3){
            const minSearchBuffer: Feature<Polygon|MultiPolygon, GeoJsonProperties> | undefined = turf.buffer(turf.point([hit.lon, hit.lat]), minDistance/2, {
                units: 'kilometers'
            });
            
            if (minSearchBuffer){
                searchBuffer = turf.difference(turf.featureCollection([searchBuffer, minSearchBuffer]))?? searchBuffer;
            }
        }

        const points = turf.pointsWithinPolygon(
			turf.featureCollection(this.gridLookUp),
			searchBuffer
		)
        
        points.features.forEach((point) => {
            if (point.properties){
                const gridId = point.properties.grid;
                const index = point.properties.index;

                try {
                    this.grids[gridId][0].features[index].properties.devices[imsi] ??= 0;
                    // 2G devices provide less accurate TA information therefore the intensity added lower
                    if (hit.network === 'Net2G'){
                        this.grids[gridId][0].features[index].properties.devices[imsi] += 0.1;
                    } else{
                        this.grids[gridId][0].features[index].properties.devices[imsi] += 0.5;
                    }

                    if (this.grids[gridId][0].features[index].properties.devices[imsi] > this.grids[gridId][0].features[index].properties.intensity){
                        this.grids[gridId][0].features[index].properties.intensity = Math.min(this.grids[gridId][0].features[index].properties.devices[imsi],10);
                    }

                    if (this.filterRegex.some((regex) => regex.test(imsi))){
                        this.filteredGrids[gridId][0].features[index].properties.devices[imsi] ??= 0;
                        if (hit.network === 'Net2G'){
                            this.filteredGrids[gridId][0].features[index].properties.devices[imsi] += 0.1;
                        } else{
                            this.filteredGrids[gridId][0].features[index].properties.devices[imsi] += 0.5;
                        }

                        if (this.filteredGrids[gridId][0].features[index].properties.devices[imsi] > this.filteredGrids[gridId][0].features[index].properties.intensity){
                            this.filteredGrids[gridId][0].features[index].properties.intensity = Math.min(this.filteredGrids[gridId][0].features[index].properties.devices[imsi],10);
                        }
                    }
                } catch(e) {
                    console.log(e);
                    // console.log('Error updating grid intensity');
                }
            }
        });

        return searchBuffer;
    }

    // Update device predictions
    #updateDevicePredictions(imsi:string){
        const intersection = this.#findIntersection(imsi);

        if (intersection){
            const point: Feature<Point, DevicePrediction> = turf.centerOfMass(intersection);

            point.properties = {intersection: intersection, area: turf.area(intersection), imsi: imsi};

            this.devicePredictions[imsi] = point;

            if (this.filterRegex.some((regex) => regex.test(imsi))){
                this.filteredDevicePredictions[imsi] = point;
            }
        }
    }

    // Update the prediction for a device
    #findIntersection(imsi: string): Feature<Polygon | MultiPolygon, GeoJsonProperties>  | null{
        // Check we have more than 3 hits
        if (this.displayedData[imsi].samples.length < 3) return null;

        // Initialise the intersection used to predict the device's location
        let intersection: Feature<Polygon | MultiPolygon, GeoJsonProperties> = this.displayedData[imsi].samples[this.displayedData[imsi].samples.length - 1].distanceRange;

        // Using the devices samples, use the most samples which form a large enough convex hull (not on a straight line) while still having an interesection
        for (let i = this.displayedData[imsi].samples.length - 2; i > 0; i--){

            const nextIntersection = turf.intersect(turf.featureCollection([intersection, this.displayedData[imsi].samples[i].distanceRange]));

            // If the next intersection is null and the previous samples used form a great enough convex hull, break
            if (nextIntersection === null && i <= this.displayedData[imsi].samples.length - 4){
                const convexHull = turf.convex(turf.featureCollection(this.displayedData[imsi].samples.slice(i).map((sample) => turf.point([sample.lon, sample.lat]))));
                if (convexHull && turf.area(convexHull) > this.triangleAreaThreshold){
                    return intersection;
                } else {
                    return null;
                }
            } else if (nextIntersection !== null){
                intersection = nextIntersection;
            } else {
                return null;
            }
        }

        return null;
    }

    // Timing advance -> Distance Range
    #calculateDistanceRange(hit: Samples): [number,number]{
        const speedOfLight = 299792458;
        if (hit.network === 'Net2G'){
            const unit = 3.69 * (10 ** -6);
            const totalTime = unit * hit.timingAdvance;
            return [(totalTime*speedOfLight)/2000, ((unit*(hit.timingAdvance+1))*speedOfLight)/2000]
        } else if (hit.network === 'Net4G'){
            const unit = 16 * 1/(15000*2048);
            const totalTime = unit * hit.timingAdvance;
            return [(totalTime*speedOfLight)/2000, ((unit*(hit.timingAdvance+1))*speedOfLight)/2000]
        } else {
            return [0,0]
        }
    }

    // Snap a coordinate to the nearest grid
    #snapToGrid(coord:number, size:number) {
        return Math.floor(coord / size) * size;
    }

    // Initialise a new hex grid
    #initialiseGrid(lat: number, lon: number){
        // Create a 3km hex grid around the hit location
        const minLon = this.#snapToGrid(lon, this.gridSize);
        const minLat = this.#snapToGrid(lat, this.gridSize);
        const maxLon = minLon + this.gridSize;
        const maxLat = minLat + this.gridSize;

        // Generate a unique hex grid id
        const gridId = `grid-${minLon.toFixed(4)}-${minLat.toFixed(4)}`;

        const bbox: [number,number,number,number] = [minLon, minLat, maxLon, maxLat];

        // Create a hexagonal grid that covers the buffer
		this.grids[gridId] = [turf.squareGrid(bbox, 0.02, {
			units: 'kilometers',
			properties: { intensity: 0, devices: {} }
		}), turf.point([minLon, minLat])];

        this.filteredGrids[gridId] = [turf.squareGrid(bbox, 0.02, {
			units: 'kilometers',
			properties: { intensity: 0, devices: {} }
		})];

        this.currentGridCoords = this.grids[gridId][1];

        const midPoints: Feature<Point,GeoJsonProperties>[] = this.grids[gridId][0].features.map((feature, index) => {
            const centrePoint = turf.centroid(feature);
            centrePoint.properties = {grid: gridId, index: index};
            return centrePoint;
        });

        this.gridLookUp = this.gridLookUp.concat(midPoints);

        // By defauly all grid square's properties point to the same object. Reassign the properties to a new object.
        this.grids[gridId][0].features = this.grids[gridId][0].features.map((feature) => {
            return turf.feature(feature.geometry, {intensity: 0, devices: {}});
        });

        // Update the filtered grids
        this.filteredGrids[gridId][0].features = this.grids[gridId][0].features.map((feature) => {
            return turf.feature(feature.geometry, {intensity: 0, devices: {}});
        });
    }

    // Update the drones path using the most recent lat, lon coordinates, then update the grids if necessary
    #updateFlightPath(lat: number, lon: number, time: Date){

        // If the last update was null, set the flight path to the new coordinates
        // Otherwise, if the lastUpdate is beyond the threshold, create a new lineString or the distance between the last point and latest point is greater than the threshold
        if (this.lastUpdate === null || this.flightPath.length === 0){
            this.flightPath = [turf.lineString([[lon, lat], [lon, lat]], {name: `flight-path-${new Date().getSeconds()}`})];
            this.lastUpdate = time;
        } else if (time.getTime() - this.lastUpdate.getTime() > this.timeThreshold * 1000 || turf.distance(this.flightPath[this.flightPath.length - 1].geometry.coordinates[this.flightPath[this.flightPath.length - 1].geometry.coordinates.length - 1], [lon, lat], {units: 'kilometers'}) > this.distanceThreshold){
            this.flightPath.push(turf.lineString([[lon, lat], [lon, lat]], {name: `flight-path-${new Date().getSeconds()}`}));
            this.lastUpdate = time;
        } else {
            this.flightPath[this.flightPath.length-1].geometry.coordinates.push([lon, lat]);
            this.lastUpdate = time;
        }

        if (Object.keys(this.grids).length === 0 || this.currentGridCoords === null){
            this.#initialiseGrid(lat, lon);
        } else {
            // If the new lat,lon isn't inside the current bounding box, check all other bounding boxes.
            // If the new lat,lon is inside a bounding box, update the current bounding box to this one
            // If it isn't inside any bounding box, create a new grid that is in line with the previous bounding box
            const point = turf.point([this.#snapToGrid(lon, this.gridSize), this.#snapToGrid(lat, this.gridSize)]);
            let found = false;

            // Check if the new point snaps to the current grid bbox
            if (
                turf.distance(point, this.currentGridCoords, {units: 'degrees'}) > (this.gridSize / 3)
            ){
                for (const grid in this.grids){
                    if (turf.distance(point, this.grids[grid][1], {units: 'degrees'}) < (this.gridSize / 3)){
                        found = true;
                        this.currentGridCoords = this.grids[grid][1];
                        break;
                    }
                } 
                if(!found){
                    this.#initialiseGrid(lat, lon);
                }
            }
        }
    }

    // Check and add the source / layer to display flight path
    #addFlightPathToMap(map: mapboxgl.Map, layers: string[], sources: string[], style: string|null = null){
        for (const path of this.flightPath){
            const pathName = path.properties?.name;

            if (!sources.includes(pathName)){
                map.addSource(pathName, {
                    type: 'geojson',
                    lineMetrics: true,
                    data: path
                });
            }

            if (!layers.includes(`heatmap-${pathName}`)) {
                map.addLayer({
                    id: `heatmap-${pathName}`,
                    type: 'line',
                    source: pathName,
                    paint: {
                        'line-color': style == 'Mapbox Outdoors' || style == null ? '#1a0aa6' : '#00e1ff',
                        'line-width': 3,
                        'line-gradient': [
                            'interpolate',
                            ['linear'],
                            ['line-progress'],
                            0,
                            'transparent',
                            0.2,
                            style == 'Mapbox Outdoors' || style == null ? '#1a0aa6' : '#00e1ff',
                        ]
                    },
                    layout: {
                        'line-cap': 'round',
                        'line-join': 'round'
                    }
                });
            }

        }
    }

    // Check and add the source / layer to display the drone icon
    #addDroneIconToMap(map: mapboxgl.Map, layers: string[], sources: string[]){
        if (!sources.includes('drone-marker')) {
			map.addSource('drone-marker', {
				type: 'geojson',
                data: turf.point([0, 0])
			});
		}

        if (!layers.includes('heatmap-drone-marker')) {

            if(!map.hasImage('drone'))
                map.loadImage(drone, (error, image) => {
                    if (!error && image) map.addImage('drone', image);
                });
            
			map.addLayer({
				id: 'heatmap-drone-marker',
				source: 'drone-marker',
				type: 'symbol',
				layout: {
					'icon-image': 'drone',
					'icon-size': 0.1,
					'icon-allow-overlap': true,
					'icon-ignore-placement': true
				}
			});
		}
    }

    // Check and add the source / layer to display the device prediction icons
    #addDevicePredictionsToMap(map: mapboxgl.Map, layers: string[], sources: string[]){
        if(!map.hasImage('device'))
            map.loadImage(device, (error, image) => {
                if (!error && image) map.addImage('device', image);
            });

        if (!sources.includes('device-predictions')) {
            map.addSource('device-predictions', {
                type: 'geojson',
                data: turf.featureCollection(Object.values(this.devicePredictions))
            });
        }

        if (!layers.includes('heatmap-device-predictions')) {

            map.addLayer({
                id: 'heatmap-device-predictions',
                source: 'device-predictions',
                type: 'symbol',
                layout: {
                    'icon-image': 'device',
                    'icon-size': 0.05,
                    'icon-allow-overlap': true,
                },
                paint: {
                    'icon-opacity': [
                        'interpolate',
                        ['linear'],
                        ['get', 'area'],
                        0,
                        1,
                        10,
                        1,
                        100,
                        0.2
                    ],
                }
            });
        }

        // Add a layer to visualise the intersection
        for (const imsi in this.devicePredictions){
            const intersection = this.devicePredictions[imsi].properties?.intersection;

            if (this.filterRegex.length > 0 && !this.filterRegex.some((regex) => regex.test(imsi))) continue;

            if (intersection){
                const intersectionId = `intersection-${imsi}`;

                if (!sources.includes(intersectionId)){
                    map.addSource(intersectionId, {
                        type: 'geojson',
                        data: intersection
                    });
                }

                if (!layers.includes(`heatmap-${intersectionId}`)){
                    map.addLayer({
                        id: `heatmap-${intersectionId}`,
                        source: intersectionId,
                        layout: {
                            visibility: 'none'
                        },
                        type: 'fill',
                        paint: {
                            'fill-color': 'red',
                            'fill-opacity': 0.5
                        }
                    });
                }
            }
        }
    }

    initialiseEventHandlers(map:mapboxgl.Map){
        map.on('click', 'heatmap-device-predictions', (e) => {
            const imsi = e.features?.[0].properties?.imsi;
            
            // Fetch the insersection layer for this imsi and set visibility to visible if found
            if (map.getLayer(`heatmap-intersection-${imsi}`)){
                // If the intersection is already visible, hide it
                if (map.getLayoutProperty(`heatmap-intersection-${imsi}`, 'visibility') == 'visible'){
                    map.setLayoutProperty(`heatmap-intersection-${imsi}`, 'visibility', 'none');
                } else {
                    map.setLayoutProperty(`heatmap-intersection-${imsi}`, 'visibility', 'visible');
                }
            }
        });


        // Change the cursor to a pointer when the mouse is over the places layer.
        map.on('mouseenter', 'heatmap-device-predictions', () => {
            map.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
        map.on('mouseleave', 'heatmap-device-predictions', () => {
            map.getCanvas().style.cursor = '';
        });
    }

    // Check and add the source / layer to display the grid
    #addGridToMap(map: mapboxgl.Map, layers: string[], sources: string[]){
        for (const grid in this.grids){
            if (!sources.includes(grid)) {
                map.addSource(grid, {
                    type: 'geojson',
                    data: this.grids[grid][0]
                });
            }

            if (!layers.includes(`heatmap-${grid}-grid`)){
                map.addLayer({
                    id: `heatmap-${grid}-grid`,
                    type: 'fill',
                    source: grid,
                    paint: {
                        'fill-color': [
                            'interpolate',
                            ['linear'],
                            ['get', 'intensity'],
                            0,
                            'transparent',
                            1,
                            '#fff33b',
                            this.gridMaxHeat,
                            '#e93e3a'
                        ],
                        'fill-opacity': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0.2, 10, 0.7],
                    }
                });
            }
        }
    }

    // Update the map's camera to either track or stop tracking the drone
    snapToDrone(map: mapboxgl.Map){
        this.followPath = !this.followPath;
        
        if(this.followPath)
            this.updateSource(map);

        return this.followPath;
    }

    // Check and add all required source / layers
    checkLayers(map: mapboxgl.Map, style: string|null = null){
        const layers = map.getStyle().layers.map(layer => layer.id);
        const sources = Object.keys(map.getStyle().sources);

        if (this.flightPath){
            this.#addFlightPathToMap(map, layers, sources, style);
            this.#addDroneIconToMap(map, layers, sources);
        }
        if (Object.keys(this.grids).length > 0){
            this.#addGridToMap(map, layers, sources);
        }
        if (Object.keys(this.displayedData).length > 0){
            this.#addDevicePredictionsToMap(map, layers, sources);
        }
    }

    // Remove all heatmap-layers / sources from the map
    removeLayers(map: mapboxgl.Map){
        for (const grid in this.grids){
            if (map.getLayer(`heatmap-${grid}-grid`) !== undefined){
                map.removeLayer(`heatmap-${grid}-grid`);
            }
            if (map.getSource(grid) !== undefined){
                map.removeSource(grid);
            }
        }

        for (const path of this.flightPath){
            if (map.getLayer(`heatmap-${path.properties?.name}`) !== undefined){
                map.removeLayer(`heatmap-${path.properties?.name}`);
            }
            if (map.getSource(path.properties?.name) !== undefined){
                map.removeSource(path.properties?.name);
            }
        }

        if (map.getLayer('heatmap-drone-marker') !== undefined){
            map.removeLayer('heatmap-drone-marker');
        }
        if (map.getSource('drone-marker') !== undefined){
            map.removeSource('drone-marker');
        }

        if (map.getLayer('heatmap-device-predictions') !== undefined){
            map.removeLayer('heatmap-device-predictions');
        }
        if (map.getSource('device-predictions') !== undefined){
            map.removeSource('device-predictions');
        }

        for (const imsi in this.devicePredictions){
            const intersectionId = `intersection-${imsi}`;

            if (map.getLayer(`heatmap-${intersectionId}`)){
                map.removeLayer(`heatmap-${intersectionId}`);
            }

            if (map.getSource(intersectionId)){
                map.removeSource(intersectionId);
            }
        }
    }

    // Update gridMaxHeat: change the number and remove all grid layers then re-add them
    updateGridMaxHeat(map: mapboxgl.Map, value: number){
        this.gridMaxHeat = value;

        if (this.gridMaxHeatTimeout !== null) {
            clearTimeout(this.gridMaxHeatTimeout);
            this.gridMaxHeatTimeout = null;
        }

        if(map.isStyleLoaded()){
            for (const grid in this.grids){
                if (map.getLayer(`heatmap-${grid}-grid`) !== undefined){
                    map.removeLayer(`heatmap-${grid}-grid`);
                }
            }
            this.#addGridToMap(map, map.getStyle().layers.map(layer => layer.id), Object.keys(map.getStyle().sources));
        } else {
            // Set timeout and try this function again
            this.gridMaxHeatTimeout = setTimeout(() => {
                    this.gridMaxHeatTimeout = null;
                    this.updateGridMaxHeat(map, value);
                }, 1000);
        }
    }
    
    // Update the map's source with the new data
    updateSource(map: mapboxgl.Map){
        if (!map.isStyleLoaded()) return;
        const layers = map.getStyle().layers.map(layer => layer.id);
        const sources = Object.keys(map.getStyle().sources);

        // Add the flight path data
        if (this.flightPath.length > 0){
            try {
                for (const path of this.flightPath){
                    (map.getSource(path.properties?.name) as GeoJSONSource).setData(path);
                }
            } catch {
                this.#addFlightPathToMap(map, layers, sources);
            }

            const lastPoint: Position = this.flightPath[this.flightPath.length - 1].geometry.coordinates[this.flightPath[this.flightPath.length - 1].geometry.coordinates.length - 1];
            
            // Update the drone icon's position
            try {
                (map.getSource('drone-marker') as GeoJSONSource).setData(turf.point(lastPoint));
            } catch {
                this.#addDroneIconToMap(map, layers, sources);
            }

            // Track the drone if the followPath flag is set
            if(this.followPath && lastPoint.length >= 2)
                map.easeTo({
                    center: [lastPoint[0], lastPoint[1]],
                    zoom: 15,
                });
        }

        // Add the hex grid data
        try {
            for (const grid in this.grids){
                if (this.filterRegex.length > 0){
                    (map.getSource(grid) as GeoJSONSource).setData(this.filteredGrids[grid][0]);
                } else {
                    (map.getSource(grid) as GeoJSONSource).setData(this.grids[grid][0]);
                }
            }
        } catch {
            this.#addGridToMap(map, layers, sources);
        }

        // Update the device predictions
        try {
            if (this.filterRegex.length > 0){
                (map.getSource('device-predictions') as GeoJSONSource).setData(turf.featureCollection(Object.values(this.filteredDevicePredictions)));
                // Show the intersection if it exists
                for (const imsi in this.filteredDevicePredictions){
                    const intersection = this.filteredDevicePredictions[imsi].properties?.intersection;

                    if (intersection){
                        const intersectionId = `intersection-${imsi}`;

                        try {
                            (map.getSource(intersectionId) as GeoJSONSource).setData(intersection);
                        } catch {
                            this.#addDevicePredictionsToMap(map, layers, sources);
                        }
                    }
                }
            } else {
                (map.getSource('device-predictions') as GeoJSONSource).setData(turf.featureCollection(Object.values(this.devicePredictions)));
                // Show the intersection if it exists
                for (const imsi in this.devicePredictions){
                    const intersection = this.devicePredictions[imsi].properties?.intersection;

                    if (intersection){
                        const intersectionId = `intersection-${imsi}`;

                        try {
                            (map.getSource(intersectionId) as GeoJSONSource).setData(intersection);
                        } catch {
                            this.#addDevicePredictionsToMap(map, layers, sources);
                        }
                    }
                }
            }
        } catch {
            this.#addDevicePredictionsToMap(map, layers, sources);
        }
    }
}