<script>
    import Dialog from './Dialog.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';
    import InfoStackSelect from '../InfoStack/InfoStackSelect.svelte';
    import InfoStackTextarea from '../InfoStack/InfoStackTextarea.svelte';
    import InfoStackToggle from '../InfoStack/InfoStackToggle.svelte';
    import CommonButton from '../Button/Button.svelte';

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
        server: '',
        is_local: false,
    });

    $effect(() => {
        if (form.type !== 'matrix' && form.type !== 'whatsapp_cloud') {
            form.server = '';
        }
    });

    /** @param {KeyboardEvent} e */
    function handleKeydown(e) {
        if (e.key === 'Enter') {
            onsubmit(form);
        }
    }

    function usernameTitle() {
        if (form.type === 'discord') return 'Client ID';
        if (form.type === 'whatsapp_cloud') return 'Phone Number ID';
        return 'Account Username';
    }

    function usernamePlaceholder() {
        if (form.type === 'discord') return 'Enter Discord application client ID';
        if (form.type === 'whatsapp_cloud') return 'Enter Meta phone_number_id';
        return 'Enter username';
    }

    function tokenTitle() {
        if (form.type === 'whatsapp_cloud') return 'Access Token';
        return 'Account Token';
    }
</script>

{#snippet accountIcon()}
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    {/snippet}
    <Dialog 
        title="Add New Account" 
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
    <InfoStackSelect
        id="type"
        title="Type"
        bind:value={form.type}
        required
    >
        <option value="telegram">Telegram</option>
        <option value="matrix">Matrix</option>
        <option value="discord">Discord</option>
        <option value="whatsapp_cloud">WhatsApp Business</option>
    </InfoStackSelect>
    <InfoStackInput 
        id="account_username" 
        type="text" 
        bind:value={form.account_username} 
        title={usernameTitle()}
        placeholder={usernamePlaceholder()}
        required
    />
    <InfoStackInput 
        id="account_token" 
        type="password" 
        bind:value={form.account_token} 
        title={tokenTitle()}
        placeholder={form.type === 'whatsapp_cloud' ? 'Enter access token' : 'Enter token'}
        required
    />
    {#if form.type === 'whatsapp_cloud'}
        <InfoStackInput
            id="server"
            type="password"
            bind:value={form.server}
            title="App Secret"
            placeholder="Meta app secret"
            required
        />
    {/if}
    <InfoStackToggle
        title="Local Account"
        description={form.is_local ? 'Token will be encrypted with your Conductor public key before upload' : 'Token will be stored normally'}
        bind:checked={form.is_local}
    />
    {#if form.type === 'matrix'}
        <InfoStackInput 
            id="server" 
            type="text" 
            bind:value={form.server} 
            title="Server"
            placeholder="Enter Matrix homeserver URL"
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
            <div class="flex gap-2">
                <CommonButton variant="icon-button" onclick={() => onclose()} aria-label="Cancel">
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </CommonButton>
                <CommonButton variant="icon-button" onclick={() => onsubmit(form)} aria-label="Save Account">
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.5 12.75l6 6 9-13.5" /></svg>
                </CommonButton>
            </div>
        {/snippet}
    </InfoStackItem>
</Dialog>
