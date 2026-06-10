<script>
    import { onMount } from 'svelte';
    import { fetchNotifications } from '../../proxy/notification.js';
    import PageContainer from '../../components/PageContainer.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    
    let notifications = $state([]);
    let loading = $state(true);

    onMount(async () => {
        await loadNotifications();
    });

    async function loadNotifications() {
        loading = true;
        notifications = await fetchNotifications();
        notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        loading = false;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
</script>

<PageContainer id="page-notifications">
    <InfoStack title="Notifications" {loading} empty={notifications.length === 0} emptyText="No notifications">
        {#each notifications as notification}
            <InfoStackItem 
                title={notification.content} 
                description={formatDate(notification.created_at)}
            >
                {#snippet start()}
                    {#if notification.type === 'success'}
                        <svg style="width: 1rem; height: 1rem; color: #22c55e;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    {:else if notification.type === 'warning'}
                        <svg style="width: 1rem; height: 1rem; color: #eab308;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    {:else}
                        <svg style="width: 1rem; height: 1rem; color: #3b82f6;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                    {/if}
                {/snippet}
            </InfoStackItem>
        {/each}
    </InfoStack>
</PageContainer>
