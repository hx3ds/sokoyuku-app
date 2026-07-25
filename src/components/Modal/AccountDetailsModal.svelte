<script>
    import Dialog from './Dialog.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';
    import InfoStackSelect from '../InfoStack/InfoStackSelect.svelte';
    import InfoStackTextarea from '../InfoStack/InfoStackTextarea.svelte';

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
        server: '',
        is_local: false,
    });

    $effect(() => {
        if (editForm.type !== 'matrix' && editForm.type !== 'whatsapp_cloud') {
            editForm.server = '';
        }
    });

    function handleEdit() {
        editForm = {
            account_id: account.account_id,
            account_username: account.account_username,
            name: account.name,
            description: account.description,
            account_token: '',
            type: account.type || 'telegram',
            server: '',
            is_local: Boolean(account.is_local),
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
            server: '',
            is_local: false,
        };
    }

    async function handleSave() {
        await onsave(editForm);
        isEditing = false;
    }

    function usernameLabel(type) {
        if (type === 'discord') return 'Client ID';
        if (type === 'whatsapp_cloud') return 'Phone Number ID';
        return 'Username';
    }

    function usernameDisplay(account) {
        const type = account?.type || 'telegram';
        const value = account?.account_username || '';
        if (type === 'discord' || type === 'whatsapp_cloud') return value;
        return `@${value}`;
    }

    function tokenLabel(type) {
        if (type === 'whatsapp_cloud') return 'Access Token';
        return 'Token';
    }
</script>

{#snippet accountIcon()}
    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
{/snippet}
<Dialog 
    title={account?.name || 'Account Details'} 
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

        <InfoStackInput title={usernameLabel(account.type || 'telegram')} value={usernameDisplay(account)} readonly />

        {#if isEditing}
            <InfoStackSelect title="Type" bind:value={editForm.type} required>
                <option value="telegram">Telegram</option>
                <option value="matrix">Matrix</option>
                <option value="discord">Discord</option>
                <option value="whatsapp_cloud">WhatsApp Business</option>
            </InfoStackSelect>
            {#if editForm.type === 'matrix'}
                <InfoStackInput
                    title="Server"
                    bind:value={editForm.server}
                    placeholder="Enter Matrix homeserver URL"
                    required
                />
            {/if}
            {#if editForm.type === 'whatsapp_cloud'}
                <InfoStackInput
                    title="App Secret"
                    bind:value={editForm.server}
                    type="password"
                    placeholder="Enter new app secret to change"
                />
            {/if}
        {:else}
            <InfoStackInput title="Type" value={account.type || 'telegram'} readonly />
            {#if (account.type || 'telegram') === 'matrix'}
                <InfoStackInput title="Server" value={account.server || ''} readonly />
            {/if}
        {/if}

        <InfoStackInput title="Local" value={account.is_local ? 'Yes' : 'No'} readonly />

        {#if isEditing}
            <InfoStackInput 
                title={tokenLabel(editForm.type)} 
                bind:value={editForm.account_token} 
                type="password" 
                placeholder={editForm.is_local ? "Enter new token to encrypt" : (editForm.type === 'whatsapp_cloud' ? "Enter new access token to change" : "Enter new token to change")} 
            />
        {:else}
            <InfoStackInput title={tokenLabel(account.type || 'telegram')} value="••••••••" readonly />
        {/if}

        {#if isEditing}
            <InfoStackTextarea title="Description" bind:value={editForm.description} placeholder="Enter description" />
        {:else}
            <InfoStackTextarea title="Description" value={account.description} readonly />
        {/if}
        
        {#if !isEditing && account.created_at}
            <InfoStackInput title="Created" value={new Date(account.created_at).toLocaleDateString()} readonly />
        {/if}

        {#if !isEditing && account.models && account.models.length > 0}
            <InfoStackItem>
                <h4 style="font-weight: 600; color: var(--color-dark); margin: 0;">Used In Models</h4>
            </InfoStackItem>
            {#each account.models as model}
                <InfoStackItem onclick={() => onnavigate(model.model_id)}>
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <span style="font-weight: 500;">{model.name}</span>
                        <svg style="width: 1.25rem; height: 1.25rem; color: #9ca3af;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </InfoStackItem>
            {/each}
        {/if}
    {/if}
</Dialog>
