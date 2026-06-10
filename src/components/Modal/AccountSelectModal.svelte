<script>
    import Dialog from './Dialog.svelte';
    import Loading from '../Loading.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';

    let {
        accounts = [],
        loading = false,
        busyAccountId = null,
        onclose = () => {},
        onselect = () => {}
    } = $props();

    let searchQuery = $state('');
    let filteredAccounts = $derived(accounts.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.account_username.toLowerCase().includes(searchQuery.toLowerCase())
    ));
</script>

{#snippet searchIcon()}
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
    {/snippet}
{#snippet openingChatLoading()}
        <Loading text="Opening chat..." />
    {/snippet}
    <Dialog 
        title="Select Account to Add" 
        onclose={() => onclose()}
        icon={searchIcon}
        loading={loading}
        loadingContent={openingChatLoading}
    >
    <InfoStackInput 
        type="text" 
        placeholder="Search accounts..." 
        bind:value={searchQuery}
        disabled={loading}
    />
    
    {#if filteredAccounts.length === 0}
        <InfoStackItem>
            <div style="text-align: center; padding: 1rem; color: #6b7280;">
                <p style="margin: 0;">No accounts found</p>
                <p style="font-size: 0.875rem; color: #9ca3af; margin-top: 0.5rem; margin-bottom: 0;">Create an account first to add it to this model</p>
            </div>
        </InfoStackItem>
    {:else}
        {#each filteredAccounts as account (account.account_id ?? account.account_username)}
            <InfoStackItem 
                onclick={() => { if (!loading) onselect(account); }}
                title={account.name}
                description={`@${account.account_username}`}
            >
            </InfoStackItem>
        {/each}
    {/if}
</Dialog>
