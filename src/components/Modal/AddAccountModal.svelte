<script>
    import Dialog from './Dialog.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';
    import InfoStackSelect from '../InfoStack/InfoStackSelect.svelte';
    import InfoStackTextarea from '../InfoStack/InfoStackTextarea.svelte';
    import CommonButton from '../Button/Button.svelte';

    let { 
        onclose = () => {}, 
        onsubmit = () => {} 
    } = $props();

    let form = $state({ name: '', account_username: '', description: '', account_token: '', type: 'telegram', server: '' });

    $effect(() => {
        if (form.type !== 'matrix') {
            form.server = '';
        }
    });
</script>

{#snippet accountIcon()}
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    {/snippet}
    <Dialog 
        title="Add New Account" 
        onclose={() => onclose()}
        className="h-full"
        onkeydown={(e) => e.key === 'Enter' && onsubmit(form)}
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
    <InfoStackInput 
        id="account_username" 
        type="text" 
        bind:value={form.account_username} 
        title="Account Username"
        placeholder="Enter username"
        required
    />
    <InfoStackInput 
        id="account_token" 
        type="password" 
        bind:value={form.account_token} 
        title="Account Token"
        placeholder="Enter token"
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
    </InfoStackSelect>
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
