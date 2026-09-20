<script>
    import Dialog from './Dialog.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';
    import InfoStackSelect from '../InfoStack/InfoStackSelect.svelte';
    import InfoStackTextarea from '../InfoStack/InfoStackTextarea.svelte';
    import { formatDate, t, tAccountType, yesNo } from '../../i18n/locale.svelte.js';
    import {
        CUSTOM_ACCOUNT_TYPE_VALUE,
        accountTokenField,
        accountTypeChoice,
        accountUsernameField,
        resolveAccountTypeChoice,
    } from '../../proxy/account.js';

    /** @type {any} */
    let { 
        account = null, 
        onclose = () => {},
        onsave = () => {},
        onnavigate = () => {}
    } = $props();

    let isEditing = $state(false);
    let editForm = $state({
        account_id: null,
        account_username: '',
        name: '',
        description: '',
        account_token: '',
        type: 'telegram',
        custom_type: '',
        server: '',
        is_local: false,
        account_group: 'free',
    });

    const resolvedType = $derived(resolveAccountTypeChoice(editForm.type, editForm.custom_type, editForm.is_local));
    const usernameField = $derived(accountUsernameField(isEditing ? resolvedType : (account?.type || 'telegram')));
    const tokenField = $derived(accountTokenField(isEditing ? resolvedType : (account?.type || 'telegram')));

    $effect(() => {
        if (!editForm.is_local && editForm.type === CUSTOM_ACCOUNT_TYPE_VALUE) {
            editForm.type = 'telegram';
            editForm.custom_type = '';
        }
    });

    $effect(() => {
        const next = String(editForm.custom_type || '').toLowerCase();
        if (editForm.custom_type !== next) editForm.custom_type = next;
    });

    $effect(() => {
        if (resolvedType !== 'matrix' && resolvedType !== 'whatsapp_cloud') {
            editForm.server = '';
        }
    });

    function handleEdit() {
        const isLocal = Boolean(account.is_local);
        editForm = {
            account_id: account.account_id,
            account_username: account.account_username,
            name: account.name,
            description: account.description,
            account_token: '',
            type: accountTypeChoice(account.type || 'telegram', isLocal),
            custom_type: accountTypeChoice(account.type || 'telegram', isLocal) === CUSTOM_ACCOUNT_TYPE_VALUE
                ? String(account.type || '').trim().toLowerCase()
                : '',
            server: '',
            is_local: isLocal,
            account_group: account.account_group || 'free',
        };
        isEditing = true;
    }

    function handleCancel() {
        isEditing = false;
        editForm = {
            account_id: null,
            account_username: '',
            name: '',
            description: '',
            account_token: '',
            type: 'telegram',
            custom_type: '',
            server: '',
            is_local: false,
            account_group: 'free',
        };
    }

    async function handleSave() {
        const requiresPro = !editForm.is_local && resolvedType !== 'telegram' && resolvedType !== 'whatsapp_cloud' && resolvedType !== 'sokoyuku';
        await onsave({
            ...editForm,
            type: resolvedType,
            account_group: requiresPro ? 'pro' : (editForm.account_group || account?.account_group || 'free'),
        });
        isEditing = false;
    }

    function tokenPlaceholder() {
        if (editForm.is_local) return 'Enter new token to encrypt';
        if (resolvedType === 'whatsapp_cloud' || resolvedType === 'matrix') return 'Enter new access token to change';
        if (resolvedType === 'qq') return 'Enter new AppSecret to change';
        if (resolvedType === 'telegram' || resolvedType === 'discord') return 'Enter new bot token to change';
        return 'Enter new token to change';
    }
</script>

{#snippet accountIcon()}
    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
{/snippet}
<Dialog 
    title={account?.name || t('Account Details')} 
    {onclose}
    {isEditing}
    onedit={handleEdit}
    oncancel={handleCancel}
    onsave={handleSave}
    icon={accountIcon}
>
    {#if account}
        {#if isEditing}
            <InfoStackInput title="Name" bind:value={editForm.name} placeholder="Enter account name" />
        {:else}
            <InfoStackInput title="Name" value={account.name} readonly />
        {/if}

        <InfoStackInput title={usernameField.title} value={account.account_username || ''} readonly />

        {#if isEditing}
            <InfoStackSelect title="Type" bind:value={editForm.type} required>
                <option value="telegram">{t('Telegram')}</option>
                <option value="matrix">{t('Matrix')}</option>
                <option value="discord">{t('Discord')}</option>
                <option value="qq">{t('QQ')}</option>
                <option value="whatsapp_cloud">{t('WhatsApp Cloud API')}</option>
                {#if editForm.is_local}
                    <option value={CUSTOM_ACCOUNT_TYPE_VALUE}>{t('Custom')}</option>
                {/if}
            </InfoStackSelect>
            {#if editForm.is_local && editForm.type === CUSTOM_ACCOUNT_TYPE_VALUE}
                <InfoStackInput
                    title="Custom Type"
                    bind:value={editForm.custom_type}
                    placeholder="e.g. my_platform"
                    maxlength="15"
                    required
                />
            {/if}
            {#if resolvedType === 'matrix'}
                <InfoStackInput
                    title="Homeserver"
                    bind:value={editForm.server}
                    placeholder="e.g. https://matrix.org"
                    required
                />
            {/if}
            {#if resolvedType === 'whatsapp_cloud'}
                <InfoStackInput
                    title="App Secret"
                    bind:value={editForm.server}
                    type="password"
                    placeholder="Enter new App Secret to change"
                />
            {/if}
        {:else}
            <InfoStackInput title="Type" value={tAccountType(account.type || 'telegram')} readonly />
            {#if (account.type || 'telegram') === 'matrix'}
                <InfoStackInput
                    title="Homeserver"
                    value={account.is_local ? '••••••••' : (account.server || '')}
                    readonly
                />
            {/if}
        {/if}

        <InfoStackInput title="Local" value={yesNo(account.is_local)} readonly />

        {#if isEditing}
            <InfoStackInput 
                title={tokenField.title} 
                bind:value={editForm.account_token} 
                type="password" 
                placeholder={tokenPlaceholder()} 
            />
        {:else}
            <InfoStackInput title={tokenField.title} value="••••••••" readonly />
        {/if}

        {#if isEditing}
            <InfoStackTextarea title="Description" bind:value={editForm.description} placeholder="Enter description" />
        {:else}
            <InfoStackTextarea title="Description" value={account.description} readonly />
        {/if}
        
        {#if !isEditing && account.created_at}
            <InfoStackInput title="Created" value={formatDate(account.created_at)} readonly />
        {/if}

        {#if !isEditing && account.models && account.models.length > 0}
            <InfoStackItem>
                <h4 style="font-weight: 600; color: var(--color-dark); margin: 0;">{t('Used In Models')}</h4>
            </InfoStackItem>
            {#each account.models as model}
                <InfoStackItem onclick={() => onnavigate(model.model_id)}>
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <span style="font-weight: 500;">{model.name}</span>
                        <svg style="width: 1.25rem; height: 1.25rem; color: #9ca3af;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </InfoStackItem>
            {/each}
        {/if}
    {/if}
</Dialog>
