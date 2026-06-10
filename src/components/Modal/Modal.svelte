<script>
    import { modalState, closeModal } from './state.svelte.js';
    import Dialog from './Dialog.svelte';
    import Button from '../Button/Button.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';

    function handleKeydown(event) {
        if (modalState.isOpen && event.key === 'Escape') {
            closeModal();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if modalState.isOpen}
    {#snippet modalIcon()}
        {#if modalState.type === 'success'}
            <svg class="icon" style="color: #22c55e;" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {:else if modalState.type === 'error'}
            <svg class="icon" style="color: #ef4444;" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9.401 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
        {:else if modalState.type === 'warning'}
            <svg class="icon" style="color: #f59e0b;" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
        {:else}
            <svg class="icon" style="color: #3b82f6;" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
        {/if}
    {/snippet}

    <Dialog 
        title={modalState.title} 
        onclose={closeModal}
        maxWidth="max-w-md"
        icon={modalIcon}
    >
        <InfoStackItem>
            <p style="margin: 0; color: #4b5563;">
                {modalState.message}
            </p>
        </InfoStackItem>

        <InfoStackItem>
            {#snippet actions()}
                <div style="display: flex; gap: 0.75rem;">
                    {#if modalState.isConfirm}
                        <Button 
                            variant="text-button"
                            onclick={modalState.onCancel}
                        >
                            Cancel
                        </Button>
                    {/if}
                    <Button 
                        variant="text-button"
                        onclick={modalState.onConfirm}
                    >
                        OK
                    </Button>
                </div>
            {/snippet}
        </InfoStackItem>
    </Dialog>
{/if}


