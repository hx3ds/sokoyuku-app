<script>
    import { onMount } from 'svelte';
    import { fetchTransactionHistory } from '../../proxy/subscription.js';
    import PageContainer from '../../components/PageContainer.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';

    let transactions = $state([]);
    let loading = $state(true);

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        loading = true;
        
        try {
            // Fetch transactions
            transactions = await fetchTransactionHistory();
            transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        } catch (err) {
            console.error('Error loading payment history:', err);
        } finally {
            loading = false;
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        });
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    }
</script>

<PageContainer id="page-payment-history">
    <!-- Transactions Section -->
    <InfoStack title="Transaction History" {loading} empty={transactions.length === 0} emptyText="No transaction history">
        {#each transactions as tx}
            <InfoStackItem 
                title={tx.description || 'Transaction'} 
                description={formatDate(tx.created_at)}
                style="cursor: default; --line-clamp: 1;"
            >
                {#snippet start()}
                    {#if tx.status === 'success' || tx.status === 'completed'}
                        <svg style="width: 1rem; height: 1rem; color: #22c55e;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    {:else if tx.status === 'failed'}
                        <svg style="width: 1rem; height: 1rem; color: #ef4444;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9.401 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    {:else if tx.status === 'pending'}
                        <svg style="width: 1rem; height: 1rem; color: #eab308;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    {/if}
                {/snippet}

                {#snippet actions()}
                    <div style="font-size: 0.875rem; font-weight: 500; color: {(tx.transaction_type === 'credit' || tx.amount > 0) ? '#16a34a' : '#dc2626'};">
                        {formatCurrency(Math.abs(tx.amount))}
                    </div>
                {/snippet}
            </InfoStackItem>
        {/each}
    </InfoStack>
</PageContainer>
