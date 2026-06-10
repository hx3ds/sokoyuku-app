<script>
    import Button from './Button.svelte';

    export let isOpen = false;
    export let menuClass = 'w-32';
    export let width = '';
    export let className = '';
    export let size = '1.75rem';
    export let onclick = (e) => {};
</script>

<Button 
    variant="icon-button"
    onclick={onclick}
    aria-label="Options" 
    style="width: {size}; height: {size};"
    className="action-menu-button {className}"
    menuOpen={isOpen}
    {menuClass}
    menuStyle={width ? `width: ${width};` : ''}
    {...$$restProps}
>
    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 0 1 0-1.5.75.75 0 0 1 0 1.5Z" /></svg>
    <svelte:fragment slot="menu">
        <slot />
    </svelte:fragment>
</Button>
