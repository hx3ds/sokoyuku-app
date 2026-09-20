<script>
    import Dialog from './Dialog.svelte';
    import Loading from '../Loading.svelte';
    import Button from '../Button/Button.svelte';
    import Link from '../InfoStack/Link.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';
    import InfoStackTextarea from '../InfoStack/InfoStackTextarea.svelte';
    import InfoStackDivider from '../InfoStack/InfoStackDivider.svelte';
    import InfoStackBadge from '../InfoStack/InfoStackBadge.svelte';
    import { fetchModel, updateModel } from '../../proxy/model.js';
    import { showError } from './state.svelte.js';
    import { formatDateTime, t, tAccountType, tStatus, yesNo } from '../../i18n/locale.svelte.js';

    let {
        modelId = null,
        onclose = () => {},
        onupdated = () => {},
    } = $props();

    let model = $state(null);
    let loading = $state(true);
    let isEditing = $state(false);
    let originalValues = $state(null);
    let localSettingsPlaintext = $state('');
    let settingsEntries = $state(/** @type {{ id: string, key: string, value: string }[]} */ ([]));
    let settingsJson = $state('');
    let settingsJsonError = $state('');
    let settingsSource = $state(/** @type {'fields' | 'json'} */ ('fields'));
    let saving = $state(false);
    let entrySeq = 0;

    $effect(() => {
        if (modelId) {
            loadModel(modelId);
        }
    });

    function normalizeSettings(rawSettings) {
        if (typeof rawSettings === 'string') {
            try {
                const parsed = JSON.parse(rawSettings);
                return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
            } catch {
                return {};
            }
        }
        if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
            return {};
        }
        return { ...rawSettings };
    }

    function formatSettingValue(value) {
        if (typeof value === 'string') return value;
        if (value === undefined) return '';
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    function parseSettingValue(raw) {
        const text = String(raw ?? '');
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    function settingsFromEntries(entries) {
        /** @type {Record<string, unknown>} */
        const next = {};
        for (const entry of entries) {
            const key = String(entry.key || '').trim();
            if (!key) continue;
            next[key] = parseSettingValue(entry.value);
        }
        return next;
    }

    function entriesFromSettings(settings) {
        return Object.entries(settings || {}).map(([key, value]) => {
            entrySeq += 1;
            return {
                id: `setting-${entrySeq}`,
                key,
                value: formatSettingValue(value),
            };
        });
    }

    function syncJsonFromSettings(settings) {
        settingsJson = JSON.stringify(settings || {}, null, 2);
        settingsJsonError = '';
    }

    function applyJsonToSettings() {
        const text = String(settingsJson || '').trim();
        if (!text) {
            model.settings = {};
            settingsEntries = [];
            settingsJsonError = '';
            return true;
        }
        try {
            const parsed = JSON.parse(text);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                settingsJsonError = t('Settings JSON must be an object');
                return false;
            }
            model.settings = parsed;
            settingsEntries = entriesFromSettings(parsed);
            settingsJsonError = '';
            return true;
        } catch {
            settingsJsonError = t('Invalid JSON');
            return false;
        }
    }

    function applyFieldsToSettings() {
        const next = settingsFromEntries(settingsEntries);
        model.settings = next;
        syncJsonFromSettings(next);
        settingsJsonError = '';
        return true;
    }

    async function loadModel(id) {
        loading = true;
        isEditing = false;
        localSettingsPlaintext = '';
        settingsEntries = [];
        settingsJson = '';
        settingsJsonError = '';
        settingsSource = 'fields';
        const data = await fetchModel(id);
        if (data) {
            data.settings = normalizeSettings(data.settings);
        }
        model = data;
        if (model && !model.is_local) {
            settingsEntries = entriesFromSettings(model.settings);
            syncJsonFromSettings(model.settings);
        }
        loading = false;
    }

    function startEdit() {
        if (!model) return;
        originalValues = structuredClone($state.snapshot(model));
        localSettingsPlaintext = '';
        settingsSource = 'fields';
        settingsJsonError = '';
        if (!model.is_local) {
            model.settings = normalizeSettings(model.settings);
            settingsEntries = entriesFromSettings(model.settings);
            syncJsonFromSettings(model.settings);
        }
        isEditing = true;
    }

    function cancelEdit() {
        if (!originalValues) return;
        model = structuredClone($state.snapshot(originalValues));
        localSettingsPlaintext = '';
        settingsJsonError = '';
        settingsSource = 'fields';
        if (model && !model.is_local) {
            settingsEntries = entriesFromSettings(model.settings);
            syncJsonFromSettings(model.settings);
        } else {
            settingsEntries = [];
            settingsJson = '';
        }
        isEditing = false;
    }

    function addSettingEntry() {
        entrySeq += 1;
        settingsEntries = [
            ...settingsEntries,
            { id: `setting-${entrySeq}`, key: '', value: '' },
        ];
        settingsSource = 'fields';
    }

    function removeSettingEntry(id) {
        settingsEntries = settingsEntries.filter((entry) => entry.id !== id);
        settingsSource = 'fields';
        applyFieldsToSettings();
    }

    function onSettingFieldChange() {
        settingsSource = 'fields';
        applyFieldsToSettings();
    }

    function onSettingsJsonInput() {
        settingsSource = 'json';
        applyJsonToSettings();
    }

    async function handleSave() {
        if (!model || saving) return;
        saving = true;
        const isLocal = Boolean(model.is_local);

        if (!isLocal) {
            const ok = settingsSource === 'json' ? applyJsonToSettings() : applyFieldsToSettings();
            if (!ok) {
                saving = false;
                await showError(settingsJsonError || t('Invalid settings JSON'));
                return;
            }
        }

        const data = {
            model_id: model.model_id,
            name: model.name,
            description: model.description,
            settings: model.settings,
            is_local: model.is_local,
            local_settings_plaintext: isLocal ? localSettingsPlaintext : undefined,
        };
        const res = await updateModel(data);
        saving = false;
        if (res.result === 0) {
            isEditing = false;
            onupdated(data);
            await loadModel(model.model_id);
        } else {
            await showError(t('Failed to update model: {msg}', { msg: res.msg }));
        }
    }

    function formatDate(dateString) {
        if (!dateString) return t('Not specified');
        return formatDateTime(dateString) || t('Not specified');
    }

    function getEncryptedSettingsToken(settings) {
        const enc = settings?.__enc__;
        return typeof enc === 'string' ? enc : '';
    }

    function getModelAccounts(value) {
        return Array.isArray(value?.accts) ? value.accts : [];
    }

    function formatAccountLabel(account) {
        if (!account?.acct_username) return t('Not specified');
        return account.acct_username;
    }

    function formatAccountValue(account) {
        const type = tAccountType(account?.acct_type || 'account');
        const group = t('Group: {group}', { group: tStatus(account?.account_group || 'free') });
        const status = account?.subscription_disabled ? t('Disabled') : t('Active');
        if (String(account?.acct_type || '').toLowerCase() === 'matrix' && account?.server) {
            return `${t('{platform} on {server}', { platform: type, server: account.server })} · ${group} · ${status}`;
        }
        return `${type} · ${group} · ${status}`;
    }

    function getLastUsedModelAccount(value) {
        return getModelAccounts(value).find((account) => account.is_last_used) || null;
    }
</script>

{#snippet modelIcon()}
    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
{/snippet}
{#snippet loadingContent()}
    <Loading />
{/snippet}
{#snippet lastUsedBadge()}
    <InfoStackBadge class="last-used-badge" label="Last used" />
{/snippet}
<Dialog
    title={model?.name || t('Model Details')}
    {onclose}
    {isEditing}
    onedit={!loading && model ? startEdit : undefined}
    oncancel={cancelEdit}
    onsave={handleSave}
    icon={modelIcon}
    loading={loading}
    {loadingContent}
    maxWidth="max-w-2xl"
>
    {#if !loading && !model}
        <InfoStackItem>
            <div style="text-align: center; padding: 1rem; color: #6b7280;">{t('Model not found')}</div>
        </InfoStackItem>
    {:else if model}
        {@const isLocal = Boolean(model.is_local)}
        <InfoStackInput title="Name" bind:value={model.name} readonly={!isEditing} />
        <InfoStackInput title="Status" value={model.status || t('Unknown')} readonly />
        <InfoStackInput title="Prototype" value={model.prototype_id} readonly>
            {#snippet end()}
                <Link href="/prototype/{model.prototype_id}" aria-label={t('Visit Prototype')}>
                    <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                </Link>
            {/snippet}
        </InfoStackInput>
        <InfoStackTextarea title="Description" id="model-modal-description" bind:value={model.description} readonly={!isEditing} />
        <InfoStackInput title="Local" value={yesNo(isLocal)} readonly />
        <InfoStackInput title="Max Chats" value={model.max_chats} readonly />
        <InfoStackInput title="Access Point" value={model.access_point} readonly />
        <InfoStackInput title="Type" value={tStatus(model.type)} readonly />
        {#if model.type === 'subscription'}
            <InfoStackInput title="Tier" value={model.subscription_tier || '—'} readonly />
            <InfoStackInput title="Pro Charge" value={model.charge || '0'} readonly />
            {#if Number(model.max_tier_charge || 0) > 0}
                <InfoStackInput title="Max Tier Charge" value={model.max_tier_charge} readonly />
            {/if}
            {#if Number(model.max_charge_per_message || 0) > 0}
                <InfoStackInput title="Max Charge Per Message" value={model.max_charge_per_message} readonly />
            {/if}
        {:else}
            <InfoStackInput title="Max Charge Per Message" value={model.max_charge_per_message || '0'} readonly />
        {/if}
        <InfoStackInput title="Available until" value={formatDate(model.period)} readonly />
        <InfoStackInput title="Auto renew" value={yesNo(model.auto_renew)} readonly />
        <InfoStackInput title="Last Used Account" value={formatAccountLabel(getLastUsedModelAccount(model))} readonly />

        <InfoStackDivider label="Assigned accounts" />
        {#if getModelAccounts(model).length === 0}
            <InfoStackInput title="Accounts" value={t('None')} readonly />
        {:else}
            {#each getModelAccounts(model) as account (account.acct_id)}
                <InfoStackInput
                    title={formatAccountLabel(account)}
                    value={formatAccountValue(account)}
                    readonly
                    end={account.is_last_used ? lastUsedBadge : undefined}
                />
            {/each}
        {/if}

        <InfoStackDivider label="Model settings" />
        {#if isLocal}
            <InfoStackTextarea title="Encrypted Settings" value={getEncryptedSettingsToken(model.settings)} readonly />
            <InfoStackTextarea
                title="New Settings (JSON Object)"
                bind:value={localSettingsPlaintext}
                readonly={!isEditing}
                placeholder={'{\n  "temperature": 0.7\n}'}
                rows={6}
            />
        {:else}
            {#if !isEditing && settingsEntries.length === 0}
                <InfoStackInput title="Settings" value={t('None')} readonly />
            {:else}
                {#each settingsEntries as entry (entry.id)}
                    <InfoStackItem>
                        <div class="setting-row" class:editing={isEditing}>
                            {#if isEditing}
                                <input
                                    class="setting-key"
                                    bind:value={entry.key}
                                    placeholder={t('key')}
                                    aria-label={t('Setting key')}
                                    oninput={onSettingFieldChange}
                                />
                                <input
                                    class="setting-value"
                                    bind:value={entry.value}
                                    placeholder={t('value or JSON')}
                                    aria-label={t('Setting value')}
                                    oninput={onSettingFieldChange}
                                />
                                <Button
                                    variant="icon-button"
                                    onclick={() => removeSettingEntry(entry.id)}
                                    aria-label={t('Remove setting')}
                                    title={t('Remove setting')}
                                >
                                    <svg class="icon-sm" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
                                    </svg>
                                </Button>
                            {:else}
                                <div class="setting-key readonly">{entry.key}</div>
                                <div class="setting-value readonly">{entry.value}</div>
                            {/if}
                        </div>
                    </InfoStackItem>
                {/each}
            {/if}

            {#if isEditing}
                <InfoStackItem>
                    {#snippet actions()}
                        <Button variant="text-button" onclick={addSettingEntry} aria-label={t('Add setting')}>
                            {t('Add setting')}
                        </Button>
                    {/snippet}
                </InfoStackItem>
                <InfoStackTextarea
                    title="Settings JSON"
                    bind:value={settingsJson}
                    readonly={false}
                    placeholder={'{\n  "temperature": 0.7\n}'}
                    rows={8}
                    oninput={onSettingsJsonInput}
                />
                {#if settingsJsonError}
                    <InfoStackItem>
                        <div class="settings-json-error">{settingsJsonError}</div>
                    </InfoStackItem>
                {/if}
            {/if}
        {/if}
    {/if}
</Dialog>

<style>
    :global(.info-stack-badge.last-used-badge) {
        background: #dcfce7;
        color: #166534;
    }

    .setting-row {
        display: grid;
        grid-template-columns: minmax(7rem, 0.4fr) minmax(0, 1fr);
        gap: 0.75rem;
        align-items: center;
        width: 100%;
        padding-top: 0.25rem;
        padding-bottom: 0.25rem;
    }

    .setting-row.editing {
        grid-template-columns: minmax(7rem, 0.4fr) minmax(0, 1fr) auto;
    }

    .setting-key,
    .setting-value {
        width: 100%;
        min-width: 0;
        border: none;
        border-bottom: 1px solid var(--color-border, #e5e7eb);
        background: transparent;
        font: inherit;
        font-size: 0.875rem;
        color: var(--color-text-main, #111827);
        padding: 0.25rem 0;
    }

    .setting-key:focus,
    .setting-value:focus {
        outline: none;
        border-bottom-color: var(--color-primary, #2563eb);
    }

    .setting-key.readonly,
    .setting-value.readonly {
        border-bottom-color: transparent;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .setting-key.readonly {
        font-weight: 500;
        color: var(--color-text-secondary, #4b5563);
    }

    .settings-json-error {
        color: #ef4444;
        font-size: 0.875rem;
        padding: 0.25rem 0;
    }

    .icon-sm {
        width: 1rem;
        height: 1rem;
    }
</style>
