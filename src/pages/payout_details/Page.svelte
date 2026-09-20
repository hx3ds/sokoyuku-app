<script lang="ts">
    import { onMount } from 'svelte';
    import PageContainer from '../../components/PageContainer.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    import { fetchMyPrototypePayoutDetails } from '../../proxy/prototype.js';
    import { formatDate as formatLocaleDate, formatMoney, t, tStatus } from '../../i18n/locale.svelte.js';

    type PrototypePayoutSummary = {
        currency: string;
        event_count: number;
        gross_amount: number;
        platform_fee_amount: number;
        net_amount: number;
        paid_net_amount: number;
        pending_net_amount: number;
        failed_net_amount: number;
        paid_event_count: number;
        pending_event_count: number;
        failed_event_count: number;
        last_event_at?: string | null;
    };

    type AggregatePayoutRecord = PrototypePayoutRecord & {
        prototype_id: number;
        prototype_name?: string;
    };

    type AggregateRevenueEvent = PrototypeRevenueEvent & {
        prototype_id: number;
        prototype_name?: string;
    };

    type PrototypePayoutRecord = {
        payout_id: string;
        currency: string;
        gross_amount: number;
        platform_fee_amount: number;
        net_amount: number;
        event_count: number;
        status: string;
        created_at?: string | null;
        paid_at?: string | null;
        last_error?: string | null;
    };

    type PrototypeRevenueEvent = {
        event_id: string;
        source_type: string;
        source_id: string;
        currency: string;
        gross_amount: number;
        platform_fee_amount: number;
        net_amount: number;
        status: string;
        payout_id?: string | null;
        created_at?: string | null;
        paid_at?: string | null;
        last_error?: string | null;
    };

    type PrototypePayoutDetails = {
        summary_by_currency: PrototypePayoutSummary[];
        payouts: PrototypePayoutRecord[];
        events: PrototypeRevenueEvent[];
        has_data: boolean;
    };

    type PrototypeWithPayouts = {
        prototype_id: number;
        name?: string;
        description?: string | null;
        payout_details?: PrototypePayoutDetails | null;
    };

    let loading = $state(true);
    let prototypes = $state<PrototypeWithPayouts[]>([]);

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        loading = true;
        try {
            prototypes = await fetchMyPrototypePayoutDetails() as PrototypeWithPayouts[];
        } finally {
            loading = false;
        }
    }

    function formatDate(dateString?: string | null) {
        return formatLocaleDate(dateString) || t('Unknown date');
    }

    function formatCurrency(amount?: number | string | null, currency = 'usd') {
        return formatMoney(amount, currency);
    }

    function formatStatusLabel(status?: string | null) {
        return tStatus(status);
    }

    function describeEventSource(event: PrototypeRevenueEvent) {
        const sourceType = String(event.source_type || '').replace(/_/g, ' ').trim();
        const label = sourceType
            ? t(sourceType.charAt(0).toUpperCase() + sourceType.slice(1))
            : t('Revenue event');
        return event.source_id ? `${label} ${event.source_id}` : label;
    }

    function getSortDate(value?: string | null) {
        if (!value) return 0;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }

    function aggregateSummaryByCurrency(items: PrototypeWithPayouts[]) {
        const grouped = new Map<string, PrototypePayoutSummary>();

        for (const prototype of items) {
            for (const summary of prototype.payout_details?.summary_by_currency || []) {
                const currency = String(summary.currency || 'usd').toLowerCase();
                const existing = grouped.get(currency) || {
                    currency,
                    event_count: 0,
                    gross_amount: 0,
                    platform_fee_amount: 0,
                    net_amount: 0,
                    paid_net_amount: 0,
                    pending_net_amount: 0,
                    failed_net_amount: 0,
                    paid_event_count: 0,
                    pending_event_count: 0,
                    failed_event_count: 0,
                    last_event_at: null,
                };

                existing.event_count += Number(summary.event_count || 0);
                existing.gross_amount += Number(summary.gross_amount || 0);
                existing.platform_fee_amount += Number(summary.platform_fee_amount || 0);
                existing.net_amount += Number(summary.net_amount || 0);
                existing.paid_net_amount += Number(summary.paid_net_amount || 0);
                existing.pending_net_amount += Number(summary.pending_net_amount || 0);
                existing.failed_net_amount += Number(summary.failed_net_amount || 0);
                existing.paid_event_count += Number(summary.paid_event_count || 0);
                existing.pending_event_count += Number(summary.pending_event_count || 0);
                existing.failed_event_count += Number(summary.failed_event_count || 0);

                if (getSortDate(summary.last_event_at) > getSortDate(existing.last_event_at)) {
                    existing.last_event_at = summary.last_event_at || null;
                }

                grouped.set(currency, existing);
            }
        }

        return [...grouped.values()].sort((a, b) => a.currency.localeCompare(b.currency));
    }

    function aggregatePayouts(items: PrototypeWithPayouts[]) {
        const payouts: AggregatePayoutRecord[] = [];
        for (const prototype of items) {
            for (const payout of prototype.payout_details?.payouts || []) {
                payouts.push({
                    ...payout,
                    prototype_id: prototype.prototype_id,
                    prototype_name: prototype.name,
                });
            }
        }
        return payouts.sort(
            (a, b) =>
                getSortDate(b.paid_at || b.created_at) - getSortDate(a.paid_at || a.created_at)
        );
    }

    function aggregateEvents(items: PrototypeWithPayouts[]) {
        const events: AggregateRevenueEvent[] = [];
        for (const prototype of items) {
            for (const event of prototype.payout_details?.events || []) {
                events.push({
                    ...event,
                    prototype_id: prototype.prototype_id,
                    prototype_name: prototype.name,
                });
            }
        }
        return events.sort((a, b) => getSortDate(b.created_at) - getSortDate(a.created_at));
    }

    let aggregateSummary = $derived(aggregateSummaryByCurrency(prototypes));
    let aggregatePayoutList = $derived(aggregatePayouts(prototypes));
    let aggregateEventList = $derived(aggregateEvents(prototypes));
    let hasAggregateData = $derived(
        aggregateSummary.length > 0 || aggregatePayoutList.length > 0 || aggregateEventList.length > 0
    );
