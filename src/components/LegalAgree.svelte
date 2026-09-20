<script>
    import { t, tSplit, locale } from '../i18n/locale.svelte.js';
    import {
        LEGAL_TERMS_URL,
        LEGAL_PRIVACY_URL,
        LEGAL_COOKIES_URL,
    } from '../config.js';

    const LABELS = {
        terms: 'Terms of Service',
        privacy: 'Privacy Policy',
        cookies: 'Cookie Policy',
    };

    const HREFS = {
        terms: LEGAL_TERMS_URL,
        privacy: LEGAL_PRIVACY_URL,
        cookies: LEGAL_COOKIES_URL,
    };

    const parts = $derived.by(() => {
        locale.current;
        return tSplit(
            'I confirm that I have read and agree to Sokoyuku\'s {terms}, {privacy}, and {cookies}.',
            ['terms', 'privacy', 'cookies']
        );
    });
</script>

<span class="legal-agree">
    {#each parts as part, i (part.slot ? `slot-${part.slot}` : `text-${i}`)}
        {#if part.slot}
            <a href={HREFS[part.slot]} target="_blank" rel="noopener noreferrer">{t(LABELS[part.slot])}</a>
        {:else}
            {part.text}
        {/if}
    {/each}
</span>

<style>
    .legal-agree {
        line-height: 1.375;
    }

    .legal-agree a {
        color: var(--color-primary);
        font-weight: 500;
        text-decoration: none;
        transition: color 0.2s;
    }
</style>
