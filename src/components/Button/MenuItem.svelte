<script>
    import Button from './Button.svelte';

    export let onclick = () => {};
    export let className = '';
    export let padding = '0.25rem 0.5rem';
    export let style = '';
</script>

<div class="menu-item-wrapper">
    <Button 
        variant="text-button"
        {onclick} 
        className="menu-item {className}"
        {padding} 
        {style}
        {...$$restProps}
    >
        <slot />
    </Button>
</div>

<style>
    .menu-item-wrapper {
        display: block;
        width: 100%;
    }
    
    .menu-item-wrapper :global(.button-container) {
        display: flex;
        width: 100%;
    }
    
    .menu-item-wrapper :global(.btn.text-button.menu-item) {
        width: 100%;
        height: auto;
        min-width: 0;
        justify-content: flex-start;
        text-align: left;
        background-color: transparent;
        color: inherit;
        border-radius: 4px;
        font-weight: 400;
        font-size: 0.875rem;
        box-shadow: none;
    }

    @media (hover: hover) and (pointer: fine) {
        .menu-item-wrapper :global(.btn.text-button.menu-item:hover:not(:disabled)) {
            filter: none;
            background-color: color-mix(in srgb, var(--color-primary), transparent 80%);
            box-shadow: none;
            color: var(--color-primary);
        }
    }

    .menu-item-wrapper :global(.btn.text-button.menu-item:active:not(:disabled)) {
        filter: none;
        box-shadow: none;
    }
</style>
