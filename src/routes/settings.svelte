<script lang="ts">

    import { slide } from "svelte/transition";
    import { createEventDispatcher, onMount } from "svelte";
    import Icon from "@iconify/svelte";
    import { open } from '@tauri-apps/api/dialog';
    import { invoke } from '@tauri-apps/api/tauri';

    const dispatch = createEventDispatcher();

    export let settingsMaxHeat: number;
    export let handleHeatmapChange: (value: number) => void;

    let tiles: string[] = [];
    let fonts: string[] = [];

    async function newMbtile() {
        const filePath = await open();
        if (filePath) {
            invoke("upload_mbtile", { file: filePath }).then((res) => {
                if (res) {
                    updateOfflineStyle();
                }
            });
        }
    }

    async function removeMbtile(layer: string) {
        invoke("remove_mbtile", { layer }).then((res) => {
            if (res) {
                updateOfflineStyle();
            }
        }).catch((err) => {
            console.error(err);
        });
    }

    function updateTiles(){
        invoke("catalog_tiles").then((res) => {
            if (res)
                tiles = res as string[];
        });
    }

    function updateFonts(){
        invoke("catalog_fonts").then((res) => {
            if (res)
                fonts = res as string[];
        });
    }

    function updateOfflineStyle() {
        updateTiles();
        updateFonts();
        dispatch("styleUpdate");
    }

    onMount(() => {
        updateOfflineStyle();
    });
</script>


<div class="absolute top-0 left-0 w-full h-full z-50 bg-gray-200/60 backdrop-blur-md flex justify-end items-stretch">
    <button class="grow min-w-0 bg-transparent" on:click={()=>{dispatch("close")}}></button>
    <div class="bg-slate-300 max-w-[80%] h-full min-w-0 rounded-l-md shadow-inner text-left p-3" in:slide={{axis: "x", duration: 500}} out:slide={{axis: "x", duration:500}}>
        <h2 class="text-2xl">Settings</h2>

        <div class="my-2">
            <hr class="!border-t-2" />

            <h3 class="text-xl">Offline Mapping</h3>
            <div class="card m-2 p-2 min-w-96">
                <div class="flex justify-between items-center border-t-2 border-t-slate-600">
                    <h4 class="text-lg">Tile Sets:</h4>
                    <button on:click={newMbtile}>
                        <Icon icon="carbon:upload" class="w-4 h-4" />
                    </button>
                </div>
                {#each tiles as tile}
                    <div class="flex justify-between items-center border-t-2">
                        <p>{tile}</p>
                        <button on:click={()=>removeMbtile(tile)}>
                            <Icon icon="ph:trash" class="w-4 h-4" />
                        </button>
                    </div>
                {/each}

                <div class="flex justify-between items-center border-t-2 border-t-slate-600">
                    <h4 class="text-lg">Fonts:</h4>
                </div>
                {#each fonts as font}
                    <div class="flex justify-between items-center border-t-2">
                        <p>{font}</p>
                    </div>
                {/each}
            </div>
        </div>

        <!--Slider between 1 and 10 for the gridMaxHeat-->
        <div class="my-3">
            <hr class="!border-t-2" />

            <h4 class="text-lg">Heatmap Maximum Intensity:</h4>
            <p>Decrease this value to increase the visibility of the heatmap</p>
            <input type="range" class="input min-w-56" min="2" max="10" bind:value={settingsMaxHeat} on:change={(e)=>handleHeatmapChange(
                settingsMaxHeat
            )}/>
        </div>

        <!-- <div class="my-3">
            <hr class="!border-t-2" />

            <h4 class="text-lg">Mapbox Access Token:</h4>
            <input type="text" class="input min-w-56" placeholder="Mapbox Access Token" />
        </div> -->
    </div>
</div>