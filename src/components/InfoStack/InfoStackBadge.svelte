<script>
    import { onMount } from 'svelte';
    import { t } from '../../i18n/locale.svelte.js';

    let {
        label = '',
        title = '',
        class: klass = '',
        ...rest
    } = $props();

    let root = $state(/** @type {HTMLElement | null} */ (null));
    let compact = $state(false);
    const displayLabel = $derived(t(label));
    const displayTitle = $derived(t(title || label));
    const lead = $derived(Array.from(String(displayLabel || ''))[0] || '');

    function rowOf(el) {
        return el?.closest('.title-row') || el?.closest('.input-wrapper') || el?.parentElement;
    }

    function check() {
        if (!root) return;
        const row = rowOf(root);
        const sizer = root.querySelector('.badge-sizer');
        if (!row || !sizer) return;
        const cs = getComputedStyle(root);
        const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        compact = 192 + 8 + sizer.scrollWidth + pad > row.clientWidth;
    }

    onMount(() => {
        const row = rowOf(root);
        const ro = new ResizeObserver(() => check());
        if (row) ro.observe(row);
        if (root) ro.observe(root);
        check();
        return () => ro.disconnect();
    });
</script>

<span
    bind:this={root}
    class="info-stack-badge {klass}"
    title={displayTitle || displayLabel}
    aria-label={displayLabel}
    {...rest}
>
    <span class="badge-sizer" aria-hidden="true">{displayLabel}</span>
    <span class="badge-label">{compact ? lead : displayLabel}</span>
</span>

<style>
    .info-stack-badge {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.125rem 0.5rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .badge-sizer {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        overflow: hidden;
        pointer-events: none;
        white-space: nowrap;
    }

    .badge-label {
        min-width: 1ch;
    }
</style>
