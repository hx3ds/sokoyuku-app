<script>
    import { createPrototype } from '../../proxy/prototype.js';
    import Dialog from './Dialog.svelte';
    import Button from '../Button/Button.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';
    import InfoStackTextarea from '../InfoStack/InfoStackTextarea.svelte';
    import InfoStackSelect from '../InfoStack/InfoStackSelect.svelte';
    import InfoStackToggle from '../InfoStack/InfoStackToggle.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';

    let { 
        show = $bindable(false), 
        onclose = () => {},
        oncreated = () => {} 
    } = $props();

    let creating = $state(false);
    let createError = $state('');
    
    let newPrototype = $state({
        name: 'prototype',
        description: '',
        access_point: '',
        path: '',
        max_chats: 1,
        type: 'token',
        billing_interval: 'monthly',
        charge: 100,
        reply_window: 600,
        private: false,
        is_local: false
    });

    // Reset form when modal opens
    $effect(() => {
        if (show) {
            resetForm();
        }
    });

    function resetForm() {
        newPrototype = {
            name: 'prototype',
            description: '',
            access_point: '',
            path: '',
            max_chats: 1,
            type: 'token',
            billing_interval: 'monthly',
            charge: 100,
            reply_window: 600,
            private: false,
            is_local: false
        };
        createError = '';
        creating = false;
    }

    async function handleCreatePrototype() {
        creating = true;
        createError = '';

        const payload = {
            ...newPrototype,
            billing_interval: newPrototype.type === 'subscription' ? (newPrototype.billing_interval || 'monthly') : null
        };
        const res = await createPrototype(payload);

        if (res.result === 0) {
            oncreated();
            close();
        } else {
            createError = res.msg || 'Failed to create prototype';
        }
        creating = false;
    }

    function close() {
        show = false;
        onclose();
    }
</script>

{#if show}
    {#snippet protoIcon()}
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
        {/snippet}
    <Dialog 
        title="Create New Prototype" 
        onclose={close} 
        maxWidth="max-w-4xl"
        icon={protoIcon}
    >
        <InfoStackInput 
            title="Name" 
            bind:value={newPrototype.name} 
            placeholder="e.g. my-awesome-account" 
        />
        <InfoStackInput 
            title="Access Point" 
            bind:value={newPrototype.access_point} 
            placeholder={newPrototype.is_local ? 'e.g. localhost:8080' : 'e.g. https://example.com'}
        />
        <InfoStackInput 
            title="Path" 
            bind:value={newPrototype.path} 
            placeholder="e.g. /my-account" 
        />
        <InfoStackTextarea 
            title="Description" 
            bind:value={newPrototype.description} 
            rows={3} 
            placeholder="Describe what this prototype does..." 
        />

        <InfoStackItem>
            <h4 style="font-weight: 600; color: var(--color-dark);">Configuration</h4>
        </InfoStackItem>

        <InfoStackInput 
            type="number" 
            title="Max Chats" 
            bind:value={newPrototype.max_chats} 
            min="1" 
        />
        <InfoStackInput
            type="number"
            title="Reply Window (sec)"
            bind:value={newPrototype.reply_window}
            min="0"
        />
        <InfoStackSelect 
            title="Type" 
            bind:value={newPrototype.type}
        >
            <option value="token">token</option>
            <option value="subscription">subscription</option>
        </InfoStackSelect>
        {#if newPrototype.type === 'subscription'}
            <InfoStackSelect 
                title="Billing Interval" 
                bind:value={newPrototype.billing_interval}
            >
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
                <option value="yearly">yearly</option>
            </InfoStackSelect>
        {/if}
        <InfoStackToggle 
            title="Private Visibility" 
            description={newPrototype.private ? 'Only visible to you' : 'Visible to everyone'}
            bind:checked={newPrototype.private} 
        />
        <InfoStackToggle
            title="Local Prototype"
            description={newPrototype.is_local ? 'Use a local Conductor access point' : 'Use a remote Station access point'}
            bind:checked={newPrototype.is_local}
        />

        <InfoStackItem>
            <h4 style="font-weight: 600; color: var(--color-dark);">Pricing</h4>
        </InfoStackItem>

        <InfoStackInput 
            type="number" 
            title="Charge (Credits)" 
            bind:value={newPrototype.charge} 
            min="0" 
            step="0.01" 
        />
        
        {#if createError}
            <InfoStackItem>
                <div style="padding: 0.75rem; background-color: #fef2f2; color: #dc2626; border-radius: 0.375rem; font-size: 0.875rem; border: 1px solid #fee2e2;">
                    {createError}
                </div>
            </InfoStackItem>
        {/if}

        <InfoStackItem>
            {#snippet actions()}
                <div style="display: flex; gap: 0.75rem;">
                    <Button variant="secondary" onclick={close} disabled={creating} aria-label="Cancel">
                        <svg style="width: 1.25rem; height: 1.25rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </Button>
                    <Button variant="primary" onclick={handleCreatePrototype} disabled={creating} loading={creating} aria-label="Create Prototype">
                        {#if creating}
                            Creating...
                        {:else}
                            <svg style="width: 1.25rem; height: 1.25rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        {/if}
                    </Button>
                </div>
            {/snippet}
        </InfoStackItem>
    </Dialog>
{/if}
