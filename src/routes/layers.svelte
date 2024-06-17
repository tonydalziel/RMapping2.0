<script lang="ts">
    import Icon from "@iconify/svelte";
    import type mapboxgl from "mapbox-gl";

    export let map: mapboxgl.Map;

    let layers: {name: string, visible: boolean, id:string}[] = [];

    function updateLayers(){
        if (map.isStyleLoaded()){
            layers = map.getStyle().layers.filter((layer) => layer.id.includes("heatmap")).map((layer) => {
                // If the layer contains the name "grid", return the layer name and visibility
                if (layer.id.includes("grid")) {
                    return {
                        name: "Heatmap",
                        id: layer.id,
                        visible: map.getLayoutProperty(layer.id, 'visibility') !== 'none'
                    };
                }
                return {
                    name: layer.id.replaceAll("heatmap-","").replaceAll("-"," "),
                    id: layer.id,
                    visible: map.getLayoutProperty(layer.id, 'visibility') !== 'none'
                };
            });
        } else {
            setTimeout(updateLayers, 500);
        }
    }

    function toggleLayer(layer: {name: string, visible: boolean, id:string}){
        if (layer.visible) {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
        } else {
            map.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
        updateLayers();
    }

    $: if (map) {
        map.on('styledata', updateLayers);
    }
</script>

<div class="flex justify-between p-2 items-start flex-wrap w-full">
    <h1 class="text-lg font-bold text-slate-900 ml-3">Layers</h1>
    <button class="p-1 mx-3 bg-slate-400 text-slate-900 rounded-md hover:bg-slate-500 transition-all duration-200"
    on:click={updateLayers}>
        <Icon icon="material-symbols:refresh" class="w-4 h-4" />
    </button>
</div>
<hr class="border-slate-400 w-full" />
{#each layers as layer}
    <button class="flex justify-center p-2 items-start"
    on:click={()=>toggleLayer(layer)}>
        <div class="w-4 h-4 {layer.visible? 'bg-slate-900': ''} border-2 border-slate-900 rounded-full mr-1 my-auto"></div>
        <p class="text-slate-900 ml-1 text-left capitalize text-sm">{layer.name}</p>
    </button>
    <hr class="border-slate-400" />
{/each}