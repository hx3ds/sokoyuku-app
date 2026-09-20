<script lang="ts">
    import { modelStore } from '../../store/models.svelte.js';
    import { accountStore } from '../../store/accounts.svelte.js';
    import { prototypeStore } from '../../store/prototypes.svelte.js';
    import { subscriptionStore } from '../../store/subscription.svelte.js';
    import { formatDate as formatLocaleDate, t } from '../../i18n/locale.svelte.js';

    type PlatformSubscription = {
        status?: string | null;
        current_period_end?: string | null;
    } | null;

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

    const loading = $derived(
        !modelStore.initialized || !accountStore.initialized || !prototypeStore.initialized || !subscriptionStore.initialized
    );
    const subscription = $derived(subscriptionStore.subscription as PlatformSubscription);
    const models = $derived(modelStore.models);
    const prototypes = $derived(prototypeStore.prototypes);
    const accounts = $derived(accountStore.accounts as Account[]);

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
        return formatLocaleDate(dateString);
    }

    function formatQuota(used: number, limit: number) {
        return limit > 0 ? `${used}/${limit}` : t('{used}/Locked', { used });
    }

    const subscriptionSummary = $derived.by(() => {
        if (!isPlatformSubscriptionActive) return t('Free');
        const periodEnd = formatDate(subscription?.current_period_end);
        return periodEnd ? t('Pro until {date}', { date: periodEnd }) : t('Pro');
    });

    const resourceSummary = $derived(t('Models {models} · Prototypes {prototypes}', {
        models: formatQuota(models.length, modelLimit),
        prototypes: formatQuota(prototypes.length, prototypeLimit),
    }));

    const accountSummary = $derived.by(() => {
        const freeSummary = t('Free {normal} normal, {local} local', {
            normal: formatQuota(freeNormalAccounts, FREE_NORMAL_ACCOUNT_LIMIT),
            local: formatQuota(freeLocalAccounts, FREE_LOCAL_ACCOUNT_LIMIT),
        });
        const proSummary = t('Pro {normal} normal, {local} local', {
            normal: formatQuota(activeProNormalAccounts, proNormalLimit),
            local: formatQuota(activeProLocalAccounts, proLocalLimit),
        });
        const disabled = disabledProNormalAccounts + disabledProLocalAccounts;
        return disabled > 0 ? `${freeSummary} · ${proSummary} · ${t('Disabled {count}', { count: disabled })}` : `${freeSummary} · ${proSummary}`;
    });
</script>

<div class="right-sidebar">
    <div class="overview-card">
        <h3 class="overview-title">{t('Overview')}</h3>
        <p class="overview-copy">{t('A quick Sokoyuku snapshot for subscription and usage.')}</p>
        <div class="overview-sections">
            <div class="overview-section">
                <div class="overview-section-title">{t('Sokoyuku Subscription')}</div>
                <div class="overview-section-body">{loading ? t('Loading...') : subscriptionSummary}</div>
            </div>
            <div class="overview-section">
                <div class="overview-section-title">{t('Resource Usage')}</div>
                <div class="overview-section-body">{loading ? t('Loading...') : resourceSummary}</div>
            </div>
            <div class="overview-section">
                <div class="overview-section-title">{t('Account Usage')}</div>
                <div class="overview-section-body">{loading ? t('Loading...') : accountSummary}</div>
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
