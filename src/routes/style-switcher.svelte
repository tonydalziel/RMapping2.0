<script lang="ts">
    import Icon from "@iconify/svelte";
    import type mapboxgl from "mapbox-gl";
    import { invoke } from '@tauri-apps/api/tauri';

    import basicOffline from "$lib/assets/styles/basic.json";
    import grayscaleOffline from "$lib/assets/styles/gray.json";

    export let map: mapboxgl.Map;

    let open = false;

    const styles: any[] = [
        {
            title: "Light",
            uri: "mapbox://styles/mapbox/outdoors-v12"
        },
        {
            title: "Dark",
            uri: "mapbox://styles/mapbox/navigation-night-v1"
        },
        {
            title: "Satellite",
            uri: "mapbox://styles/mapbox/satellite-streets-v12"
        }
    ];


    export const handleStyleChange = () =>{
        invoke("catalog_tiles").then((res) => {
            if (res) {
                const tiles = res as string[];

                if (tiles.length > 0){

                    invoke("get_address").then((res) => {
                        if (res) {
                            // Replace everything before : with localhost
                            res = (res as string).replace(/.*:/, "localhost:");

                            let basicOfflineStyle = basicOffline;

                            basicOfflineStyle.sources["openmaptiles"].tiles = tiles.map((tile) => {
                                return `http://${res}/${tile}/{z}/{x}/{y}`;
                            });

                            
                            basicOfflineStyle.glyphs = `http://${res}/font/{fontstack}/{range}`;
                            
                            // If "Standard Offline" is available, push the change otherwise push it
                            let index = styles.findIndex((style) => style.title === "Standard Offline");
                            if (index !== -1){
                                styles[index] = {
                                    title: "Standard Offline",
                                    uri: basicOfflineStyle
                                };
                            } else {
                                styles.push({
                                    title: "Standard Offline",
                                    uri: basicOfflineStyle
                                });
                            }

                            let grayscaleOfflineStyle = grayscaleOffline;

                            grayscaleOfflineStyle.sources["openmaptiles"].tiles = tiles.map((tile) => {
                                return `http://${res}/${tile}/{z}/{x}/{y}`;
                            });
                            grayscaleOfflineStyle.glyphs = `http://${res}/font/{fontstack}/{range}`;
                            
                            // If "Grayscale Offline" is available, push the change otherwise push it
                            index = styles.findIndex((style) => style.title === "Grayscale Offline");
                            if (index !== -1){
                                styles[index] = {
                                    title: "Grayscale Offline",
                                    uri: grayscaleOfflineStyle
                                };
                            } else {
                                styles.push({
                                    title: "Grayscale Offline",
                                    uri: grayscaleOfflineStyle
                                });
                            }
                        }
                    });
                }
            }
        });
    }

    const handleClick = (e: MouseEvent) => {
        e.stopPropagation();
        open = !open;
    };
</script>

<svelte:window on:click={()=>open=false} />

<div class="absolute top-0 right-0 m-3 z-20 bg-transparent">
    {#if !open}
        <button class="aspect-square p-1 flex justify-center items-center rounded-md shadow-md bg-[#f5f5f5] border-blue-700 border-2"
        on:click={handleClick}>
            <Icon icon="bi:layers" class="w-6 h-6" />
        </button>
    {:else}
        <div class="w-fit bg-[#f5f5f5] border-blue-700 border-2">
            {#each styles as style}
                <button class="block p-1"
                on:click={()=>{map.setStyle(style.uri);}}>
                    {style.title}
                </button>
                <hr class="border-t-2 border-blue-700" />
            {/each}
        </div>
    {/if}
</div>