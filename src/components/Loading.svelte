<script>
    import { t } from '../i18n/locale.svelte.js';
    export let text = 'Loading...';
</script>

<div class="loading-container">{t(text)}</div>

<style>
    .loading-container {
        padding-top: 1rem;
        padding-bottom: 1rem;
        text-align: center;
        color: color-mix(in srgb, var(--color-dark), transparent 40%);
    }
</style>
