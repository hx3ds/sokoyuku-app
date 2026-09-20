<script>
    import { t } from '../../i18n/locale.svelte.js';

    let {
        label = '',
        ariaLabel = '',
    } = $props();

    const displayLabel = $derived(t(label));
    const displayAria = $derived(t(ariaLabel || label));
</script>

<div
    class="stack-divider"
    role="separator"
    aria-label={displayAria || undefined}
>
    <span class="stack-divider-line"></span>
    {#if displayLabel}
        <span class="stack-divider-label">{displayLabel}</span>
        <span class="stack-divider-line"></span>
    {/if}
</div>

<style>
    .stack-divider {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
    }

    .stack-divider-line {
        flex: 1;
        height: 1px;
        background: var(--color-border);
    }

    .stack-divider-label {
        flex: 0 0 auto;
        color: #586069;
        font-size: 0.75rem;
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }
</style>
