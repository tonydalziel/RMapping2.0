<script lang="ts">
    import DroneIcon from '$lib/icons/drone.svelte';
    import SimIcon from '$lib/icons/sim.svelte';
    import LayersIcon from '$lib/icons/layers.svelte';
    import SettingsAdjust from '$lib/icons/settings-adjust.svelte';

    import mapboxgl from 'mapbox-gl';
    import { onMount } from 'svelte';
    import "mapbox-gl-style-switcher/styles.css";
    import { MapData } from '$lib/heatmap';
    import Settings from './settings.svelte';
    import StyleSwitcher from './style-switcher.svelte';
    import LayerToggle from './layers.svelte';
    import Filter from './filter.svelte';
    import Upload from './upload.svelte';
    import Devices from './devices.svelte';
    import type { CatchResults2g, CatchResults4g } from '$lib/classes/results';

    mapboxgl.accessToken = 'pk.eyJ1IjoiYmJlbGF5cyIsImEiOiJjbGs4bzVkY24wZWt5M2Z0NWFkYnV2N2x1In0.N_FPfrH_aFZltA5bRr7cAw';

    let mapData = new MapData();
    let map: mapboxgl.Map;
    let snapToDrone = false;
    let settingsOpen = false;
    let layersOpen = false;
    let devicesOpen = false;
    let handleStyleChange: () => void;
    let currentData: (CatchResults2g|CatchResults4g)[] = [];

    const handleHeatmapChange = (value: number) => {
        if (map != undefined){
            mapData.updateGridMaxHeat(map, value);
        }  
    };

    const handleFilterUpdate = (filters: string[]) => {
        if (map != undefined)
            mapData.updateFilter(filters, map);
    };

    const newUpload = () => {
        if (map != undefined){
            mapData.removeLayers(map);
            mapData = new MapData();

            if (map.loaded()){
                let index = 0;
                const interval = setInterval(() => {
                    // Continually add data to the heatmap then update the source every 1 second
                    // When the end of the data is reached, start over clearing the current data
                    if (index >= 10) {
                        index = 0;
                        clearInterval(interval);
                    }

                    mapData.addHit(currentData[index]);

                    try {
                        mapData.updateSource(map);
                    } catch (e) {
                        mapData.checkLayers(map);
                    }

                    index++;
                }, 5);
            } else {
                setTimeout(newUpload, 500);
            }
        }
    }

    onMount(() => {
        map = new mapboxgl.Map({
            container: 'map',
            center: [-2.223102,51.694995], // starting position [lng, lat]
            zoom: 14, // starting zoom
            maxZoom: 16,
			pitch: 0,
			attributionControl: false
        });

        // Add a scale control to the map.
        map.addControl(new mapboxgl.ScaleControl());

        // Add zoom and rotation controls to the map.
        const nav = new mapboxgl.NavigationControl();
        map.addControl(nav, 'top-left');

        mapData.initialiseEventHandlers(map);

        // On style load, check the layers and update the source
        map.on('style.load', ()=>{
            const style = map.getStyle().name;
            mapData.checkLayers(map, style);
        });

        // Disable follow path on user interaction
        map.on('mousedown', () => {
            mapData.followPath = false;
            snapToDrone = false;
        });
    });
</script>

<div class="flex items-stretch w-full h-screen transition-all">
    <div class="{layersOpen? 'max-w-xs': 'max-w-0'} transition-all duration-500 bg-slate-300 shadow-inner rounded-r-md overflow-y-auto overflow-x-hidden">
        <LayerToggle map={map}/>
    </div>
    <div class="{devicesOpen? 'max-w-xs': 'max-w-0'} transition-all duration-500 bg-slate-300 shadow-inner rounded-r-md overflow-y-auto overflow-x-hidden">
        {#if map !== undefined}
            <Devices bind:mapData={mapData} map={map}/>
        {/if}
    </div>
    <div class="grow px-14 my-auto">
        <div class="flex justify-between items-center">
            {#if map !== undefined}
                <Filter filters={mapData.filterRegex.map((regex)=> regex.source)} handleFilterUpdate={handleFilterUpdate}/>

                {#if mapData.lastUpdate !== null}
                    <p>Last Updated: {mapData.lastUpdate.toLocaleTimeString()}</p>
                {:else}
                    <p>Loading...</p>
                {/if}
            {/if}
        </div>
        <div class="relative w-full h-[80vh] overflow-hidden rounded-md shadow-md">
            <StyleSwitcher map={map} bind:handleStyleChange={handleStyleChange}/>
            <div id="map" class="w-full h-full"></div>
        </div>
        <div class="flex">
            {#if map !== undefined}
                <button class="py-1 px-4 h-10 w-20 m-2 shadow-md rounded-md hover:scale-105 transition-all"
                class:bg-blue-100={snapToDrone}
                class:bg-blue-200={!snapToDrone}
                class:border-2={snapToDrone}
                class:border-blue-700={snapToDrone}
                on:click={()=>{snapToDrone = mapData.snapToDrone(map)}}>
                    <DroneIcon svgClasses={["h-full mx-auto py-1"]}/>
                </button>
    
                <button class="py-1 px-4 h-10 w-20 m-2 rounded-md shadow-md hover:scale-105 transition-all bg-blue-200"
                on:click={()=>{devicesOpen = !devicesOpen}}>
                    <SimIcon svgClasses={["h-full mx-auto py-1"]}/>
                </button>

                <button class="py-1 px-4 h-10 w-20 m-2 rounded-md shadow-md hover:scale-105 transition-all bg-blue-200"
                on:click={()=>{layersOpen = !layersOpen}}>
                    <LayersIcon svgClasses={["h-full mx-auto py-1"]}/>
                </button>

                <button class="py-1 px-4 h-10 w-20 m-2 rounded-md shadow-md hover:scale-105 transition-all bg-blue-200"
                on:click={()=>{settingsOpen = true}}>
                    <SettingsAdjust svgClasses={["h-full mx-auto py-1"]}/>
                </button>

                <Upload bind:currentData={currentData} on:newUpload={newUpload}/>
            {/if}
        </div>
    </div>
</div>

{#if settingsOpen}
    <Settings on:close={()=>{settingsOpen = false}} on:styleUpdate={handleStyleChange} settingsMaxHeat={mapData.gridMaxHeat} handleHeatmapChange={handleHeatmapChange}/>
{/if}