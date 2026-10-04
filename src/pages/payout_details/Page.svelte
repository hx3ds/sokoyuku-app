<script lang="ts">
    import { onMount } from 'svelte';
    import PageContainer from '../../components/PageContainer.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import { fetchMyPrototypePayoutDetails } from '../../proxy/prototype.js';
    import { getStripeConnectStatus } from '../../proxy/payout.js';

    type ConnectStatus = {
        connected?: boolean;
        payouts_enabled?: boolean;
        tax_ready?: boolean;
    };

    let loading = $state(true);
    let emptyText = $state('No prototypes');

    function connectStatusText(status: ConnectStatus | null) {
        if (!status?.connected) return 'Not connected';
        if (status.tax_ready) {
            return status.payouts_enabled
                ? 'Connected · Payouts enabled · Tax ready'
                : 'Connected · Tax ready';
        }
        return status.payouts_enabled
            ? 'Connected · Payouts enabled · Tax setup needed'
            : 'Connected · Tax setup needed';
    }

    onMount(async () => {
        loading = true;
        try {
            const [prototypes, statusRes] = await Promise.all([
                fetchMyPrototypePayoutDetails(),
                getStripeConnectStatus(),
            ]);
            const count = Array.isArray(prototypes) ? prototypes.length : 0;
            if (count === 0) {
                emptyText = 'No prototypes';
                return;
            }
            const status = statusRes?.result === 0 ? (statusRes.data as ConnectStatus) : null;
            emptyText = connectStatusText(status);
        } finally {
            loading = false;
        }
    });
</script>

<PageContainer id="page-payout-details">
    <InfoStack
        title="Payout Details"
        {loading}
        empty={!loading}
        {emptyText}
    />
</PageContainer>
