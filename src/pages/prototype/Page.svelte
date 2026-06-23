<script lang="ts">
    import Link from '../../components/InfoStack/Link.svelte';
    import Loading from '../../components/Loading.svelte';
    import NotFound from '../../components/NotFound.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    import InfoStackInput from '../../components/InfoStack/InfoStackInput.svelte';
    import InfoStackTextarea from '../../components/InfoStack/InfoStackTextarea.svelte';
    import InfoStackSelect from '../../components/InfoStack/InfoStackSelect.svelte';
    import Button from '../../components/Button/Button.svelte';
    import AddToModelButton from '../../components/Button/AddToModelButton.svelte';
    import PageContainer from '../../components/PageContainer.svelte';
    import TokenModal from '../../components/Modal/TokenModal.svelte';
    
    import { fetchPrototype, updatePrototype, getPrototypeToken, refreshPrototypeToken } from '../../proxy/prototype.js';
    import { prototypeStore } from '../../store/prototypes.svelte.js';
    import { showError } from '../../components/Modal/state.svelte.js';

    type Prototype = {
        prototype_id: number;
        username?: string;
        name?: string;
        description?: string | null;
        access_point?: string | null;
        path?: string | null;
        status?: string | null;
        type?: string | null;
        billing_interval?: string | null;
        private?: boolean;
        max_chats?: number | string | null;
        charge?: number | string | null;
        reply_window?: number | string | null;
        certified?: boolean;
        next_prototype_id?: number | null;
        is_author?: boolean;
        is_local?: boolean;
    };

    let { prototypeId = null } = $props() as { prototypeId?: string | number | null };
    let prototype = $state<Prototype | null>(null);
    let loading = $state(true);
    let isEditing = $state(false);
    let originalValues = $state<Prototype | null>(null);
    
    // Token
    let token = $state<string | null>(null);
    let showTokenModal = $state(false);
    let tokenLoading = $state(false);

    $effect(() => {
        if (prototypeId) {
            loadPrototype();
        }
    });

    $effect(() => {
        if (!prototype) return;
        if (prototype.type === 'subscription') {
            if (!prototype.billing_interval) prototype.billing_interval = 'monthly';
        } else {
            if (prototype.billing_interval) prototype.billing_interval = null;
        }
    });

    async function loadPrototype() {
        loading = true;
        prototype = await fetchPrototype(prototypeId);
        loading = false;
    }

    function startEditing() {
        if (!prototype) return;
        originalValues = structuredClone($state.snapshot(prototype));
        isEditing = true;
    }

    function cancelEditing() {
        if (!originalValues) return;
        prototype = structuredClone($state.snapshot(originalValues));
        isEditing = false;
    }

    async function saveChanges() {
        if (!prototype) return;
        const data = {
            prototype_id: prototype.prototype_id,
            name: prototype.name ?? '',
            description: prototype.description ?? '',
            max_chats: Number.parseInt(String(prototype.max_chats ?? ''), 10) || 1,
            charge: Number.parseFloat(String(prototype.charge ?? '')) || 0,
            private: prototype.private ?? false,
            access_point: prototype.access_point ?? '',
            path: prototype.path ?? null,
            status: prototype.status ?? '',
            type: prototype.type ?? 'token',
            billing_interval: (prototype.type ?? 'token') === 'subscription'
                ? (prototype.billing_interval ?? 'monthly')
                : null,
            reply_window: Number.parseInt(String(prototype.reply_window ?? ''), 10) || 0,
            is_local: Boolean(prototype.is_local),
        };

        const res = await updatePrototype(data);
        if (res.result === 0) {
            isEditing = false;
            prototypeStore.update(data); // Update store
            // Refresh to get clean state
            await loadPrototype();
        } else {
            await showError('Failed to update prototype: ' + res.msg);
        }
    }

    async function openTokenModal() {
        showTokenModal = true;
        tokenLoading = true;
        const res = await getPrototypeToken(prototypeId);
        if (res.result === 0) {
            token = res.data.token;
        } else {
            await showError('Failed to get token: ' + res.msg);
        }
        tokenLoading = false;
    }

    async function refreshToken() {
        tokenLoading = true;
        const res = await refreshPrototypeToken(prototypeId);
        if (res.result === 0) {
            token = res.data.token;
        } else {
            await showError('Failed to refresh token: ' + res.msg);
        }
        tokenLoading = false;
    }

