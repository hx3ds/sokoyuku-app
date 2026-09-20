<script lang="ts">
    import { onMount } from 'svelte';
    import { fetchAllSubscriptions, cancelPlatformSubscription, cancelModelSubscription } from '../../proxy/subscription.js';
    import { showError, showConfirm } from '../../components/Modal/state.svelte.js';
    import { formatDate as formatLocaleDate, formatMoney, t } from '../../i18n/locale.svelte.js';
    import PageContainer from '../../components/PageContainer.svelte';
    import Loading from '../../components/Loading.svelte';
    import Button from '../../components/Button/Button.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    import InfoStackBadge from '../../components/InfoStack/InfoStackBadge.svelte';

    type PlatformPlan = {
        name: string;
        description?: string | null;
        price: number;
        interval?: string | null;
    };

    type PlatformSubscription = {
        subscription_id?: string;
        status: string;
        current_period_end?: string;
        cancel_at_period_end?: boolean;
        plan: PlatformPlan;
    };

    type ModelPrototype = {
        name: string;
        description?: string | null;
        billing_interval?: string | null;
        interval_charge: number;
    };

    type ModelSubscription = {
        model_id: string;
        period?: string | null;
        auto_renew?: boolean;
        status?: string;
        subscription_tier?: string | null;
        prototype: ModelPrototype;
    };

    type SubscriptionsResponse = {
        platform: PlatformSubscription | null;
        models: ModelSubscription[];
    };

    let platformSub = $state<PlatformSubscription | null>(null);
    let modelSubs = $state<ModelSubscription[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let processingId = $state<string | null>(null); // ID of subscription being cancelled

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        loading = true;
        try {
            const data = await fetchAllSubscriptions() as unknown as SubscriptionsResponse;
            platformSub = data.platform;
            modelSubs = data.models || [];
        } catch (err) {
            console.error('Error loading subscriptions:', err);
            error = t('Failed to load subscriptions');
        } finally {
            loading = false;
        }
    }

    async function handleCancelPlatform() {
        if (!await showConfirm(t('Are you sure you want to cancel your platform subscription? You will lose access to premium features at the end of the current period.'))) return;
        
        processingId = 'platform';
        try {
            const res = await cancelPlatformSubscription();
            if (res.result === 0) {
                // Refresh data
                await loadData();
            } else {
                await showError(t('Failed to cancel subscription: {msg}', { msg: res.msg }));
            }
        } catch (err) {
            await showError(t('Error cancelling subscription'));
        } finally {
            processingId = null;
        }
    }

    async function handleCancelModel(modelId: string) {
        if (!await showConfirm(t('Are you sure you want to cancel this model subscription? Auto-renewal will be disabled.'))) return;

        processingId = modelId;
        try {
            const res = await cancelModelSubscription(modelId);
            if (res.result === 0) {
                await loadData();
            } else {
                await showError(t('Failed to cancel subscription: {msg}', { msg: res.msg }));
            }
        } catch (err) {
            await showError(t('Error cancelling subscription'));
        } finally {
            processingId = null;
        }
    }

    function formatDate(dateString?: string | null) {
        if (!dateString) return t('N/A');
        return formatLocaleDate(dateString) || t('N/A');
    }
    
    function formatCurrency(amount?: number | null) {
        return formatMoney(amount, 'USD');
    }
</script>

