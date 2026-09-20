<script>
    import Dialog from './Dialog.svelte';
    import Loading from '../Loading.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';
    import InfoStackDivider from '../InfoStack/InfoStackDivider.svelte';
    import { t } from '../../i18n/locale.svelte.js';

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
    let assignedAccounts = $derived(
        filteredAccounts.filter((account) => account?.assignedModelStatus === 'current')
    );
    let otherAccounts = $derived(
        filteredAccounts.filter((account) => account?.assignedModelStatus !== 'current')
    );

    /** @param {AccountOption} account */
    function getAssignedModelText(account) {
        if (!showAssignedModel) {
            return '';
        }

        if (account?.assignedModelStatus === 'current') {
            return t('In this model');
        }

        const directName = String(account?.assignedModelName || '').trim();
        if (directName) {
            return t('In {name}', { name: directName });
        }

        if (!Array.isArray(account?.models) || account.models.length === 0) {
            return '';
        }

        const names = account.models
            .map((model) => String(model?.name || '').trim())
            .filter(Boolean);

        if (names.length === 0) return '';
        if (names.length === 1) return t('In {name}', { name: names[0] });
        return t('In {name} +{count}', { name: names[0], count: names.length - 1 });
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
        <Loading text={t('Opening chat...')} />
    {/snippet}
{#snippet accountRow(account)}
    {@const assignedModelText = getAssignedModelText(account)}
    <InfoStackItem 
        onclick={() => { if (!loading) onselect(account); }}
        title={account.name}
    >
        {#snippet meta()}
            {#if assignedModelText}
                <span class={getAssignedModelBadgeClass(account)}>{assignedModelText}</span>
            {/if}
            <div style="color: #586069; font-size: 0.875rem;">
                <span>{account.account_username}</span>
            </div>
        {/snippet}
    </InfoStackItem>
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
        {#each assignedAccounts as account (account.account_id ?? account.account_username)}
            {@render accountRow(account)}
        {/each}
        {#if assignedAccounts.length > 0 && otherAccounts.length > 0}
            <InfoStackDivider label="Assignable accounts" />
        {/if}
        {#each otherAccounts as account (account.account_id ?? account.account_username)}
            {@render accountRow(account)}
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
        margin-top: 0.125rem;
    }

    .current-model-badge {
        background: #e8f7ee;
        color: #1f8f55;
    }
</style>
