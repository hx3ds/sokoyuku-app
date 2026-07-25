<script>
    import Dialog from './Dialog.svelte';
    import Loading from '../Loading.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';

    /**
     * @typedef {{ model_id?: string, name?: string }} AccountModel
     * @typedef {{ account_id?: string, account_username?: string, name?: string, type?: string, models?: AccountModel[], assignedModelName?: string, assignedModelStatus?: 'current' | 'other' }} AccountOption
     */

    let {
        accounts = [],
        loading = false,
        busyAccountId = null,
        title = 'Select Account',
        emptyText = 'No accounts found',
        emptyDescription = 'Create an account first to add it to this model',
        showAssignedModel = false,
        onclose = () => {},
        onselect = () => {}
    } = $props();

    let searchQuery = $state('');
    let filteredAccounts = $derived(accounts.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.account_username.toLowerCase().includes(searchQuery.toLowerCase())
    ));

    /** @param {AccountOption} account */
    function getAssignedModelText(account) {
        if (!showAssignedModel) {
            return '';
        }

        if (account?.assignedModelStatus === 'current') {
            return 'In this model';
        }

        const directName = String(account?.assignedModelName || '').trim();
        if (directName) {
            return `In ${directName}`;
        }

        if (!Array.isArray(account?.models) || account.models.length === 0) {
            return '';
        }

        const names = account.models
            .map((model) => String(model?.name || '').trim())
            .filter(Boolean);

        if (names.length === 0) return '';
        if (names.length === 1) return `In ${names[0]}`;
        return `In ${names[0]} +${names.length - 1}`;
    }

    /** @param {AccountOption} account */
    function getAssignedModelBadgeClass(account) {
        return account?.assignedModelStatus === 'current'
            ? 'account-count-badge current-model-badge'
            : 'account-count-badge';
    }
</script>

{#snippet searchIcon()}
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
    {/snippet}
{#snippet openingChatLoading()}
        <Loading text="Opening chat..." />
    {/snippet}
    <Dialog 
        {title}
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
                <p style="margin: 0;">{emptyText}</p>
                <p style="font-size: 0.875rem; color: #9ca3af; margin-top: 0.5rem; margin-bottom: 0;">{emptyDescription}</p>
            </div>
        </InfoStackItem>
    {:else}
        {#each filteredAccounts as account (account.account_id ?? account.account_username)}
            {@const assignedModelText = getAssignedModelText(account)}
            <InfoStackItem 
                onclick={() => { if (!loading) onselect(account); }}
                title={account.name}
                description={(account.type === 'discord' || account.type === 'whatsapp_cloud') ? account.account_username : `@${account.account_username}`}
            >
                {#snippet titleSuffix()}
                    {#if assignedModelText}
                        <span class={getAssignedModelBadgeClass(account)}>{assignedModelText}</span>
                    {/if}
                {/snippet}
            </InfoStackItem>
        {/each}
    {/if}
</Dialog>

<style>
    .account-count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.125rem 0.5rem;
        border-radius: 999px;
        background: #eef2ff;
        color: #4338ca;
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;
    }

    .current-model-badge {
        background: #e8f7ee;
        color: #1f8f55;
    }
</style>
