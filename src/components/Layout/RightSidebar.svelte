<script lang="ts">
    import { onMount } from 'svelte';
    import { fetchPlatformSubscription } from '../../proxy/subscription.js';
    import { getUserModelList } from '../../proxy/model.js';
    import { getUserAccountList } from '../../proxy/account.js';
    import { fetchMyPrototypes } from '../../proxy/prototype.js';

    type PlatformSubscription = {
        status?: string | null;
        current_period_end?: string | null;
    } | null;

    type Model = {
        model_id: string;
    };

    type Prototype = {
        prototype_id: number;
    };

    type Account = {
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
            console.error('Failed to load right sidebar overview:', error);
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
    const activeProNormalAccounts = $derived(countAccounts(accounts, { group: 'pro', isLocal: false, disabled: false }));
    const activeProLocalAccounts = $derived(countAccounts(accounts, { group: 'pro', isLocal: true, disabled: false }));
    const disabledProNormalAccounts = $derived(countAccounts(accounts, { group: 'pro', isLocal: false, disabled: true }));
    const disabledProLocalAccounts = $derived(countAccounts(accounts, { group: 'pro', isLocal: true, disabled: true }));
    const freeNormalAccounts = $derived(countAccounts(accounts, { group: 'free', isLocal: false }));
    const freeLocalAccounts = $derived(countAccounts(accounts, { group: 'free', isLocal: true }));
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
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatQuota(used: number, limit: number) {
        return limit > 0 ? `${used}/${limit}` : `${used}/Locked`;
    }

    const subscriptionSummary = $derived.by(() => {
        if (!isPlatformSubscriptionActive) return 'Free';
        const periodEnd = formatDate(subscription?.current_period_end);
        return periodEnd ? `Pro until ${periodEnd}` : 'Pro';
    });

    const resourceSummary = $derived(`Models ${formatQuota(models.length, modelLimit)} · Prototypes ${formatQuota(prototypes.length, prototypeLimit)}`);

    const accountSummary = $derived.by(() => {
        const freeSummary = `Free ${formatQuota(freeNormalAccounts, FREE_NORMAL_ACCOUNT_LIMIT)} normal, ${formatQuota(freeLocalAccounts, FREE_LOCAL_ACCOUNT_LIMIT)} local`;
        const proSummary = `Pro ${formatQuota(activeProNormalAccounts, proNormalLimit)} normal, ${formatQuota(activeProLocalAccounts, proLocalLimit)} local`;
        const disabled = disabledProNormalAccounts + disabledProLocalAccounts;
        return disabled > 0 ? `${freeSummary} · ${proSummary} · Disabled ${disabled}` : `${freeSummary} · ${proSummary}`;
    });
</script>

<div class="right-sidebar">
    <div class="overview-card">
        <h3 class="overview-title">Overview</h3>
        <p class="overview-copy">A quick Sokoyuku snapshot for subscription and usage.</p>
        <div class="overview-sections">
            <div class="overview-section">
                <div class="overview-section-title">Sokoyuku Subscription</div>
                <div class="overview-section-body">{loading ? 'Loading...' : subscriptionSummary}</div>
            </div>
            <div class="overview-section">
                <div class="overview-section-title">Resource Usage</div>
                <div class="overview-section-body">{loading ? 'Loading...' : resourceSummary}</div>
            </div>
            <div class="overview-section">
                <div class="overview-section-title">Account Usage</div>
                <div class="overview-section-body">{loading ? 'Loading...' : accountSummary}</div>
            </div>
        </div>
    </div>
</div>

<style>
    .right-sidebar {
        display: none;
        width: 360px;
        padding: 0.5rem;
        padding-top: 3rem;
    }

    .overview-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
        padding: 1.5rem;
    }

    .overview-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #24292e;
    }

    .overview-copy {
        font-size: 0.875rem;
        line-height: 1.5;
        color: #586069;
        padding-top: 0.5rem;
    }

    .overview-sections {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding-top: 1rem;
    }

    .overview-section {
        border-radius: 8px;
        padding: 0.75rem;
        background: rgba(15, 23, 42, 0.02);
        border: 1px solid rgba(15, 23, 42, 0.06);
    }

    .overview-section-title {
        font-size: 0.9375rem;
        font-weight: 600;
        color: #24292e;
    }

    .overview-section-body {
        font-size: 0.8125rem;
        line-height: 1.45;
        color: #586069;
        padding-top: 0.25rem;
    }

    @media (min-width: 1280px) {
        .right-sidebar {
            display: block;
        }
    }
</style>
