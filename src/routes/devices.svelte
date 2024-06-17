<script lang="ts">
    import type { MapData } from "$lib/heatmap";

    export let mapData: MapData;
    export let map: mapboxgl.Map;

    let filter: string[] = [];
    
    function toggleDevice(imsi: string) {
        if (mapData.filterRegex.map((regex)=>regex.source).includes(imsi)){
            mapData.filterRegex = mapData.filterRegex.filter((regex)=>regex.source !== imsi);
        } else {
            mapData.filterRegex.push(new RegExp(imsi));
        }
        mapData = mapData;
        filter = mapData.filterRegex.map((regex)=>regex.source);
        mapData.updateFilter(filter,map);
    }
</script>

<div class="flex justify-between p-2 items-start flex-wrap w-full">
    <h1 class="text-lg font-bold text-slate-900 mx-3">Devices</h1>
</div>
<hr class="border-slate-400 w-full" />
{#each Object.keys(mapData.displayedData) as imsi}
    <button class="flex justify-center p-2 items-start"
    on:click={()=>toggleDevice(imsi)}>
        <div class="w-4 h-4 {filter.includes(imsi)? 'bg-slate-900': ''} border-2 border-slate-900 rounded-full mr-1 my-auto"></div>
        <p class="text-slate-900 ml-1 text-left capitalize text-sm">{imsi}</p>
    </button>
    <hr class="border-slate-400" />
{/each}