</script>

<PageContainer id="page-payout-details">
    <InfoStack
        title="Payout Details"
        {loading}
        empty={!loading && prototypes.length === 0}
        emptyText="You haven't created any prototypes yet."
    >
        {#if !loading && !hasAggregateData}
            <InfoStackItem
                title={t('No payout activity yet')}
                description={t('Your prototypes do not have payout events yet.')}
            />
        {/if}

        {#each aggregateSummary as summary}
            <InfoStackItem
                title={t('Summary · {currency}', { currency: summary.currency.toUpperCase() })}
                description={summary.event_count === 1 ? t('{count} revenue event · Last activity {date}', { count: summary.event_count, date: formatDate(summary.last_event_at) }) : t('{count} revenue events · Last activity {date}', { count: summary.event_count, date: formatDate(summary.last_event_at) })}
                lines={3}
            >
                {#snippet actions()}
                    <div style="font-size: 0.875rem; font-weight: 500; color: var(--color-dark);">
                        {formatCurrency(summary.net_amount, summary.currency)}
                    </div>
                {/snippet}

                <div style="padding-top: 0.25rem; font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5;">
                    <span style="font-weight: 500;">{t('Gross:')}</span> {formatCurrency(summary.gross_amount, summary.currency)}
                    <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                    <span style="font-weight: 500;">{t('Fees:')}</span> {formatCurrency(summary.platform_fee_amount, summary.currency)}
                    <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                    <span style="font-weight: 500;">{t('Paid:')}</span> {formatCurrency(summary.paid_net_amount, summary.currency)}
                </div>
                <div style="font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5;">
                    <span style="font-weight: 500;">{t('Pending:')}</span> {formatCurrency(summary.pending_net_amount, summary.currency)}
                    <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                    <span style="font-weight: 500;">{t('Failed:')}</span> {formatCurrency(summary.failed_net_amount, summary.currency)}
                </div>
            </InfoStackItem>
        {/each}

        {#each aggregatePayoutList as payout}
            <InfoStackItem
                title={t('{status} payout', { status: formatStatusLabel(payout.status) })}
                description={`${payout.prototype_name || t('Prototype {id}', { id: payout.prototype_id })} · ${payout.event_count === 1 ? t('{count} event · Created {created}', { count: payout.event_count, created: formatDate(payout.created_at) }) : t('{count} events · Created {created}', { count: payout.event_count, created: formatDate(payout.created_at) })}${payout.paid_at ? ` · ${t('Paid {date}', { date: formatDate(payout.paid_at) })}` : ''}`}
                lines={4}
            >
                {#snippet actions()}
                    <div style="font-size: 0.875rem; font-weight: 500; color: var(--color-dark);">
                        {formatCurrency(payout.net_amount, payout.currency)}
                    </div>
                {/snippet}

                <div style="padding-top: 0.25rem; font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5;">
                    <span style="font-weight: 500;">{t('Gross:')}</span> {formatCurrency(payout.gross_amount, payout.currency)}
                    <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                    <span style="font-weight: 500;">{t('Fees:')}</span> {formatCurrency(payout.platform_fee_amount, payout.currency)}
                </div>
                {#if payout.last_error}
                    <div style="font-size: 0.875rem; color: #b91c1c; line-height: 1.5;">
                        {payout.last_error}
                    </div>
                {/if}
            </InfoStackItem>
        {/each}

        {#each aggregateEventList as event}
            <InfoStackItem
                title={describeEventSource(event)}
                description={`${event.prototype_name || t('Prototype {id}', { id: event.prototype_id })} · ${formatStatusLabel(event.status)} · ${t('Created {date}', { date: formatDate(event.created_at) })}${event.paid_at ? ` · ${t('Paid {date}', { date: formatDate(event.paid_at) })}` : ''}`}
                lines={4}
            >
                {#snippet actions()}
                    <div style="font-size: 0.875rem; font-weight: 500; color: var(--color-dark);">
                        {formatCurrency(event.net_amount, event.currency)}
                    </div>
                {/snippet}

                <div style="padding-top: 0.25rem; font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5;">
                    <span style="font-weight: 500;">{t('Gross:')}</span> {formatCurrency(event.gross_amount, event.currency)}
                    <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                    <span style="font-weight: 500;">{t('Fees:')}</span> {formatCurrency(event.platform_fee_amount, event.currency)}
                    {#if event.payout_id}
                        <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                        <span style="font-weight: 500;">{t('Payout:')}</span> {event.payout_id.slice(0, 8)}
                    {/if}
                </div>
                {#if event.last_error}
                    <div style="font-size: 0.875rem; color: #b91c1c; line-height: 1.5;">
                        {event.last_error}
                    </div>
                {/if}
            </InfoStackItem>
        {/each}
    </InfoStack>

    {#each prototypes as prototype (prototype.prototype_id)}
        <InfoStack
            title={prototype.name || t('Prototype {id}', { id: prototype.prototype_id })}
            collapsible={true}
            expanded={false}
            empty={!prototype.payout_details?.has_data}
            emptyText="No payout activity for this prototype yet"
        >
            <InfoStackItem
                href="/prototype/{prototype.prototype_id}"
                title={t('Open Prototype')}
                description={prototype.description || t('No description')}
            />

            {#each prototype.payout_details?.summary_by_currency || [] as summary}
                <InfoStackItem
                    title={t('Summary · {currency}', { currency: summary.currency.toUpperCase() })}
                    description={summary.event_count === 1 ? t('{count} revenue event · Last activity {date}', { count: summary.event_count, date: formatDate(summary.last_event_at) }) : t('{count} revenue events · Last activity {date}', { count: summary.event_count, date: formatDate(summary.last_event_at) })}
                    lines={3}
                >
                    {#snippet actions()}
                        <div style="font-size: 0.875rem; font-weight: 500; color: var(--color-dark);">
                            {formatCurrency(summary.net_amount, summary.currency)}
                        </div>
                    {/snippet}

                    <div style="padding-top: 0.25rem; font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5;">
                        <span style="font-weight: 500;">{t('Gross:')}</span> {formatCurrency(summary.gross_amount, summary.currency)}
                        <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                        <span style="font-weight: 500;">{t('Fees:')}</span> {formatCurrency(summary.platform_fee_amount, summary.currency)}
                        <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                        <span style="font-weight: 500;">{t('Paid:')}</span> {formatCurrency(summary.paid_net_amount, summary.currency)}
                    </div>
                    <div style="font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5;">
                        <span style="font-weight: 500;">{t('Pending:')}</span> {formatCurrency(summary.pending_net_amount, summary.currency)}
                        <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                        <span style="font-weight: 500;">{t('Failed:')}</span> {formatCurrency(summary.failed_net_amount, summary.currency)}
                    </div>
                </InfoStackItem>
            {/each}

            {#each prototype.payout_details?.payouts || [] as payout}
                <InfoStackItem
                    title={t('{status} payout', { status: formatStatusLabel(payout.status) })}
                    description={`${payout.event_count === 1 ? t('{count} event · Created {created}', { count: payout.event_count, created: formatDate(payout.created_at) }) : t('{count} events · Created {created}', { count: payout.event_count, created: formatDate(payout.created_at) })}${payout.paid_at ? ` · ${t('Paid {date}', { date: formatDate(payout.paid_at) })}` : ''}`}
                    lines={4}
                >
                    {#snippet actions()}
                        <div style="font-size: 0.875rem; font-weight: 500; color: var(--color-dark);">
                            {formatCurrency(payout.net_amount, payout.currency)}
                        </div>
                    {/snippet}

                    <div style="padding-top: 0.25rem; font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5;">
                        <span style="font-weight: 500;">{t('Gross:')}</span> {formatCurrency(payout.gross_amount, payout.currency)}
                        <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                        <span style="font-weight: 500;">{t('Fees:')}</span> {formatCurrency(payout.platform_fee_amount, payout.currency)}
                    </div>
                    {#if payout.last_error}
                        <div style="font-size: 0.875rem; color: #b91c1c; line-height: 1.5;">
                            {payout.last_error}
                        </div>
                    {/if}
                </InfoStackItem>
            {/each}

            {#each prototype.payout_details?.events || [] as event}
                <InfoStackItem
                    title={describeEventSource(event)}
                    description={`${formatStatusLabel(event.status)} · ${t('Created {date}', { date: formatDate(event.created_at) })}${event.paid_at ? ` · ${t('Paid {date}', { date: formatDate(event.paid_at) })}` : ''}`}
                    lines={4}
                >
                    {#snippet actions()}
                        <div style="font-size: 0.875rem; font-weight: 500; color: var(--color-dark);">
                            {formatCurrency(event.net_amount, event.currency)}
                        </div>
                    {/snippet}

                    <div style="padding-top: 0.25rem; font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5;">
                        <span style="font-weight: 500;">{t('Gross:')}</span> {formatCurrency(event.gross_amount, event.currency)}
                        <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                        <span style="font-weight: 500;">{t('Fees:')}</span> {formatCurrency(event.platform_fee_amount, event.currency)}
                        {#if event.payout_id}
                            <span style="padding-left: 0.5rem; padding-right: 0.5rem;">•</span>
                            <span style="font-weight: 500;">{t('Payout:')}</span> {event.payout_id.slice(0, 8)}
                        {/if}
                    </div>
                    {#if event.last_error}
                        <div style="font-size: 0.875rem; color: #b91c1c; line-height: 1.5;">
                            {event.last_error}
                        </div>
                    {/if}
                </InfoStackItem>
            {/each}
        </InfoStack>
    {/each}
</PageContainer>
