<script>
    import { onMount } from 'svelte';
    import { fetchProfile } from '../../proxy/user.js';
    import Loading from '../../components/Loading.svelte';
    import PageContainer from '../../components/PageContainer.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    import InfoStackInput from '../../components/InfoStack/InfoStackInput.svelte';
    import Button from '../../components/Button/Button.svelte';
    import AddCreditsModal from '../../components/Modal/AddCreditsModal.svelte';

    let profile = $state(null);
    let loading = $state(true);
    let showCreditsModal = $state(false);

    onMount(async () => {
        await loadProfile();
    });

    async function loadProfile() {
        loading = true;
        profile = await fetchProfile();
        loading = false;
    }

    function openCreditsModal() {
        showCreditsModal = true;
    }

    function closeCreditsModal() {
        showCreditsModal = false;
    }
</script>

<PageContainer id="page-credits">
    {#if loading}
        <Loading />
    {:else if profile}
        <!-- Credits Section -->
        <InfoStack title="Credits">
            {#snippet headerActions()}
                <Button variant="text-button" onclick={openCreditsModal}>Add Credits</Button>
            {/snippet}
            
            <div class="section-content">
                <InfoStackInput title="Current Balance" value={`$${(profile.wallet_balance || 0).toFixed(2)}`} readonly />
            </div>
        </InfoStack>

        <!-- Chat History Section -->
        <InfoStack title="History">
            <InfoStackItem 
                href="/chat-history" 
                title="Chat History" 
                description="View your chat deduction history"
            >
                {#snippet actions()}
                    <div style="padding: 0.375rem; color: #586069;">
                         <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                    </div>
                {/snippet}
            </InfoStackItem>
        </InfoStack>
    {:else}
        <div style="text-align: center; padding: 2rem; color: #ef4444;">Failed to load credits.</div>
    {/if}
</PageContainer>

<AddCreditsModal bind:showCreditsModal onClose={closeCreditsModal} />