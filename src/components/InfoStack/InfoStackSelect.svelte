<script>
    import { tick } from 'svelte';
    import InfoStackItem from './InfoStackItem.svelte';
    import { t } from '../../i18n/locale.svelte.js';

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
        onchange = undefined,
        ...rest
    } = $props();

    let open = $state(false);
    let root = $state(null);
    let optionsHost = $state(null);
    /** @type {{ value: string, label: string, disabled: boolean }[]} */
    let options = $state([]);

    const selectedLabel = $derived(
        options.find((opt) => valuesEqual(opt.value, value))?.label ?? (value != null && value !== '' ? String(value) : '')
    );

    function valuesEqual(a, b) {
        return String(a) === String(b);
    }

    async function syncOptions() {
        await tick();
        if (!optionsHost) {
            options = [];
            return;
        }
        options = [...optionsHost.querySelectorAll('option')].map((el) => ({
            value: el.getAttribute('value') ?? el.value,
            label: (el.textContent ?? '').trim() || el.value,
            disabled: el.disabled,
        }));
    }

    $effect(() => {
        childrenProp;
        disabled;
        void syncOptions();
    });

    $effect(() => {
        if (!optionsHost) return;
        void syncOptions();
        const observer = new MutationObserver(() => {
            void syncOptions();
        });
        observer.observe(optionsHost, { childList: true, subtree: true, characterData: true });
        return () => observer.disconnect();
    });

    function close() {
        open = false;
    }

    function toggle() {
        if (disabled) return;
        open = !open;
    }

    /** @param {string} nextValue */
    function coerceValue(nextValue) {
        if (typeof value === 'boolean') {
            return nextValue === 'true' || nextValue === true;
        }
        if (typeof value === 'number' && nextValue !== '' && !Number.isNaN(Number(nextValue))) {
            return Number(nextValue);
        }
        return nextValue;
    }

    /** @param {string} nextValue */
    function choose(nextValue) {
        const coerced = coerceValue(nextValue);
        value = coerced;
        close();
        onchange?.({
            currentTarget: { value: String(coerced) },
        });
    }

    function handleWindowClick(event) {
        if (!open || !root) return;
        if (event.target instanceof Node && root.contains(event.target)) return;
        close();
    }

    function handleWindowKeydown(event) {
        if (event.key === 'Escape') close();
    }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<InfoStackItem title={t(title)} description={t(description)} {className} {start} {hover} {isLabel}>
    {#snippet children()}
        <div class="select-wrapper" bind:this={root}>
            <div class="options-source" aria-hidden="true" bind:this={optionsHost}>
                {@render childrenProp?.()}
            </div>

            {#if disabled}
                <div class="select-field {selectClass}" {...rest}>
                    {selectedLabel}
                </div>
            {:else}
                <button
                    type="button"
                    class="select-trigger select-field {selectClass} editing"
                    class:open
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-required={required}
                    onclick={toggle}
                    {...rest}
                >
                    <span class="select-value">{selectedLabel}</span>
                    <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>

                {#if open}
                    <div class="select-menu" role="listbox" aria-label={t(title)}>
                        {#each options as opt (opt.value)}
                            <button
                                type="button"
                                class="select-option"
                                class:selected={valuesEqual(opt.value, value)}
                                role="option"
                                aria-selected={valuesEqual(opt.value, value)}
                                disabled={opt.disabled}
                                onclick={() => choose(opt.value)}
                            >
                                {opt.label}
                            </button>
                        {/each}
                    </div>
                {/if}
            {/if}
        </div>
    {/snippet}
</InfoStackItem>

<style>
    .select-wrapper {
        position: relative;
        padding-top: 0.5rem;
        width: 100%;
    }

    .options-source {
        display: none;
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
        text-align: left;
    }

    .select-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        cursor: pointer;
    }

    .select-trigger.editing {
        border-bottom-color: var(--color-border);
    }

    .select-trigger.editing.open,
    .select-trigger.editing:focus-visible {
        border-bottom-color: var(--color-primary);
        outline: none;
    }

    .select-value {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .chevron {
        width: 1rem;
        height: 1rem;
        flex-shrink: 0;
        color: var(--color-text-secondary);
        transition: transform 0.15s ease;
    }

    .select-trigger.open .chevron {
        transform: rotate(180deg);
    }

    .select-menu {
        position: absolute;
        left: 0;
        right: 0;
        top: calc(100% + 0.5rem);
        z-index: 50;
        display: flex;
        flex-direction: column;
        padding: 6px;
        background-color: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        box-shadow: var(--shadow-md);
        animation: select-menu-enter 0.15s cubic-bezier(0.2, 0, 0.13, 1.5) forwards;
        transform-origin: top center;
    }

    @keyframes select-menu-enter {
        from {
            opacity: 0;
            transform: scale(0.9) translateY(-10px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }

    .select-option {
        display: flex;
        width: 100%;
        align-items: center;
        margin: 0;
        padding: 0.25rem 0.5rem;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: inherit;
        font-family: inherit;
        font-size: 0.875rem;
        font-weight: 400;
        line-height: 1.25;
        text-align: left;
        cursor: pointer;
        white-space: nowrap;
    }

    .select-option:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media (hover: hover) and (pointer: fine) {
        .select-option:hover:not(:disabled) {
            background-color: color-mix(in srgb, var(--color-primary), transparent 80%);
            color: var(--color-primary);
        }
    }

    .select-option.selected {
        color: var(--color-primary);
        font-weight: 500;
    }
</style>
