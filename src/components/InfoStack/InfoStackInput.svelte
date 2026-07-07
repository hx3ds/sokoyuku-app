<script>
    import InfoStackItem from './InfoStackItem.svelte';

    let {
        title = '',
        description = '',
        value = $bindable(),
        placeholder = '',
        type = 'text',
        required = false,
        readonly = false,
        disabled = false,
        className = '',
        inputClass = '',
        start: startProp = undefined,
        inputStart = undefined,
        end: endProp = undefined,
        actions = undefined,
        hover = false,
        isLabel = true,
        href = undefined,
        ...rest
    } = $props();
</script>

<InfoStackItem
    {title}
    {description}
    {className}
    start={startProp}
    {hover}
    {isLabel}
    href={readonly ? href : undefined}
    {actions}
>
    {#snippet children()}
        <div class="input-wrapper">
            {#if inputStart}
                <div class="start-slot">
                    {@render inputStart()}
                </div>
            {/if}
            {#if readonly && href}
                <div 
                    class="input-field {inputClass}"
                    class:pl-10={inputStart}
                    class:pr-10={endProp}
                >
                    {value}
                </div>
            {:else}
                <input 
                    {type} 
                    bind:value 
                    {required}
                    {readonly}
                    {disabled}
                    class="input-field {inputClass}"
                    class:pl-10={inputStart}
                    class:pr-10={endProp}
                    class:editing={!readonly && !disabled}
                    {placeholder}
                    {...rest}
                >
            {/if}
            {#if endProp}
                    <div class="end-slot">
                    {@render endProp()}
                </div>
            {/if}
        </div>
    {/snippet}
</InfoStackItem>

<style>
    .input-wrapper {
        position: relative;
        padding-top: 0.5rem;
        width: 100%;
    }

    .start-slot, .end-slot {
        position: absolute;
        top: 0;
        bottom: 0;
        display: flex;
        align-items: center;
    }

    .start-slot {
        left: 0;
        padding-left: 0.75rem;
        pointer-events: none;
    }

    .end-slot {
        right: 0;
    }

    .input-field {
        width: 100%;
        padding: 0;
        border: none;
        border-bottom: 1px solid transparent;
        box-shadow: none;
        background-color: transparent;
        font-family: inherit;
        font-size: 14px;
        color: var(--color-text-main);
        transition: color 0.15s, border-color 0.15s, box-shadow 0.15s;
    }

    .input-field:focus {
        outline: none;
        box-shadow: none;
    }

    .input-field.editing {
        border-bottom-color: var(--color-border);
    }

    .input-field.editing:focus {
        border-bottom-color: var(--color-primary);
    }
</style>
