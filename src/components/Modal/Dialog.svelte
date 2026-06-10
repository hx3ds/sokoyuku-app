<script>
    import InfoStack from '../InfoStack/InfoStack.svelte';
    import Button from '../Button/Button.svelte';

    let { 
        title, 
        children, 
        onclose, 
        maxWidth = 'max-w-2xl',
        icon = undefined,
        ...rest 
    } = $props();

    function handleKeydown(event) {
        if (event.key === 'Escape') {
            onclose();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="dialog-overlay">
    <div 
        class="backdrop" 
        role="button" 
        tabindex="0" 
        onclick={onclose} 
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onclose(); }}
    ></div>

    <div class="dialog-wrapper {maxWidth}">
        <InfoStack 
            {title} 
            {icon}
            showTitle={!!title}
            className="dialog-stack"
            style="box-shadow: 0 10px 40px rgba(0,0,0,0.15); max-height: calc(100vh - 2rem); display: flex; flex-direction: column;"
            {...rest}
        >
            {#snippet headerActions()}
                 <Button variant="icon-button" onclick={onclose} aria-label="Close">
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </Button>
            {/snippet}
            
            {@render children()}
        </InfoStack>
    </div>
</div>

<style>
    .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
        padding: 1rem;
    }

    .backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
    }

    .dialog-wrapper {
        position: relative;
        z-index: 10;
        width: 100%;
    }

    /* Common max-widths mapping */
    :global(.max-w-md) { max-width: 28rem; }
    :global(.max-w-lg) { max-width: 32rem; }
    :global(.max-w-xl) { max-width: 36rem; }
    :global(.max-w-2xl) { max-width: 42rem; }
    :global(.max-w-4xl) { max-width: 56rem; }
    :global(.max-w-full) { max-width: 100%; }

    /* Override InfoStack internals to support scrolling */
    :global(.dialog-stack .info-content) {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
    }
    
    .icon {
        width: 1.25rem;
        height: 1.25rem;
    }
</style>