<script>
    import Button from './Button.svelte';

    export let onclick = () => {};
    export let className = '';
    export let padding = '0.5rem 1rem';
    export let style = '';
</script>

<div class="menu-item-wrapper">
    <Button 
        variant="icon-button"
        {onclick} 
        {className} 
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
    
    .menu-item-wrapper :global(.btn) {
        width: 100%;
        justify-content: flex-start;
        text-align: left;
    }
</style>
