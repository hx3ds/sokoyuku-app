<script>
    import { t } from '../i18n/locale.svelte.js';
    import { THEMES, setTheme, theme } from '../store/theme.svelte.js';

    const LABELS = {
        day: 'Day',
        night: 'Night',
        system: 'System',
    };

    let open = $state(false);
    let root = $state(/** @type {HTMLElement | null} */ (null));

    const currentLabel = $derived(t(LABELS[theme.preference] || 'System'));

    function toggle() {
        open = !open;
    }

    /** @param {string} id */
    function choose(id) {
        setTheme(id);
        open = false;
    }

    /** @param {MouseEvent} event */
    function onWindowClick(event) {
        if (!open) return;
        if (root && event.target instanceof Node && root.contains(event.target)) return;
        open = false;
    }

    /** @param {KeyboardEvent} event */
    function onWindowKeydown(event) {
        if (event.key === 'Escape') open = false;
    }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="theme-picker" bind:this={root}>
    <button
        type="button"
        class="trigger"
        aria-label={t('Night Mode')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onclick={toggle}
    >
        <span>{currentLabel}</span>
        <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
    </button>
    {#if open}
        <ul class="menu" role="listbox" aria-label={t('Night Mode')}>
            {#each THEMES as id (id)}
                <li>
                    <button
                        type="button"
                        class="option"
                        class:selected={id === theme.preference}
                        role="option"
                        aria-selected={id === theme.preference}
                        onclick={() => choose(id)}
                    >
                        {t(LABELS[id])}
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .theme-picker {
        position: relative;
        display: flex;
        align-items: center;
    }

    .trigger {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        margin: 0;
        padding: 0.15rem 0;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: var(--color-text-main);
        font-family: var(--font-roboto), "Noto Sans", "Noto Sans CJK SC", "Noto Sans CJK TC", "Hiragino Sans", "Yu Gothic", "Malgun Gothic", "Microsoft YaHei", sans-serif;
        font-size: 0.8125rem;
        font-weight: 400;
        line-height: 1.25;
        cursor: pointer;
    }

    .chevron {
        width: 0.75rem;
        height: 0.75rem;
        color: var(--color-text-secondary);
    }

    .trigger:focus {
        outline: none;
    }

    .trigger:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    .menu {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        left: auto;
        z-index: 60;
        margin: 0;
        padding: 6px;
        list-style: none;
        min-width: max-content;
        background-color: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        box-shadow: var(--shadow-md);
    }

    .menu li {
        margin: 0;
        padding: 0;
    }

    .option {
        display: flex;
        width: 100%;
        align-items: center;
        margin: 0;
        padding: 0.5rem 0.75rem;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-main);
        font-family: inherit;
        font-size: 0.875rem;
        font-weight: 400;
        line-height: 1.25;
        text-align: left;
        cursor: pointer;
        white-space: nowrap;
    }

    @media (hover: hover) and (pointer: fine) {
        .option:hover {
            background-color: var(--color-bg-hover);
        }
    }

    .option.selected {
        background-color: var(--color-primary-soft);
        color: var(--color-primary);
        font-weight: 500;
    }

    @media (min-width: 768px) {
        .menu {
            top: auto;
            right: auto;
            left: 0;
            bottom: calc(100% + 0.5rem);
        }
    }
</style>
