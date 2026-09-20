<script>
    import { t } from '../i18n/locale.svelte.js';
    export let text = 'Not Found';
</script>

<div class="not-found-container">
    <p class="not-found-text">{t(text)}</p>
</div>

<style>
    .not-found-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding-top: 1rem;
        padding-bottom: 1rem;
    }

    .not-found-text {
        font-size: 0.875rem;
        color: color-mix(in srgb, var(--color-dark), transparent 40%);
    }
</style>