<PageContainer id="page-my-subscriptions" maxWidth="max-w-4xl">
    {#if loading}
        <Loading />
    {:else if error}
        <div style="text-align: center; padding-top: 2rem; padding-bottom: 2rem; color: #ef4444;">{error}</div>
    {:else}
        <!-- Platform Subscription -->
        <InfoStack 
            title="Platform Subscription" 
            empty={!(platformSub && ['active', 'trialing', 'past_due'].includes(platformSub.status))}
            emptyText="No active platform subscription"
        >
            {#if platformSub && ['active', 'trialing', 'past_due'].includes(platformSub.status)}
                <InfoStackItem 
                    title={platformSub!.plan.name} 
                    description={platformSub!.plan.description ?? ''}
                    lines={3}
                >
                    {#snippet titleSuffix()}
                        {#if platformSub!.status === 'past_due'}
                            <InfoStackBadge class="past-due-badge" label="Past Due" />
                        {:else if platformSub!.status === 'trialing'}
                            <InfoStackBadge class="trial-badge" label="Trial" />
                        {/if}
                    {/snippet}

                    <div style="padding-top: 0.25rem; font-size: 0.875rem; color: var(--color-text-secondary);">
                        <span style="font-weight: 500;">{t('Price:')}</span> {formatCurrency(platformSub!.plan.price)}/{t(platformSub!.plan.interval || 'month')}
                        <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                        <span style="font-weight: 500;">{t('Next Payment:')}</span> {formatDate(platformSub!.current_period_end)}
                        
                        {#if platformSub!.cancel_at_period_end}
                            <div style="padding-top: 0.25rem; color: #d97706; font-weight: 500;">
                                {t('Cancels at end of period')}
                            </div>
                        {/if}
                    </div>

                    {#snippet actions()}
                        {#if !platformSub!.cancel_at_period_end}
                            <Button 
                                variant="text-button"
                                className="compact-action"
                                onclick={handleCancelPlatform} 
                                disabled={processingId === 'platform'}
                            >
                                {processingId === 'platform' ? t('Processing...') : t('Cancel Subscription')}
                            </Button>
                        {/if}
                    {/snippet}
                </InfoStackItem>
            {/if}
        </InfoStack>

        <!-- Model Subscriptions -->
        <InfoStack title="Model Subscriptions" empty={modelSubs.length === 0} emptyText="No active model subscriptions.">
            {#each modelSubs as sub}
                <InfoStackItem 
                    title={sub.prototype.name} 
                    description={sub.prototype.description ?? ''}
                    href="/model/{sub.model_id}"
                >
                    <div style="padding-top: 0.25rem; font-size: 0.875rem; color: var(--color-text-secondary);">
                        {#if sub.subscription_tier}
                            <span style="font-weight: 500;">{t('Tier:')}</span> {sub.subscription_tier}
                            <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                        {/if}
                        <span style="font-weight: 500;">{t('Price:')}</span> {formatCurrency(sub.prototype.interval_charge)}/{t(sub.prototype.billing_interval || 'monthly')}
                        <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                        <span style="font-weight: 500;">{t('Available Until:')}</span> {formatDate(sub.period)}
                        
                        {#if !sub.auto_renew && sub.status === 'active'}
                            <div style="padding-top: 0.25rem; color: #d97706; font-weight: 500;">
                                {t('Auto-renew disabled')}
                            </div>
                        {/if}
                    </div>

                    {#snippet actions()}
                        {#if sub.auto_renew}
                            <Button 
                                variant="text-button"
                                className="compact-action"
                                onclick={(e: MouseEvent) => {
                                    e.preventDefault();
                                    handleCancelModel(sub.model_id);
                                }}
                                disabled={processingId === sub.model_id}
                            >
                                {processingId === sub.model_id ? t('Processing...') : t('Cancel Subscription')}
                            </Button>
                        {/if}
                    {/snippet}
                </InfoStackItem>
            {/each}
        </InfoStack>
    {/if}
</PageContainer>

<style>
    :global(#page-my-subscriptions .compact-action) {
        white-space: normal;
        width: auto;
        max-width: 5.5rem;
        line-height: 1.2;
        text-align: center;
        padding: 0.25rem 0.5rem;
    }

    :global(.info-stack-badge.past-due-badge) {
        background-color: #fee2e2;
        color: #991b1b;
    }

    :global(.info-stack-badge.trial-badge) {
        background-color: #dbeafe;
        color: #1e40af;
    }
</style>

