<script>
    import { createPrototype } from '../../proxy/prototype.js';
    import Dialog from './Dialog.svelte';
    import Button from '../Button/Button.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';
    import InfoStackTextarea from '../InfoStack/InfoStackTextarea.svelte';
    import InfoStackSelect from '../InfoStack/InfoStackSelect.svelte';
    import InfoStackToggle from '../InfoStack/InfoStackToggle.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';
    import { t } from '../../i18n/locale.svelte.js';

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
        charge: 0,
        has_free_tier: false,
        max_tier_charge: 0,
        max_charge_per_message: 0,
        reply_window: 600,
        private: false,
        is_local: false,
        call_support: false,
        terms_of_use: '',
        privacy_policy: ''
    });

    // Reset form when modal opens
    $effect(() => {
        if (show) {
            resetForm();
        }
    });

    $effect(() => {
        if (newPrototype.is_local) {
            newPrototype.private = true;
            newPrototype.charge = 0;
            newPrototype.max_tier_charge = 0;
            newPrototype.max_charge_per_message = 0;
            if (newPrototype.type === 'subscription') {
                newPrototype.has_free_tier = true;
            }
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
            charge: 0,
            has_free_tier: false,
            max_tier_charge: 0,
            max_charge_per_message: 0,
            reply_window: 600,
            private: false,
            is_local: false,
            call_support: false,
            terms_of_use: '',
            privacy_policy: ''
        };
        createError = '';
        creating = false;
    }

    async function handleCreatePrototype() {
        creating = true;
        createError = '';

        const payload = {
            ...newPrototype,
            status: newPrototype.status || 'active',
            qr_platforms: Array.isArray(newPrototype.qr_platforms) ? newPrototype.qr_platforms : [],
            billing_interval: newPrototype.type === 'subscription' ? (newPrototype.billing_interval || 'monthly') : '',
            call_support: newPrototype.type === 'subscription' ? Boolean(newPrototype.call_support) : false,
            charge: newPrototype.is_local ? 0 : (newPrototype.type === 'subscription' ? (Number(newPrototype.charge) || 0) : 0),
            has_free_tier: newPrototype.type === 'subscription'
                ? (newPrototype.is_local ? true : Boolean(newPrototype.has_free_tier))
                : false,
            max_tier_charge: newPrototype.is_local ? 0 : (newPrototype.type === 'subscription' ? (Number(newPrototype.max_tier_charge) || 0) : 0),
            max_charge_per_message: newPrototype.is_local ? 0 : (Number(newPrototype.max_charge_per_message) || 0),
            private: newPrototype.is_local ? true : newPrototype.private
        };
        const res = await createPrototype(payload);

        if (res.result === 0) {
            oncreated();
            close();
        } else {
            createError = res.msg || t('Failed to create prototype');
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
        title={t('Create New Prototype')} 
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
            placeholder={newPrototype.is_local ? 'e.g. http://localhost:8080' : 'e.g. https://example.com'}
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
        <InfoStackInput
            title="Terms of Use URL"
            bind:value={newPrototype.terms_of_use}
            placeholder="Optional custom terms URL"
        />
        <InfoStackInput
            title="Privacy Policy URL"
            bind:value={newPrototype.privacy_policy}
            placeholder="Optional custom privacy policy URL"
        />

        <InfoStackItem>
            <h4 style="font-weight: 600; color: var(--color-dark);">{t('Configuration')}</h4>
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
            <option value="token">{t('token')}</option>
            <option value="subscription">{t('subscription')}</option>
        </InfoStackSelect>
        {#if newPrototype.type === 'subscription'}
            <InfoStackSelect 
                title="Billing Interval" 
                bind:value={newPrototype.billing_interval}
            >
                <option value="daily">{t('daily')}</option>
                <option value="weekly">{t('weekly')}</option>
                <option value="monthly">{t('monthly')}</option>
                <option value="yearly">{t('yearly')}</option>
            </InfoStackSelect>
        {/if}
        {#if newPrototype.is_local}
            <InfoStackInput title="Private Visibility" value={t('Yes (required for local)')} readonly />
        {:else}
            <InfoStackToggle 
                title="Private Visibility" 
                description={newPrototype.private ? 'Only visible to you' : 'Visible to everyone'}
                bind:checked={newPrototype.private} 
            />
        {/if}
        <InfoStackToggle
            title="Local Prototype"
            description={newPrototype.is_local ? 'Private local Conductor access point' : 'Use a remote Station access point'}
            bind:checked={newPrototype.is_local}
        />
        {#if newPrototype.type === 'subscription'}
            <InfoStackToggle
                title="Call Support"
                description={newPrototype.call_support ? 'Voice calls enabled on all platforms' : 'Voice calls disabled'}
                bind:checked={newPrototype.call_support}
            />
        {/if}

        <InfoStackItem>
            <h4 style="font-weight: 600; color: var(--color-dark);">{t('Pricing')}</h4>
        </InfoStackItem>

        {#if newPrototype.is_local}
            <InfoStackInput title="Pricing" value={t('Free (required for local)')} readonly />
        {:else if newPrototype.type === 'subscription'}
            <InfoStackToggle
                title="Free Tier"
                description={newPrototype.has_free_tier ? 'Optional free tier enabled' : 'No free tier'}
                bind:checked={newPrototype.has_free_tier}
            />
            <InfoStackInput 
                type="number" 
                title="Pro Charge" 
                bind:value={newPrototype.charge} 
                min="0" 
                step="0.01" 
            />
            <InfoStackInput 
                type="number" 
                title="Max Tier Charge" 
                bind:value={newPrototype.max_tier_charge} 
                min="0" 
                step="0.01" 
            />
            <InfoStackInput 
                type="number" 
                title="Max Charge Per Message" 
                bind:value={newPrototype.max_charge_per_message} 
                min="0" 
                step="0.01" 
            />
        {:else}
            <InfoStackInput 
                type="number" 
                title="Max Charge Per Message" 
                bind:value={newPrototype.max_charge_per_message} 
                min="0" 
                step="0.01" 
            />
        {/if}
        
        {#if createError}
            <InfoStackItem>
                <div style="padding: 0.75rem; background-color: var(--color-danger-soft); color: var(--color-danger-soft-text); border-radius: 0.375rem; font-size: 0.875rem; border: 1px solid var(--color-danger-soft);">
                    {createError}
                </div>
            </InfoStackItem>
        {/if}

        <InfoStackItem>
            {#snippet actions()}
                <Button variant="icon-button" onclick={handleCreatePrototype} disabled={creating} loading={creating} aria-label={t('Create Prototype')}>
                    {#if creating}
                        {t('Creating...')}
                    {:else}
                        <svg style="width: 1.25rem; height: 1.25rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    {/if}
                </Button>
            {/snippet}
        </InfoStackItem>
    </Dialog>
{/if}
