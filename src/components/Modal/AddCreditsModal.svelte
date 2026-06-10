<script>
    import { createCheckoutSession } from '../../proxy/subscription.js';
    import Dialog from './Dialog.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';
    import Button from '../Button/Button.svelte';

    let { showCreditsModal = $bindable(false), onClose = () => {} } = $props();

    let creditsAmount = $state(10);
    let checkoutError = $state('');
    let checkoutLoading = $state(false);

    // Reset state when modal opens
    $effect(() => {
        if (showCreditsModal) {
            creditsAmount = 10;
            checkoutError = '';
            checkoutLoading = false;
        }
    });

    function closeCreditsModal() {
        showCreditsModal = false;
        onClose();
    }

    async function handleCheckout() {
        if (!creditsAmount || creditsAmount <= 0) {
            checkoutError = 'Please enter a valid amount';
            return;
        }

        checkoutLoading = true;
        checkoutError = '';

        const res = await createCheckoutSession({
            amount: creditsAmount,
            currency: 'usd',
            success_url: `${window.location.origin}/profile`,
            cancel_url: `${window.location.origin}/profile`
        });

        if (res.result === 0) {
            window.location.href = res.data.url;
        } else {
            checkoutError = res.msg || 'Failed to create checkout session';
            checkoutLoading = false;
        }
    }
</script>

{#if showCreditsModal}
    {#snippet creditsIcon()}
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
        {/snippet}
    <Dialog 
        title="Add Credits" 
        onclose={closeCreditsModal}
        icon={creditsIcon}
    >
        <InfoStackInput 
            type="number" 
            id="creditsAmount"
            title="Amount (USD)"
            bind:value={creditsAmount} 
            min="1" 
            step="1"
        />
        {#if checkoutError}
            <InfoStackItem>
                <div style="font-size: 0.75rem; color: #ef4444;">{checkoutError}</div>
            </InfoStackItem>
        {/if}

        <InfoStackItem>
            {#snippet actions()}
                <Button 
                    variant="text-button" 
                    onclick={handleCheckout} 
                    disabled={checkoutLoading}
                    loading={checkoutLoading}
                >
                    Proceed to Checkout
                </Button>
            {/snippet}
        </InfoStackItem>
    </Dialog>
{/if}

