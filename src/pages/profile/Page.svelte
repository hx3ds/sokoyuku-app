<script lang="ts">
    import { onMount } from 'svelte';
    import { fetchProfile, updateProfile, getMyConductorPublicKey, setMyConductorPublicKey } from '../../proxy/user.js';
    import { signOut } from '../../proxy/auth.js';
    import { getStripeConnectStatus, createStripeConnectOnboardingLink } from '../../proxy/payout.js';
    import { fetchPlatformSubscription, fetchSubscriptionPlans, createPlatformSubscriptionCheckout } from '../../proxy/subscription.js';
    import { showError } from '../../components/Modal/state.svelte.js';
    
    import Loading from '../../components/Loading.svelte';
    import PageContainer from '../../components/PageContainer.svelte';
    import Button from '../../components/Button/Button.svelte';
    import TokenModal from '../../components/Modal/TokenModal.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    import InfoStackInput from '../../components/InfoStack/InfoStackInput.svelte';
    import InfoStackTextarea from '../../components/InfoStack/InfoStackTextarea.svelte';

    type Profile = {
        full_name: string;
        description: string;
        email: string;
        username: string;
    };

    type ConnectStatus = {
        connected: boolean;
        account_id?: string;
        details_submitted?: boolean;
        charges_enabled?: boolean;
        payouts_enabled?: boolean;
    };

    type PlatformPlan = {
        plan_id: string;
        name?: string | null;
        description?: string | null;
        price?: number | string | null;
    };

    type PlatformSubscription = {
        status?: string | null;
        current_period_start?: string | null;
        current_period_end?: string | null;
        cancel_at_period_end?: boolean | null;
        plan?: {
            name?: string | null;
            description?: string | null;
            price?: number | string | null;
        } | null;
    } | null;

    const ACTIVE_PLATFORM_STATUSES = ['active', 'trialing', 'past_due'];

    let profile = $state<Profile | null>(null);
    let loading = $state(true);
    let editData = $state<Profile>({
        full_name: '',
        description: '',
        email: '',
        username: ''
    });
    let isEditing = $state(false);

    // Email Visibility State
    let isEmailVisible = $state(false);

    let connectStatus = $state<ConnectStatus | null>(null);
    let connectLoading = $state(false);
    let connectSubmitting = $state(false);
    let platformSubscription = $state<PlatformSubscription>(null);
    let platformPlans = $state<PlatformPlan[]>([]);
    let platformSubscriptionSubmitting = $state(false);

    let conductorPublicKey = $state('');
    let conductorPublicKeyLoading = $state(false);
    let showConductorPublicKeyModal = $state(false);
    let conductorPublicKeyDraft = $state('');
    let conductorPublicKeySaving = $state(false);

    // List Items Configuration
    const devItems = [
        { href: '/overview', title: 'Overview' },
        { href: '/my-prototypes', title: 'My Prototypes' },
        { href: '/notifications', title: 'Notifications' }
    ];

    const billingItems = [
        { href: '/credits', title: 'Credits' },
        { href: '/my-subscriptions', title: 'My Subscriptions' },
        { href: '/payment-history', title: 'Payment History' }
    ];

    const payoutItems = [
        { href: '/payout-details', title: 'Payout Details', description: 'Check payout details for each prototype' }
    ];

    onMount(async () => {
        await loadProfile();
        await loadConnectStatus();
        await loadConductorPublicKey();
        await loadPlatformSubscription();
    });

    async function loadProfile() {
        loading = true;
        try {
            const profileData = await fetchProfile();
            profile = profileData as Profile;
            editData = { ...(profileData as Profile) };
        } catch (e) {
            console.error('Error loading profile:', e);
        }
        loading = false;
    }

    async function loadConnectStatus() {
        connectLoading = true;
        const res = await getStripeConnectStatus();
        if (res.result === 0) {
            connectStatus = res.data as ConnectStatus;
        } else {
            connectStatus = null;
        }
        connectLoading = false;
    }

    async function loadConductorPublicKey() {
        conductorPublicKeyLoading = true;
        try {
            const key = await getMyConductorPublicKey({ refresh: true });
            conductorPublicKey = String(key || '');
            conductorPublicKeyDraft = conductorPublicKey;
        } catch (e) {
            console.error('Error loading conductor public key:', e);
        }
        conductorPublicKeyLoading = false;
    }

    async function loadPlatformSubscription() {
        try {
            const [subscriptionRes, plans] = await Promise.all([
                fetchPlatformSubscription(),
                fetchSubscriptionPlans()
            ]);
            platformSubscription = subscriptionRes?.result === 0 ? (subscriptionRes.data as PlatformSubscription) : null;
            platformPlans = Array.isArray(plans) ? (plans as PlatformPlan[]) : [];
        } catch (e) {
            console.error('Error loading Sokoyuku subscription:', e);
            platformSubscription = null;
            platformPlans = [];
        }
    }

    function openConductorPublicKeyModal() {
        conductorPublicKeyDraft = conductorPublicKey;
        showConductorPublicKeyModal = true;
    }

    async function saveConductorPublicKey() {
        const next = String(conductorPublicKeyDraft || '').trim();
        if (next && !next.startsWith('lcpk1:')) {
            await showError('Invalid conductor public key token. It must start with "lcpk1:".');
            return;
        }
        conductorPublicKeySaving = true;
        try {
            const res = await setMyConductorPublicKey(next);
            if (res.result !== 0) {
                await showError('Failed to update conductor public key: ' + res.msg);
                return;
            }
            conductorPublicKey = String(res.data?.conductor_public_key || '');
            conductorPublicKeyDraft = conductorPublicKey;
            showConductorPublicKeyModal = false;
        } finally {
            conductorPublicKeySaving = false;
        }
    }

    async function handleStripeConnect() {
        connectSubmitting = true;
        const res = await createStripeConnectOnboardingLink({
            returnUrl: `${window.location.origin}/profile`,
            refreshUrl: `${window.location.origin}/profile`
        });
        connectSubmitting = false;
        if (res.result !== 0) {
            await showError('Failed to start Stripe Connect setup: ' + res.msg);
            return;
        }
        const url = res.data?.url;
        if (url) {
            window.location.href = url;
        }
    }

    async function handlePlatformSubscriptionCheckout() {
        const selectedPlanId = String(platformPlans?.[0]?.plan_id || '').trim();
        if (!selectedPlanId) {
            await showError('No Sokoyuku subscription plan is available right now.');
            return;
        }

        platformSubscriptionSubmitting = true;
        try {
            const res = await createPlatformSubscriptionCheckout({
                plan_id: selectedPlanId,
                success_url: `${window.location.origin}/profile?subscription_success=1`,
                cancel_url: `${window.location.origin}/profile?subscription_cancel=1`
            });
            if (res.result !== 0) {
                await showError('Failed to start Sokoyuku subscription checkout: ' + res.msg);
                return;
            }
            if (res.data?.url) {
                window.location.href = res.data.url;
            }
        } finally {
            platformSubscriptionSubmitting = false;
        }
    }

    function handleEdit() {
        if (!profile) return;
        editData = { ...profile };
        isEditing = true;
    }

    function handleCancel() {
        if (!profile) return;
        editData = { ...profile };
        isEditing = false;
    }

    async function handleSave() {
        const res = await updateProfile({
            full_name: editData.full_name,
            description: editData.description
        });

        if (res.result === 0) {
            if (!profile) return;
            profile = {
                ...profile,
                full_name: editData.full_name,
                description: editData.description
            };
            isEditing = false;
        } else {
            await showError('Failed to update profile: ' + res.msg);
        }
    }

    function toggleEmail() {
        isEmailVisible = !isEmailVisible;
    }

    async function handleSignOut() {
        await signOut();
    }

    function formatDate(dateString?: string | null) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    const isPlatformSubscriptionActive = $derived(
        ACTIVE_PLATFORM_STATUSES.includes(String(platformSubscription?.status || '').toLowerCase())
    );

    const hasPlatformSubscriptionHistory = $derived(Boolean(platformSubscription));

    const subscriptionStatusLabel = $derived.by(() => {
        if (!isPlatformSubscriptionActive) return 'Free';
        const periodEnd = formatDate(platformSubscription?.current_period_end);
        return periodEnd ? `Pro until ${periodEnd}` : 'Pro';
    });

    const subscriptionActionLabel = $derived(hasPlatformSubscriptionHistory ? 'Renew' : 'Upgrade');
    const showPlatformSubscriptionAction = $derived(
        !isPlatformSubscriptionActive || Boolean(platformSubscription?.cancel_at_period_end)
    );
