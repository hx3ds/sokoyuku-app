<script>
    import Dialog from './Dialog.svelte';
    import Button from '../Button/Button.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';

    let {
        model = null,
        chats = [],
        loading = false,
        onclose = () => {},
        ondeleteChat = (chat) => {},
        onopenChat = (chat) => {}
    } = $props();

    const formatDate = d => new Date(d).toLocaleString();
    const chatKey = (chat) => `${chat.account_id || ''}:${chat.chat_id || chat.id || ''}`;
</script>

{#snippet chatIcon()}
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
    {/snippet}
    <Dialog 
        title={`Manage Chats - ${model?.name ?? 'Unknown'}`} 
        maxWidth="max-w-xl" 
        onclose={() => onclose()}
        loading={loading}
        empty={chats.length === 0}
        emptyText="No chats found for this model"
        icon={chatIcon}
    >
    {#each chats as chat (chatKey(chat))}
        <InfoStackItem onclick={() => onopenChat(chat)}>
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                <h4 style="font-weight: 500; color: var(--color-dark); margin: 0;">{chat.title || chat.chat_id || 'Untitled Chat'}</h4>
                <span style="font-size: 0.75rem; color: var(--color-text-secondary);">{chat.chat_type || ''}{chat.account_id ? ` · ${chat.account_id}` : ''}{chat.created_at ? ` · ${formatDate(chat.created_at)}` : ''}</span>
            </div>
            
            {#snippet actions()}
                <Button 
                    variant="danger"
                    onclick={(e) => { e.stopPropagation(); ondeleteChat(chat); }}
                    aria-label="Delete chat"
                >
                    <svg style="width: 1.25rem; height: 1.25rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </Button>
            {/snippet}
        </InfoStackItem>
    {/each}

    <InfoStackItem>
        {#snippet actions()}
            <Button variant="text-button" onclick={() => onclose()}>Close</Button>
        {/snippet}
    </InfoStackItem>
</Dialog>


