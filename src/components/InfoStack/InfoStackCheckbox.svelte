<script>
    import InfoStackItem from './InfoStackItem.svelte';

    let {
        id = undefined,
        title = '',
        description = '',
        checked = $bindable(),
        required = false,
        className = '',
        start = undefined,
        children = undefined,
        hover = false,
        isLabel = true,
        ...rest
    } = $props();
</script>

<InfoStackItem {title} {description} {className} {start} {hover} {isLabel}>
    {#if children}
        {@render children()}
    {/if}
    {#snippet actions()}
        <input 
            {id}
            type="checkbox" 
            {required} 
            bind:checked 
            class="checkbox-input"
            {...rest}
        >
    {/snippet}
</InfoStackItem>

<style>
    .checkbox-input {
        width: 1rem;
        height: 1rem;
        border: 1.5px solid var(--color-text-secondary);
        border-radius: 4px;
        background-color: var(--color-bg-secondary);
        outline: none;
        cursor: pointer;
        appearance: none;
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    
    .checkbox-input:checked {
        background-color: var(--color-primary);
        border-color: var(--color-primary);
    }

    .checkbox-input:checked::after {
        content: '';
        width: 0.65rem;
        height: 0.65rem;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
    }
    
    .checkbox-input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-ring);
    }
</style>
