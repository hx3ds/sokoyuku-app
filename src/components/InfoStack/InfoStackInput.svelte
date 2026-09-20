<script>
    import InfoStackItem from './InfoStackItem.svelte';
    import { t } from '../../i18n/locale.svelte.js';

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
        side: sideProp = undefined,
        actions = undefined,
        hover = false,
        isLabel = true,
        href = undefined,
        ...rest
    } = $props();
</script>

<InfoStackItem
    title={t(title)}
    description={t(description)}
    {className}
    start={startProp}
    {hover}
    {isLabel}
    href={readonly ? href : undefined}
    {actions}
>
    {#snippet children()}
        <div class="input-wrapper">
            <div class="field-row" class:with-side={!!sideProp}>
                <div class="field-box">
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
                            placeholder={t(placeholder)}
                            {...rest}
                        >
                    {/if}
                    {#if endProp}
                        <div class="end-slot">
                            {@render endProp()}
                        </div>
                    {/if}
                </div>
                {#if sideProp}
                    <div class="side-slot">
                        {@render sideProp()}
                    </div>
                {/if}
            </div>
        </div>
    {/snippet}
</InfoStackItem>

<style>
    .input-wrapper {
        position: relative;
        padding-top: 0.5rem;
        width: 100%;
    }

    .field-row {
        width: 100%;
    }

    .field-row.with-side {
        display: flex;
        align-items: stretch;
        gap: 0.5rem;
    }

    .field-box {
        position: relative;
        width: 100%;
        min-width: 0;
    }

    .field-row.with-side .field-box {
        flex: 1;
    }

    .side-slot {
        display: flex;
        align-items: stretch;
        flex-shrink: 0;
    }

    .side-slot :global(.button-container) {
        display: flex;
        align-self: stretch;
    }

    .side-slot :global(.btn) {
        height: 100%;
    }

    .start-slot, .end-slot {
        position: absolute;
        top: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        z-index: 1;
    }

    .start-slot {
        left: 0;
        padding-left: 0.75rem;
        pointer-events: none;
    }

    .end-slot {
        right: 0;
        padding-left: 0.25rem;
        background: linear-gradient(
            to right,
            transparent,
            var(--color-bg-surface) 0.35rem
        );
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
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .input-field.pl-10 {
        padding-left: 2.5rem;
    }

    .input-field.pr-10 {
        padding-right: 2.75rem;
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
