<script>
    import { onMount } from 'svelte';
    import { fetchWalletDeductionHistory } from '../../proxy/subscription.js';
    import PageContainer from '../../components/PageContainer.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';

    let history = $state([]);
    let loading = $state(true);

    onMount(async () => {
        await loadHistory();
    });

    async function loadHistory() {
        loading = true;
        history = await fetchWalletDeductionHistory();
        loading = false;
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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

<PageContainer id="page-chat-history">
    <InfoStack title="Deduction History" {loading} empty={history.length === 0} emptyText="No history found">
        {#each history as item}
            <InfoStackItem>
                <div style="display: flex; align-items: flex-start; gap: 0.5rem; width: 100%;">
                    <div style="padding-top: 0.125rem;">
                        <svg style="width: 1rem; height: 1rem; color: #586069;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div style="flex-grow: 1; min-width: 0;">
                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="font-size: 0.875rem; font-weight: 500; color: var(--color-dark);">{item.model_name || 'Unknown Model'}</span>
                                    <span style="font-size: 0.75rem; color: #586069;">({item.prototype_name || 'Unknown Prototype'})</span>
                                </div>
                                <span style="font-size: 0.875rem; font-weight: 500; color: {item.status === 'settled' ? '#24292e' : '#586069'};">
                                    -{formatCurrency(item.actual_cost)}
                                </span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: rgba(45, 45, 45, 0.6);">
                                <span>{formatDate(item.created_at)}</span>
                                <span>•</span>
                                <span style="text-transform: capitalize;">{item.status}</span>
                                {#if item.status === 'reserved'}
                                    <span>•</span>
                                    <span>Reserved: {formatCurrency(item.reserved_amount)}</span>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            </InfoStackItem>
        {/each}
    </InfoStack>
</PageContainer>