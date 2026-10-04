<script>
    import Dialog from './Dialog.svelte';
    import Button from '../Button/Button.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';
    import { showSuccess, showError } from './state.svelte.js';
    import { t } from '../../i18n/locale.svelte.js';

    let {
        url = '',
        onclose = () => {}
    } = $props();

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(url);
            showSuccess(t('Link copied!'));
        } catch {
            const copied = prompt(t('Copy link:'), url);
            if (copied == null) showError(t('Failed to copy link'));
        }
    }
</script>

{#snippet linkIcon()}
    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
{/snippet}

<Dialog
    title="Open chat"
    {onclose}
    maxWidth="max-w-md"
    icon={linkIcon}
>
    <InfoStackItem>
        <p class="hint">{t('The browser blocked the chat window. Open this link.')}</p>
    </InfoStackItem>
    <InfoStackItem>
        <a class="chat-url" href={url} target="_blank" rel="noopener noreferrer">{url}</a>
    </InfoStackItem>
    <InfoStackItem>
        {#snippet actions()}
            <div class="actions">
                <Button variant="text-button" onclick={copyLink}>{t('Copy to clipboard')}</Button>
                <Button variant="text-button" onclick={onclose}>{t('Done')}</Button>
            </div>
        {/snippet}
    </InfoStackItem>
</Dialog>

<style>
    .hint {
        margin: 0;
        color: var(--color-text-secondary);
    }

    .chat-url {
        color: var(--color-primary);
        word-break: break-all;
    }

    .actions {
        display: flex;
        gap: 0.75rem;
    }
</style>
