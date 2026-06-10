<script>
    import InfoStackItem from './InfoStackItem.svelte';

    let {
        title = '',
        description = '',
        value = $bindable(),
        required = false,
        disabled = false,
        className = '',
        selectClass = '',
        start = undefined,
        children: childrenProp = undefined,
        hover = false,
        isLabel = true,
        ...rest
    } = $props();
</script>

<InfoStackItem {title} {description} {className} {start} {hover} {isLabel}>
    {#snippet children()}
        <div class="select-wrapper">
            <select 
                bind:value 
                {required} 
                {disabled} 
                class="select-field {selectClass}"
                class:editing={!disabled}
                {...rest}
            >
                {@render childrenProp?.()}
            </select>
        </div>
    {/snippet}
</InfoStackItem>

<style>
    .select-wrapper {
        position: relative;
        padding-top: 0.5rem;
        width: 100%;
    }

    .select-field {
        width: 100%;
        padding: 0;
        border: none;
        border-bottom: 1px solid transparent;
        box-shadow: none;
        background-color: transparent;
        font-family: inherit;
        font-size: 14px;
        color: var(--color-text-main);
        outline: none;
        transition: border-color 0.15s;
    }

    .select-field:focus {
        outline: none;
        box-shadow: none;
    }

    .select-field.editing {
        border-bottom-color: var(--color-border);
    }

    .select-field.editing:focus {
        border-bottom-color: var(--color-primary);
    }
</style>
