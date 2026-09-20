<script>
    import { LOCALES, locale, setLocale, t } from '../i18n/locale.svelte.js';

    let { floating = false } = $props();

    function handleChange(event) {
        setLocale(event.currentTarget.value);
    }
</script>

<label class="language-picker" class:floating>
    <span class="visually-hidden">{t('Language')}</span>
    <span class="control">
        <select value={locale.current} onchange={handleChange} aria-label={t('Language')}>
            {#each LOCALES as item (item.id)}
                <option value={item.id}>{item.nativeLabel}</option>
            {/each}
        </select>
        <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
    </span>
</label>

<style>
    .language-picker {
        display: flex;
        align-items: center;
        margin-left: auto;
    }

    .control {
        position: relative;
        display: flex;
        align-items: center;
        min-width: 0;
    }

    .language-picker select {
        appearance: none;
        background: transparent;
        border: none;
        border-radius: 0;
        color: var(--color-text-main);
        font-family: var(--font-roboto), "Noto Sans", "Noto Sans CJK SC", "Noto Sans CJK TC", "Hiragino Sans", "Yu Gothic", "Malgun Gothic", "Microsoft YaHei", sans-serif;
        font-size: 0.8125rem;
        font-weight: 400;
        line-height: 1.25;
        padding: 0.15rem 1.15rem 0.15rem 0;
        cursor: pointer;
    }

    .chevron {
        position: absolute;
        right: 0;
        width: 0.75rem;
        height: 0.75rem;
        pointer-events: none;
        color: var(--color-text-main);
    }

    .language-picker select:hover,
    .language-picker select:focus {
        color: var(--color-text-main);
        background: transparent;
        outline: none;
        box-shadow: none;
    }

    .language-picker select:focus-visible {
        outline: none;
        color: var(--color-text-main);
    }

    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
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

    @media (min-width: 768px) {
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
    }
</style>
