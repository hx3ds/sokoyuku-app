<script lang="ts">
    import { onMount } from 'svelte';
    import { fetchPrototypes } from '../../proxy/prototype.js';
    import PageContainer from '../../components/PageContainer.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    import InfoStackInput from '../../components/InfoStack/InfoStackInput.svelte';
    import AddToModelButton from '../../components/Button/AddToModelButton.svelte';
    import Loading from '../../components/Loading.svelte';
    import NotFound from '../../components/NotFound.svelte';

    type PrototypeSummary = {
        prototype_id: number;
        username: string;
        name: string;
        description?: string | null;
        certified?: boolean;
    };

    let prototypes = $state<PrototypeSummary[]>([]);
    let loading = $state(true);
    let searchText = $state('');
    let searchTimeout: ReturnType<typeof setTimeout> | undefined;

    onMount(async () => {
        await loadPrototypes();
    });

    async function loadPrototypes() {
        loading = true;
        const res = await fetchPrototypes({
            query: searchText,
            offset: 0,
            limit: 20
        }) as any;
        
        if (res.result === 0) {
            prototypes = (res.data?.prototypes || []) as PrototypeSummary[];
        } else {
            prototypes = [];
        }
        loading = false;
    }

    function handleSearchInput(e: Event) {
        const target = e.target as HTMLInputElement | null;
        searchText = target?.value ?? '';
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            void loadPrototypes();
        }, 300);
    }
</script>

<PageContainer id="page-explore">
    <InfoStack 
        id="exploreStack"
    >
        <div style="border-bottom: 1px solid #e1e4e8; margin-bottom: 0.5rem;">
            <InfoStackInput 
                type="text" 
                placeholder="Search prototypes..." 
                bind:value={searchText}
                oninput={handleSearchInput}
                inputClass="search-input"
            >
                {#snippet end()}
                    <svg style="width: 1rem; height: 1rem; color: #586069;" 
                            fill="none" 
                            stroke="currentColor"
                            stroke-width="1.5"
                            viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                {/snippet}
            </InfoStackInput>
        </div>

        {#if loading}
            <Loading />
        {:else if prototypes.length === 0}
            <NotFound text="No prototypes found" />
        {:else}
            {#each prototypes as prototype}
                <InfoStackItem 
                    href="/prototype/{prototype.prototype_id}" 
                    title="{prototype.username}/{prototype.name}" 
                    description={prototype.description || 'No description'}
                >
                    {#snippet titleSuffix()}
                        {#if prototype.certified}
                            <svg style="width: 1rem; height: 1rem; color: #0366d6;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                            </svg>
                        {/if}
                    {/snippet}

                    {#snippet actions()}
                        <AddToModelButton prototypeId={prototype.prototype_id} prototypeName={prototype.name} />
                    {/snippet}
                </InfoStackItem>
            {/each}
        {/if}
    </InfoStack>
</PageContainer>
