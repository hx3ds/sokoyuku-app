<script lang="ts">
    import { onMount } from 'svelte';
    import { fetchPlatformSubscription } from '../../proxy/subscription.js';
    import { getUserModelList } from '../../proxy/model.js';
    import { getUserAccountList } from '../../proxy/account.js';
    import { fetchMyPrototypes } from '../../proxy/prototype.js';

    import Loading from '../../components/Loading.svelte';
    import PageContainer from '../../components/PageContainer.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    import InfoStackBadge from '../../components/InfoStack/InfoStackBadge.svelte';
    import { formatDate as formatLocaleDate, formatMoney as formatLocaleMoney, t, tStatus } from '../../i18n/locale.svelte.js';

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

    type Model = {
        model_id: string;
    };

    type Prototype = {
        prototype_id: number;
    };

    type Account = {
        account_id: string;
        account_group?: 'free' | 'pro' | string | null;
        is_local?: boolean;
        subscription_disabled?: boolean;
    };

    const FREE_MODEL_LIMIT = 40;
    const PRO_MODEL_LIMIT = 240;
    const FREE_PROTOTYPE_LIMIT = 20;
    const PRO_PROTOTYPE_LIMIT = 120;
    const FREE_NORMAL_ACCOUNT_LIMIT = 10;
    const FREE_LOCAL_ACCOUNT_LIMIT = 40;
    const PRO_NORMAL_ACCOUNT_LIMIT = 60;
    const PRO_LOCAL_ACCOUNT_LIMIT = 240;
    const ACTIVE_PLATFORM_STATUSES = ['active', 'trialing', 'past_due'];

    let loading = $state(true);
    let subscription = $state<PlatformSubscription>(null);
    let models = $state<Model[]>([]);
    let prototypes = $state<Prototype[]>([]);
    let accounts = $state<Account[]>([]);

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        loading = true;
        try {
            const [subscriptionRes, modelRes, prototypeList, accountRes] = await Promise.all([
                fetchPlatformSubscription(),
                getUserModelList(),
                fetchMyPrototypes(),
                getUserAccountList()
            ]);

            subscription = subscriptionRes?.result === 0 ? (subscriptionRes.data as PlatformSubscription) : null;
            models = modelRes?.result === 0 ? ((modelRes.data?.models || []) as Model[]) : [];
            prototypes = Array.isArray(prototypeList) ? (prototypeList as Prototype[]) : [];
            accounts = accountRes?.result === 0 ? ((accountRes.data?.accounts || []) as Account[]) : [];
        } catch (error) {
            console.error('Failed to load overview data:', error);
            subscription = null;
            models = [];
            prototypes = [];
            accounts = [];
        } finally {
            loading = false;
        }
    }

    const hasPlatformSubscriptionHistory = $derived(Boolean(subscription));
    const isPlatformSubscriptionActive = $derived(
        ACTIVE_PLATFORM_STATUSES.includes(String(subscription?.status || '').toLowerCase())
    );
    const modelLimit = $derived(hasPlatformSubscriptionHistory ? PRO_MODEL_LIMIT : FREE_MODEL_LIMIT);
    const prototypeLimit = $derived(hasPlatformSubscriptionHistory ? PRO_PROTOTYPE_LIMIT : FREE_PROTOTYPE_LIMIT);

    const freeNormalAccounts = $derived(countAccounts(accounts, { group: 'free', isLocal: false }));
    const freeLocalAccounts = $derived(countAccounts(accounts, { group: 'free', isLocal: true }));
    const proNormalAccounts = $derived(countAccounts(accounts, { group: 'pro', isLocal: false }));
    const proLocalAccounts = $derived(countAccounts(accounts, { group: 'pro', isLocal: true }));
    const activeProNormalAccounts = $derived(countAccounts(accounts, { group: 'pro', isLocal: false, disabled: false }));
    const activeProLocalAccounts = $derived(countAccounts(accounts, { group: 'pro', isLocal: true, disabled: false }));
    const disabledProNormalAccounts = $derived(countAccounts(accounts, { group: 'pro', isLocal: false, disabled: true }));
    const disabledProLocalAccounts = $derived(countAccounts(accounts, { group: 'pro', isLocal: true, disabled: true }));

    const proNormalLimit = $derived(isPlatformSubscriptionActive ? PRO_NORMAL_ACCOUNT_LIMIT : 0);
    const proLocalLimit = $derived(isPlatformSubscriptionActive ? PRO_LOCAL_ACCOUNT_LIMIT : 0);

    function countAccounts(
        list: Account[],
        filters: { group: 'free' | 'pro'; isLocal: boolean; disabled?: boolean | null }
    ) {
        return (Array.isArray(list) ? list : []).filter((account) => {
            const group = String(account?.account_group || 'free').toLowerCase();
            const isLocal = Boolean(account?.is_local);
            const disabled = Boolean(account?.subscription_disabled);
            if (group !== filters.group) return false;
            if (isLocal !== filters.isLocal) return false;
            if (filters.disabled === undefined || filters.disabled === null) return true;
            return disabled === filters.disabled;
        }).length;
    }

    function formatDate(dateString?: string | null) {
        return formatLocaleDate(dateString) || t('N/A');
    }

    function formatMoney(value?: string | number | null) {
        return formatLocaleMoney(value, 'USD');
    }

    function formatQuota(used: number, limit: number) {
        return limit > 0 ? `${used} / ${limit}` : t('{used}/Locked', { used });
    }

    function usageTone(used: number, limit: number) {
        if (limit <= 0) return 'locked';
        if (used > limit) return 'danger';
        if (used === limit) return 'warning';
        return 'ok';
    }

    function statusTone(status?: string | null) {
        const normalized = String(status || '').toLowerCase();
        if (ACTIVE_PLATFORM_STATUSES.includes(normalized)) return 'ok';
        if (normalized === 'canceled' || normalized === 'unpaid' || normalized === 'incomplete_expired') return 'warning';
        if (normalized) return 'muted';
        return 'muted';
    }

    function toneLabel(tone: string) {
        if (tone === 'danger') return t('Over');
        if (tone === 'warning') return t('At limit');
        if (tone === 'locked') return t('Locked');
        if (tone === 'ok') return t('Available');
        return t('Info');
    }
