<script lang="ts">
    import Link from '../../components/InfoStack/Link.svelte';
    import Loading from '../../components/Loading.svelte';
    import NotFound from '../../components/NotFound.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    import InfoStackInput from '../../components/InfoStack/InfoStackInput.svelte';
    import InfoStackTextarea from '../../components/InfoStack/InfoStackTextarea.svelte';
    import { fetchModel, updateModel } from '../../proxy/model.js';
    import { modelStore } from '../../store/models.svelte.js';
    import { showError } from '../../components/Modal/state.svelte.js';
    import PageContainer from '../../components/PageContainer.svelte';

    type ModelAccount = {
        acct_id: string;
        acct_username: string;
        acct_type?: string | null;
        server?: string | null;
        account_group?: string | null;
        subscription_disabled?: boolean;
        is_last_used?: boolean;
    };

    type Model = {
        model_id: string;
        prototype_id: number;
        name: string;
        description?: string | null;
        status?: string | null;
        period?: string | null;
        auto_renew?: boolean | null;
        settings?: Record<string, unknown> | null;
        access_point?: string | null;
        max_chats?: number | null;
        charge?: number | null;
        type?: string | null;
        is_local?: boolean | null;
        accts?: ModelAccount[];
    };

    let { modelId = null } = $props() as { modelId?: string | null };
    let model = $state<Model | null>(null);
    let loading = $state(true);
    let isEditing = $state(false);
    let originalValues = $state<Model | null>(null);
    let localSettingsPlaintext = $state('');

    $effect(() => {
        if (modelId) {
            loadModel();
        }
    });

    async function loadModel() {
        loading = true;
        const data = await fetchModel(modelId);
        const nextModel = data as Model | null;
        if (nextModel) {
            const rawSettings = nextModel.settings;
            if (typeof rawSettings === 'string') {
                try {
                    const parsed = JSON.parse(rawSettings);
                    nextModel.settings = parsed && typeof parsed === 'object' ? parsed : {};
                } catch (e) {
                    console.error('Failed to parse settings:', e);
                    nextModel.settings = {};
                }
            } else if (!rawSettings || typeof rawSettings !== 'object') {
                nextModel.settings = {};
            }
        }
        model = nextModel;
        localSettingsPlaintext = '';
        loading = false;
    }

    function startEdit() {
        if (!model) return;
        originalValues = structuredClone($state.snapshot(model));
        isEditing = true;
    }

    function cancelEdit() {
        if (!originalValues) return;
        model = structuredClone($state.snapshot(originalValues));
        isEditing = false;
    }

    async function handleSave() {
        if (!model) return;
        const isLocal = Boolean(model.is_local);
        const data = {
            model_id: model.model_id,
            name: model.name,
            description: model.description,
            settings: model.settings,
            is_local: model.is_local,
            local_settings_plaintext: isLocal ? localSettingsPlaintext : undefined,
        };

        const res = await updateModel(data);
        if (res.result === 0) {
            isEditing = false;
            modelStore.update(data); // Update store
            await loadModel(); // Refresh to ensure data consistency
        } else {
            await showError('Failed to update model: ' + res.msg);
        }
    }

    function formatDate(dateString: string | null | undefined) {
        if (!dateString) return 'Not specified';
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    function getEncryptedSettingsToken(settings: Record<string, unknown> | null | undefined) {
        const s = (settings || {}) as Record<string, unknown> & { __enc__?: unknown };
        const enc = s.__enc__;
        return typeof enc === 'string' ? enc : '';
    }

    function getModelAccounts(value: Model | null | undefined): ModelAccount[] {
        return Array.isArray(value?.accts) ? value.accts : [];
    }

    function getLastUsedModelAccount(value: Model | null | undefined): ModelAccount | null {
        const accounts = getModelAccounts(value);
        return accounts.find((account) => account.is_last_used) || null;
    }
</script>

<PageContainer id="page-model">
    {#if loading}
        <Loading />
    {:else if !model}
        <NotFound text="Model Not Found" />
    {:else}
        {@const isLocal = Boolean(model!.is_local)}
        <!-- Model Information -->
        <InfoStack 
            title="Model Details"
            editable={true}
            {isEditing}
            onedit={startEdit}
            oncancel={cancelEdit}
            onsave={handleSave}
        >
            <InfoStackInput title="Name" bind:value={model!.name} readonly={!isEditing} />

            <!-- Status -->
            <InfoStackInput title="Status" value={model!.status || 'Unknown'} readonly />

            <!-- Prototype Link -->
            <InfoStackInput title="Prototype" value={model!.prototype_id} readonly>
                {#snippet end()}
                    <Link href="/prototype/{model!.prototype_id}" aria-label="Visit Prototype">
                        <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                    </Link>
                {/snippet}
            </InfoStackInput>

            <InfoStackTextarea title="Description" id="model-description" bind:value={model!.description} readonly={!isEditing} />

            <InfoStackInput title="Local" value={isLocal ? 'Yes' : 'No'} readonly />
            <InfoStackInput title="Max Chats" value={model!.max_chats} readonly />
            <InfoStackInput title="Access Point" value={model!.access_point} readonly />
            <InfoStackInput title="Type" value={model!.type} readonly />
            <InfoStackInput title="Charge" value={model!.charge || '0'} readonly />
            <InfoStackInput title="Available until" value={formatDate(model!.period)} readonly />
            <InfoStackInput title="Auto renew" value={model!.auto_renew} readonly />
            <InfoStackInput
                title="Last Used Account"
                value={getLastUsedModelAccount(model)?.acct_username ? `@${getLastUsedModelAccount(model)?.acct_username}` : 'Not specified'}
                readonly
            />
            <InfoStackInput title="Assigned Accounts" value={getModelAccounts(model).length} readonly />
        </InfoStack>

        <InfoStack title="Assigned Accounts">
            {#if getModelAccounts(model).length === 0}
                <InfoStackItem>
                    <div class="empty-accounts">No accounts assigned to this model.</div>
                </InfoStackItem>
            {:else}
                {#each getModelAccounts(model) as account (account.acct_id)}
                    <InfoStackItem
                        title={`@${account.acct_username}`}
                        description={account.server ? `${account.acct_type || 'account'} on ${account.server}` : (account.acct_type || 'account')}
                    >
                        {#snippet titleSuffix()}
                            {#if account.is_last_used}
                                <span class="last-used-badge">Last used</span>
                            {/if}
                        {/snippet}

                        {#snippet meta()}
                            <div class="account-meta">
                                <span>ID: {account.acct_id}</span>
                                <span>Group: {account.account_group || 'free'}</span>
                                <span>Status: {account.subscription_disabled ? 'Disabled' : 'Active'}</span>
                            </div>
                        {/snippet}
                    </InfoStackItem>
                {/each}
            {/if}
        </InfoStack>

        <!-- Model Settings -->
        <InfoStack title="Model Settings">
            {#if isLocal}
                <InfoStackTextarea
                    title="Encrypted Settings"
                    value={getEncryptedSettingsToken(model!.settings)}
                    readonly
                />
                <InfoStackTextarea
                    title="New Settings (JSON Object)"
                    bind:value={localSettingsPlaintext}
                    readonly={!isEditing}
                    placeholder="Enter a JSON object"
                    rows={6}
                />
            {:else}
                {#if !model!.settings || Object.keys(model!.settings).length === 0}
                    <div style="color: #65676b; padding: 0.5rem; font-size: 0.875rem; text-align: center; width: 100%;">No settings configured</div>
                {:else}
                    {#each Object.entries(model!.settings) as [key, value]}
                        <InfoStackInput title={key} 
                               value={typeof value === 'object' ? JSON.stringify(value) : value}
                               readonly={!isEditing}
                               oninput={(e: Event) => {
                                    const target = e.target as HTMLInputElement;
                                    try {
                                        model!.settings![key] = JSON.parse(target.value);
                                    } catch(err) {
                                        model!.settings![key] = target.value;
                                    }
                               }}
                        />
                    {/each}
                {/if}
            {/if}
        </InfoStack>

    {/if}
</PageContainer>

<style>
    .empty-accounts {
        color: #65676b;
        padding: 0.5rem;
        font-size: 0.875rem;
        text-align: center;
        width: 100%;
    }

    .account-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        font-size: 0.75rem;
        color: var(--color-text-muted, #586069);
        padding-top: 0.125rem;
    }

    .last-used-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.125rem 0.5rem;
        border-radius: 999px;
        background: #dcfce7;
        color: #166534;
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;
    }
</style>
