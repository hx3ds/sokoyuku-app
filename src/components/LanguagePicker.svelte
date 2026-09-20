<script>
    import { LOCALES, locale, setLocale, t } from '../i18n/locale.svelte.js';

    let { floating = false } = $props();
    let open = $state(false);
    let root = $state(/** @type {HTMLElement | null} */ (null));

    const current = $derived(LOCALES.find((item) => item.id === locale.current) || LOCALES[0]);

    function toggle() {
        open = !open;
    }

    function choose(id) {
        setLocale(id);
        open = false;
    }

    function onWindowClick(event) {
        if (!open) return;
        if (root && root.contains(event.target)) return;
        open = false;
    }

    function onWindowKeydown(event) {
        if (event.key === 'Escape') open = false;
    }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="language-picker" class:floating bind:this={root}>
    <button
        type="button"
        class="trigger"
        aria-label={t('Language')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onclick={toggle}
    >
        <span>{current.nativeLabel}</span>
        <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
    </button>
    {#if open}
        <ul class="menu" role="listbox" aria-label={t('Language')}>
            {#each LOCALES as item (item.id)}
                <li>
                    <button
                        type="button"
                        class="option"
                        class:selected={item.id === locale.current}
                        role="option"
                        aria-selected={item.id === locale.current}
                        onclick={() => choose(item.id)}
                    >
                        {item.nativeLabel}
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .language-picker {
        position: relative;
        display: flex;
        align-items: center;
        margin-left: auto;
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

    .floating {
        position: fixed;
        z-index: 50;
        top: 0;
        right: 0;
        height: 64px;
        margin: 0;
        padding: 0 16px;
        padding-top: env(safe-area-inset-top, 0px);
        padding-right: calc(16px + env(safe-area-inset-right, 0px));
    }

    .floating .menu {
        bottom: auto;
        top: calc(100% - 12px);
        left: auto;
        right: 0;
    }

    @media (min-width: 768px) {
        .menu {
            top: auto;
            right: auto;
            left: 0;
            bottom: calc(100% + 0.5rem);
        }

        .floating {
            top: auto;
            right: auto;
            left: 0;
            bottom: 0;
            height: auto;
            width: auto;
            padding: 16px 24px;
            padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
        }

        .floating .menu {
            top: auto;
            right: auto;
            left: 0;
            bottom: calc(100% - 8px);
        }
    }
</style>
