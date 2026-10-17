<script>
    import Dialog from './Dialog.svelte';
    import Button from '../Button/Button.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';
    import { formatDateTime, t } from '../../i18n/locale.svelte.js';
    import { callStore, normalizeCallId } from '../../store/calls.svelte.js';

    let {
        model = null,
        sessions = [],
        loading = false,
        onclose = () => {},
        onresume = () => {},
        onhangup = () => {},
    } = $props();

    function sessionLabel(session, index) {
        const created = formatDateTime(session?.created_at);
        if (created) return t('Call {n} · {date}', { n: index + 1, date: created });
        return t('Call {n}', { n: index + 1 });
    }

    function sessionMeta(session) {
        const parts = [];
        if (callStore.isLiveSession(session?.session_id)) parts.push(t('Active call'));
        else if (callStore.keyFor(session?.session_id)) parts.push(t('Can resume'));
        else parts.push(t('Cannot resume from this device'));
        const expires = formatDateTime(session?.expires_at);
        if (expires) parts.push(t('Expires {date}', { date: expires }));
        return parts.join(' · ');
    }
</script>

{#snippet callIcon()}
    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
{/snippet}

<Dialog
    title={t('Manage Calls - {name}', { name: model?.name ?? t('Unknown') })}
    maxWidth="max-w-xl"
    onclose={() => onclose()}
    loading={loading}
    empty={false}
    icon={callIcon}
>
    {#each sessions as session, index (normalizeCallId(session.session_id) || index)}
        <InfoStackItem>
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                <h4 style="font-weight: 500; color: var(--color-dark); margin: 0;">{sessionLabel(session, index)}</h4>
                <span style="font-size: 0.75rem; color: var(--color-text-secondary);">{sessionMeta(session)}</span>
            </div>
            {#snippet actions()}
                <Button
                    variant="text-button"
                    onclick={() => onresume(session)}
                >{t('Resume')}</Button>
                <Button
                    variant="text-button"
                    onclick={() => onhangup(session)}
                >{t('Hang up')}</Button>
            {/snippet}
        </InfoStackItem>
    {/each}

    <InfoStackItem>
        {#snippet actions()}
            <Button variant="text-button" onclick={() => onclose()}>{t('Close')}</Button>
        {/snippet}
    </InfoStackItem>
</Dialog>
