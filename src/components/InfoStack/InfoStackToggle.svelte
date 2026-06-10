<script>
    import InfoStackItem from './InfoStackItem.svelte';

    let {
        title = '',
        description = '',
        checked = $bindable(),
        className = '',
        start = undefined,
        hover = false,
        isLabel = true,
        ...rest
    } = $props();

    // We intercept the click on the item to toggle the switch
    function handleItemClick(e) {
        // Prevent double toggling if the toggle itself was clicked
        if (e.target.closest('.toggle-bg') || e.target.closest('input')) return;
        checked = !checked;
    }
</script>

<InfoStackItem {title} {description} {className} {start} onclick={handleItemClick} {hover} {isLabel}>
    {#snippet actions()}
        <label class="toggle-label">
            <input 
                type="checkbox" 
                bind:checked 
                class="sr-only peer"
                {...rest}
            >
            <div class="toggle-bg"></div>
        </label>
    {/snippet}
</InfoStackItem>

<style>
    .toggle-label {
        display: flex;
        align-items: center;
        cursor: pointer;
        position: relative;
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px !important;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }

    .toggle-bg {
        width: 2.75rem;
        height: 1.5rem;
        background-color: var(--color-toggle-off, #e5e7eb);
        border-radius: 9999px;
        position: relative;
        transition: background-color 0.2s;
    }

    /* Focus styles */
    .peer:focus + .toggle-bg {
        outline: none;
        box-shadow: 0 0 0 2px var(--color-primary-ring, rgba(3, 102, 214, 0.3));
    }

    /* Toggle knob (after pseudo-element replacement) */
    .toggle-bg::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        background-color: var(--color-bg-surface, white);
        border: 1px solid var(--color-border-subtle, #d1d5db);
        border-radius: 50%;
        height: 1.25rem;
        width: 1.25rem;
        transition: all 0.2s;
    }

    /* Checked state */
    .peer:checked + .toggle-bg {
        background-color: var(--color-success, #2ea44f);
    }

    .peer:checked + .toggle-bg::after {
        transform: translateX(100%);
        border-color: var(--color-bg-surface, white);
    }
</style>
