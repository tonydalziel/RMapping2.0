<script lang="ts">
    import { InputChip } from '@skeletonlabs/skeleton';
    export let handleFilterUpdate: (filters: string[]) => void;
    export let filters: string[] = [];

    const isRegex = (value: string) => {
        try {
            new RegExp(value);
            return true;
        } catch (e) {
            return false;
        }
    };
</script>

<div class="w-full my-3 mx-2 max-w-xl">
    <InputChip bind:value={filters} name="chips" placeholder="IMSI Filter (wildcards allowed)" on:add={()=>handleFilterUpdate(filters)} on:remove={()=>handleFilterUpdate(filters)}
        validation={isRegex}/>
</div>