</script>

<PageContainer id="page-prototype">
    {#if loading}
        <Loading />
    {:else if !prototype}
         <NotFound text="Prototype not found" />
    {:else}
        <!-- Prototype Information -->
        <InfoStack title="Prototype Details" display="flex">
            {#snippet headerActions()}
                {#if !isEditing}
                    <AddToModelButton prototypeId={prototype!.prototype_id} prototypeName={prototype!.name} />
                {/if}
                {#if prototype!.is_author}

                    {#if !isEditing}
                        <Button variant="icon-button" onclick={startEditing} aria-label="Edit prototype">
                            <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                        </Button>
                    {:else}
                        <Button variant="icon-button" onclick={cancelEditing} aria-label="Cancel editing">
                            <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </Button>
                        <Button variant="icon-button" onclick={saveChanges} aria-label="Save changes">
                            <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        </Button>
                    {/if}
                {/if}
                
            {/snippet}

            <!-- Details -->
            <InfoStackInput title="Name" id="protoName" bind:value={prototype!.name} readonly={!isEditing} />
            
            <InfoStackInput title="Author" value={prototype!.username || 'Unknown'} readonly>
                {#snippet end()}
                    <Link href="/user/{prototype!.username}" aria-label="Visit Profile">
                        <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                    </Link>
                {/snippet}
            </InfoStackInput>


            <InfoStackTextarea title="Description" id="protoDescription" bind:value={prototype!.description} readonly={!isEditing} />
            
            <InfoStackInput title="Local" value={prototype!.is_local ? 'Yes' : 'No'} readonly />

            <InfoStackInput title="Access Point" id="accessPoint" bind:value={prototype!.access_point} readonly={!isEditing || Boolean(prototype!.is_local)} />
            
            <InfoStackSelect title="Status" id="protoStatus" bind:value={prototype!.status} disabled={!isEditing}>
                <option value="">Not Set</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </InfoStackSelect>
            
            <InfoStackInput title="Max Chats" type="number" id="maxChats" bind:value={prototype!.max_chats} readonly={!isEditing} min="1" />
            
            <InfoStackSelect title="Private" id="protoPrivate" bind:value={prototype!.private} disabled={!isEditing}>
                <option value={false}>No</option>
                <option value={true}>Yes</option>
            </InfoStackSelect>
            
            <InfoStackSelect title="Type" id="protoType" bind:value={prototype!.type} disabled={!isEditing}>
                <option value="token">Token</option>
                <option value="subscription">Subscription</option>
            </InfoStackSelect>

            {#if prototype!.type === 'subscription'}
                <InfoStackSelect title="Billing Interval" id="protoBillingInterval" bind:value={prototype!.billing_interval} disabled={!isEditing}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </InfoStackSelect>
            {/if}
            
            <InfoStackInput title="Charge" type="number" id="protoCharge" bind:value={prototype!.charge} readonly={!isEditing} step="0.01" min="0" />
            
            <InfoStackInput title="Reply Window (sec)" type="number" id="replyWindow" bind:value={prototype!.reply_window} readonly={!isEditing} min="0" />

            {#if prototype!.certified}
                <InfoStackInput title="Certification Status" value="Certified" readonly />
            {/if}

            {#if prototype!.next_prototype_id}
                <InfoStackItem title="Next Version">
                    <Link href="/prototype/{prototype!.next_prototype_id}" block={true}>
                        Version {prototype!.next_prototype_id}
                    </Link>
                </InfoStackItem>
            {/if}

            {#if prototype!.is_author && !prototype!.is_local}
                <InfoStackInput title="Token" value="••••••••••" readonly>
                    {#snippet end()}
                        <Button variant="icon-button" onclick={openTokenModal} aria-label="Show Token">
                            <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                        </Button>
                    {/snippet}
                </InfoStackInput>
            {/if}
        </InfoStack>
    {/if}
</PageContainer>

<TokenModal 
    bind:show={showTokenModal} 
    token={token ?? undefined} 
    loading={tokenLoading} 
    onRefresh={refreshToken} 
/>
