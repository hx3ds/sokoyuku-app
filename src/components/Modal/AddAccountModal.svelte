<script>
    import Dialog from './Dialog.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';
    import InfoStackSelect from '../InfoStack/InfoStackSelect.svelte';
    import InfoStackTextarea from '../InfoStack/InfoStackTextarea.svelte';
    import InfoStackToggle from '../InfoStack/InfoStackToggle.svelte';
    import CommonButton from '../Button/Button.svelte';
    import { t, tAccountType } from '../../i18n/locale.svelte.js';
    import {
        ACCOUNT_SETUP_DOCS,
        CUSTOM_ACCOUNT_TYPE_VALUE,
        accountTokenField,
        accountUsernameField,
        resolveAccountTypeChoice,
    } from '../../proxy/account.js';

    let { 
        onclose = () => {}, 
        onsubmit = () => {} 
    } = $props();

    let form = $state({
        name: '',
        account_username: '',
        description: '',
        account_token: '',
        type: 'telegram',
        custom_type: '',
        server: '',
        is_local: false,
    });

    const resolvedType = $derived(resolveAccountTypeChoice(form.type, form.custom_type, form.is_local));
    const requiresPro = $derived(!form.is_local && resolvedType !== 'telegram' && resolvedType !== 'whatsapp_cloud' && resolvedType !== 'sokoyuku');
    const setupDoc = $derived(ACCOUNT_SETUP_DOCS[form.type] || null);
    const setupDocHelp = $derived(setupDoc ? t('Check {platform} official doc', { platform: tAccountType(form.type) }) : '');
    const usernameField = $derived(accountUsernameField(resolvedType));
    const tokenField = $derived(accountTokenField(resolvedType));

    $effect(() => {
        if (!form.is_local && form.type === CUSTOM_ACCOUNT_TYPE_VALUE) {
            form.type = 'telegram';
            form.custom_type = '';
        }
    });

    $effect(() => {
        const next = String(form.custom_type || '').toLowerCase();
        if (form.custom_type !== next) form.custom_type = next;
    });

    $effect(() => {
        if (resolvedType !== 'matrix' && resolvedType !== 'whatsapp_cloud') {
            form.server = '';
        }
    });

    function submitPayload() {
        return { ...form, type: resolvedType, account_group: requiresPro ? 'pro' : 'free' };
    }

    /** @param {KeyboardEvent} e */
    function handleKeydown(e) {
        if (e.key === 'Enter') {
            onsubmit(submitPayload());
        }
    }
</script>

{#snippet accountIcon()}
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    {/snippet}
    <Dialog 
        title={t('Add New Account')} 
        onclose={() => onclose()}
        className="h-full"
        onkeydown={handleKeydown}
        icon={accountIcon}
    >
    <InfoStackInput 
        id="name" 
        type="text" 
        bind:value={form.name} 
        title="Name"
        placeholder="Enter name"
        required
    />
    <InfoStackToggle
        title="Local Account"
        description={form.is_local ? 'Token and server will be encrypted with your Conductor public key before upload' : 'Credentials will be stored normally'}
        bind:checked={form.is_local}
    />
    <InfoStackSelect
        id="type"
        title="Type"
        bind:value={form.type}
        required
    >
        <option value="telegram">{t('Telegram')}</option>
        <option value="matrix">{t('Matrix')}</option>
        <option value="discord">{t('Discord')}</option>
        <option value="qq">{t('QQ')}</option>
        <option value="whatsapp_cloud">{t('WhatsApp Cloud API')}</option>
        {#if form.is_local}
            <option value={CUSTOM_ACCOUNT_TYPE_VALUE}>{t('Custom')}</option>
        {/if}
    </InfoStackSelect>
    {#if setupDoc}
        <InfoStackItem href={setupDoc.href} title={setupDocHelp} description={setupDoc.title} />
    {/if}
    {#if form.is_local && form.type === CUSTOM_ACCOUNT_TYPE_VALUE}
        <InfoStackInput
            id="custom_type"
            type="text"
            bind:value={form.custom_type}
            title="Custom Type"
            placeholder="e.g. my_platform"
            maxlength="15"
            required
        />
    {/if}
    <InfoStackInput 
        id="account_username" 
        type="text" 
        bind:value={form.account_username} 
        title={usernameField.title}
        placeholder={usernameField.placeholder}
        required
    />
    <InfoStackInput 
        id="account_token" 
        type="password" 
        bind:value={form.account_token} 
        title={tokenField.title}
        placeholder={tokenField.placeholder}
        required
    />
    {#if resolvedType === 'whatsapp_cloud'}
        <InfoStackInput
            id="server"
            type="password"
            bind:value={form.server}
            title="App Secret"
            placeholder="Enter App Secret"
            required
        />
    {/if}
    {#if requiresPro}
        <InfoStackItem>
            <p class="text-sm" style="color: var(--color-text-secondary); margin: 0;">{t('Requires an active Pro subscription.')}</p>
        </InfoStackItem>
    {/if}
    {#if resolvedType === 'matrix'}
        <InfoStackInput 
            id="server" 
            type="text" 
            bind:value={form.server} 
            title="Homeserver"
            placeholder="e.g. https://matrix.org"
            required
        />
    {/if}
    <InfoStackTextarea 
        id="desc" 
        bind:value={form.description} 
        title="Description" 
        placeholder="Enter account description" 
    />
    
    <InfoStackItem style="border-top: 1px solid var(--color-border); padding-top: 1rem; margin-top: 0.5rem;">
        {#snippet actions()}
            <CommonButton variant="icon-button" onclick={() => onsubmit(submitPayload())} aria-label={t('Save Account')}>
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.5 12.75l6 6 9-13.5" /></svg>
            </CommonButton>
        {/snippet}
    </InfoStackItem>
</Dialog>
