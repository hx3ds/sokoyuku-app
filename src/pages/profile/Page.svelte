<script lang="ts">
    import { onMount } from 'svelte';
    import { fetchProfile, updateProfile } from '../../proxy/user.js';
    import { signOut } from '../../proxy/auth.js';
    import { getStripeConnectStatus, createStripeConnectOnboardingLink } from '../../proxy/payout.js';
    import { showError } from '../../components/Modal/state.svelte.js';
    
    import Loading from '../../components/Loading.svelte';
    import PageContainer from '../../components/PageContainer.svelte';
    import Button from '../../components/Button/Button.svelte';
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

    // List Items Configuration
    const devItems = [
        { href: '/my-prototypes', title: 'My Prototypes' },
        { href: '/notifications', title: 'Notifications' }
    ];

    const billingItems = [
        { href: '/credits', title: 'Credits' },
        { href: '/my-subscriptions', title: 'My Subscriptions' },
        { href: '/payment-history', title: 'Payment History' }
    ];

    onMount(async () => {
        await loadProfile();
        await loadConnectStatus();
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

        <InfoStack title="Payout" showTitle={false}>
            <InfoStackItem
                title="Stripe Connect"
                description={connectLoading ? 'Checking status...' : (connectStatus?.connected ? `Connected${connectStatus?.payouts_enabled ? ' · Payouts enabled' : ''}` : 'Not connected')}
            >
                {#snippet actions()}
                    <Button
                        variant="text-button"
                        onclick={handleStripeConnect}
                        loading={connectSubmitting}
                    >
                        {connectStatus?.connected ? 'Update' : 'Connect'}
                    </Button>
                {/snippet}
            </InfoStackItem>
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
