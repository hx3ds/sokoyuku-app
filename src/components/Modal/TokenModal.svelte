<script>
    import Dialog from './Dialog.svelte';
    import Button from '../Button/Button.svelte';
    import Loading from '../Loading.svelte';
    import { showSuccess, showError } from './state.svelte.js';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';

    let { 
        show = $bindable(false), 
        token = '', 
        loading = false, 
        title = 'Token',
        description = '',
        warning = false,
        onRefresh = undefined
    } = $props();

    function close() {
        show = false;
    }

    function copyToken() {
        if (token) {
            navigator.clipboard.writeText(token).then(() => {
                showSuccess('Token copied to clipboard');
            }).catch(() => {
                showError('Failed to copy token');
            });
        }
    }
</script>

{#if show}
    {#snippet tokenIcon()}
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
    {/snippet}

    <Dialog 
        {title} 
        onclose={close} 
        maxWidth="max-w-lg"
        icon={tokenIcon}
    >
        {#if loading}
            <div class="loading-wrapper">
                <Loading />
            </div>
        {:else if token}
            {#if description}
                <InfoStackItem>
                    <div class="description-container" class:warning-bg={warning}>
                        {#if warning}
                            <div class="warning-icon">
                                <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9.401 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            </div>
                        {/if}
                        <div class="description-text">
                            {@html description}
                        </div>
                    </div>
                </InfoStackItem>
            {/if}
            
            <InfoStackInput 
                title="Token" 
                value={token}
                readonly
            >
                {#snippet end()}
                    <div style="padding-right: 0.5rem;">
                        <Button variant="icon-button" onclick={copyToken} aria-label="Copy Token" title="Copy to clipboard">
                            <svg class="icon-sm" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                            </svg>
                        </Button>
                    </div>
                {/snippet}
            </InfoStackInput>
            
            <InfoStackItem>
                {#snippet actions()}
                    <div style="display: flex; gap: 0.5rem;">
                        {#if onRefresh}
                            <Button variant="text-button" onclick={onRefresh}>Refresh Token</Button>
                        {/if}
                        <Button variant="text-button" onclick={close} aria-label="Done">
                            Done
                        </Button>
                    </div>
                {/snippet}
            </InfoStackItem>
        {:else}
            <div class="error-message">Failed to load token</div>
        {/if}
    </Dialog>
{/if}

<style>
    .loading-wrapper {
        padding-top: 1rem;
        padding-bottom: 1rem;
        display: flex;
        justify-content: center;
    }

    .description-container {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid var(--color-border, #e5e7eb);
    }

    .description-container.warning-bg {
        background-color: var(--color-bg-secondary, #f9fafb);
    }

    .warning-icon {
        flex-shrink: 0;
        width: 1.5rem;
        height: 1.5rem;
        color: var(--color-warning, #f59e0b);
    }

    .description-text {
        font-size: 0.875rem;
        color: var(--color-text-secondary, #4b5563);
        line-height: 1.5;
        margin: 0;
    }

    /* Support for bolding in description html */
    .description-text :global(strong), 
    .description-text :global(.highlight) {
        font-weight: 600;
        color: var(--color-text-main, #111827);
    }

    .error-message {
        text-align: center;
        padding-top: 1rem;
        padding-bottom: 1rem;
        color: #ef4444;
    }
</style>