</script>

<PageContainer id="page-overview" maxWidth="max-w-4xl">
    {#if loading}
        <Loading />
    {:else}
        <InfoStack title="Sokoyuku Subscription">
            <InfoStackItem
                title={subscription?.plan?.name || t('Free Access')}
                description={subscription?.plan?.description || t('Free plan with Sokoyuku default quotas.')}
            >
                {#snippet titleSuffix()}
                    <InfoStackBadge class="status-badge {statusTone(subscription?.status)}" label={tStatus(subscription?.status || 'free')} />
                {/snippet}
                <div class="overview-body">
                    <div><strong>{t('Current access:')}</strong> {isPlatformSubscriptionActive ? t('Pro active') : t('Free mode')}</div>
                    <div><strong>{t('Pro unlocked permanently:')}</strong> {hasPlatformSubscriptionHistory ? t('Yes') : t('No')}</div>
                    <div><strong>{t('Monthly price:')}</strong> {subscription?.plan ? formatMoney(subscription.plan.price) : formatMoney(0)}</div>
                    <div><strong>{t('Current period end:')}</strong> {formatDate(subscription?.current_period_end)}</div>
                    {#if subscription?.cancel_at_period_end}
                        <div class="note-warning">{t('Subscription will cancel at the end of the current period.')}</div>
                    {/if}
                    {#if !isPlatformSubscriptionActive}
                        <div class="note-muted">{t('Pro account groups stay locked until a platform subscription becomes active again.')}</div>
                    {/if}
                </div>
            </InfoStackItem>
        </InfoStack>

        <InfoStack title="Resource Usage">
            <InfoStackItem
                title={t('Models')}
                description={t('Your total models. The higher limit stays unlocked forever after any Pro subscription.')}
            >
                {#snippet titleSuffix()}
                    <InfoStackBadge class="status-badge {usageTone(models.length, modelLimit)}" label={toneLabel(usageTone(models.length, modelLimit))} />
                {/snippet}
                <div class="overview-body">
                    <div><strong>{t('Usage:')}</strong> {formatQuota(models.length, modelLimit)}</div>
                    <div><strong>{t('Limit rule:')}</strong> {hasPlatformSubscriptionHistory ? t('Pro-unlocked permanent cap') : t('Free cap')}</div>
                </div>
            </InfoStackItem>

            <InfoStackItem
                title={t('Prototypes')}
                description={t('Your published and draft prototypes. This cap also stays unlocked forever after Pro.')}
            >
                {#snippet titleSuffix()}
                    <InfoStackBadge class="status-badge {usageTone(prototypes.length, prototypeLimit)}" label={toneLabel(usageTone(prototypes.length, prototypeLimit))} />
                {/snippet}
                <div class="overview-body">
                    <div><strong>{t('Usage:')}</strong> {formatQuota(prototypes.length, prototypeLimit)}</div>
                    <div><strong>{t('Limit rule:')}</strong> {hasPlatformSubscriptionHistory ? t('Pro-unlocked permanent cap') : t('Free cap')}</div>
                </div>
            </InfoStackItem>
        </InfoStack>

        <InfoStack title="Account Usage">
            <InfoStackItem
                title={t('Free Accounts')}
                description={t('Free-group accounts remain usable without a platform subscription.')}
            >
                <div class="overview-body">
                    <div><strong>{t('Normal:')}</strong> {formatQuota(freeNormalAccounts, FREE_NORMAL_ACCOUNT_LIMIT)}</div>
                    <div><strong>{t('Local:')}</strong> {formatQuota(freeLocalAccounts, FREE_LOCAL_ACCOUNT_LIMIT)}</div>
                </div>
            </InfoStackItem>

            <InfoStackItem
                title={t('Pro Accounts')}
                description={t('Pro-group accounts only stay active while your platform subscription is active.')}
            >
                {#snippet titleSuffix()}
                    <InfoStackBadge
                        class="status-badge {isPlatformSubscriptionActive ? 'ok' : 'locked'}"
                        label={isPlatformSubscriptionActive ? t('Pro active') : t('Subscription inactive')}
                    />
                {/snippet}
                <div class="overview-body">
                    <div><strong>{t('Normal:')}</strong> {formatQuota(activeProNormalAccounts, proNormalLimit)}</div>
                    <div><strong>{t('Local:')}</strong> {formatQuota(activeProLocalAccounts, proLocalLimit)}</div>
                    <div><strong>{t('Total pro normal accounts:')}</strong> {proNormalAccounts}</div>
                    <div><strong>{t('Total pro local accounts:')}</strong> {proLocalAccounts}</div>
                    {#if disabledProNormalAccounts > 0 || disabledProLocalAccounts > 0}
                        <div class="note-warning">
                            {t('Disabled by subscription: {normal} normal, {local} local', { normal: disabledProNormalAccounts, local: disabledProLocalAccounts })}
                        </div>
                    {/if}
                </div>
            </InfoStackItem>
        </InfoStack>
    {/if}
</PageContainer>

<style>
    .overview-body {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding-top: 0.25rem;
        font-size: 0.875rem;
        color: var(--color-text-secondary, #586069);
    }

    :global(.info-stack-badge.status-badge) {
        font-weight: 600;
        text-transform: capitalize;
    }

    :global(.info-stack-badge.status-badge.ok) {
        background: rgba(16, 185, 129, 0.12);
        color: rgb(4, 120, 87);
    }

    :global(.info-stack-badge.status-badge.warning) {
        background: rgba(245, 158, 11, 0.14);
        color: rgb(180, 83, 9);
    }

    :global(.info-stack-badge.status-badge.danger) {
        background: rgba(239, 68, 68, 0.12);
        color: rgb(185, 28, 28);
    }

    :global(.info-stack-badge.status-badge.locked),
    :global(.info-stack-badge.status-badge.muted) {
        background: rgba(107, 114, 128, 0.12);
        color: rgb(75, 85, 99);
    }

    .note-warning {
        color: rgb(180, 83, 9);
        font-weight: 500;
    }

    .note-muted {
        color: var(--color-text-muted, #6b7280);
    }
</style>