</script>

<PageContainer id="page-profile">
    {#if loading}
        <Loading />
    {:else if profile}
        <!-- Profile Information -->
        <InfoStack 
            title="My Information" 
            {isEditing}
            onedit={handleEdit}
            oncancel={handleCancel}
            onsave={handleSave}
        >
            <InfoStackInput title="Full Name" bind:value={editData.full_name} readonly={!isEditing} />
            
            <InfoStackInput title="Email" value={isEmailVisible ? editData.email : '••••••••••'} readonly>
                {#snippet end()}
                    <Button variant="icon-button" onclick={toggleEmail} aria-label={isEmailVisible ? "Hide Email" : "Show Email"}>
                        {#if isEmailVisible}
                            <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                        {:else}
                            <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                        {/if}
                    </Button>
                {/snippet}
            </InfoStackInput>
            
            <InfoStackInput title="Username" value={editData.username} readonly />

            <InfoStackTextarea id="profileDescription" title="Description" bind:value={editData.description} readonly={!isEditing} placeholder="Tell us about yourself" />

            <InfoStackInput title="Sokoyuku Subscription" value={subscriptionStatusLabel} readonly>
                {#snippet end()}
                    {#if showPlatformSubscriptionAction}
                        <Button
                            variant="text-button"
                            padding="0.25rem 0.75rem"
                            onclick={handlePlatformSubscriptionCheckout}
                            loading={platformSubscriptionSubmitting}
                        >
                            {subscriptionActionLabel}
                        </Button>
                    {/if}
                {/snippet}
            </InfoStackInput>
        </InfoStack>

        <!-- Development -->
        <InfoStack title="Development" showTitle={false}>
            {#each devItems as item}
                <InfoStackItem {...item} />
            {/each}
        </InfoStack>

        <!-- Billing -->
        <InfoStack title="Billing" showTitle={false}>
            {#each billingItems as item}
                <InfoStackItem {...item} />
            {/each}
        </InfoStack>

        <InfoStack title="Payout">
            <InfoStackInput
                title="Stripe Connect"
                value={connectLoading ? 'Checking status...' : (connectStatus?.connected ? `Connected${connectStatus?.payouts_enabled ? ' · Payouts enabled' : ''}` : 'Not connected')}
                readonly
            >
                {#snippet end()}
                    <Button
                        variant="text-button"
                        padding="0.25rem 0.75rem"
                        onclick={handleStripeConnect}
                        loading={connectSubmitting}
                    >
                        {connectStatus?.connected ? 'Update' : 'Connect'}
                    </Button>
                {/snippet}
            </InfoStackInput>

            {#each payoutItems as item}
                <InfoStackItem {...item} />
            {/each}
        </InfoStack>

        <InfoStack
            title="Local Conductor"
            loading={conductorPublicKeyLoading}
        >
            <InfoStackInput
                title="Conductor Public Key"
                value={conductorPublicKey ? '••••••••••' : 'Not set'}
                readonly
            >
                {#snippet end()}
                    <Button
                        variant="icon-button"
                        onclick={openConductorPublicKeyModal}
                        aria-label={conductorPublicKey ? 'Show Conductor Public Key' : 'Set Conductor Public Key'}
                    >
                        <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                    </Button>
                {/snippet}
            </InfoStackInput>
        </InfoStack>

        <!-- Sign Out -->
        <InfoStack title="Sign Out" showTitle={false}>
            <InfoStackItem title="Sign Out">
                {#snippet actions()}
                    <Button variant="icon-button" onclick={handleSignOut} aria-label="Sign Out">
                        <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                    </Button>
                {/snippet}
            </InfoStackItem>
        </InfoStack>
    {:else}
        <div style="color: #ff3b30; text-align: center; padding: 2rem;">Failed to load profile.</div>
    {/if}
</PageContainer>

<TokenModal
    bind:show={showConductorPublicKeyModal}
    bind:token={conductorPublicKeyDraft}
    loading={conductorPublicKeyLoading}
    saving={conductorPublicKeySaving}
    title="Conductor Public Key"
    fieldTitle="Conductor Public Key"
    editable={true}
    placeholder="lcpk1:..."
    copyButtonAriaLabel="Copy Conductor Public Key"
    copySuccessMessage="Conductor public key copied to clipboard"
    copyErrorMessage="Failed to copy conductor public key"
    onSave={saveConductorPublicKey}
/>
