<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import Loading from '../../components/Loading.svelte';
    import NotFound from '../../components/NotFound.svelte';
    import { fetchMyPrototypes, fetchUserPrototypes, deletePrototype, certifyPrototype, updatePrototype } from '../../proxy/prototype.js';
    import { fetchProfile } from '../../proxy/user.js';
    import { showConfirm, showError } from '../../components/Modal/state.svelte.js';
    import PageContainer from '../../components/PageContainer.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    import ActionMenu from '../../components/Button/ActionMenu.svelte';
    import MenuItem from '../../components/Button/MenuItem.svelte';
    import AddToModelButton from '../../components/Button/AddToModelButton.svelte';

    type PrototypeListItem = {
        prototype_id: number;
        username?: string;
        name: string;
        description?: string | null;
        certified?: boolean;
        status?: string | null;
    };

    type UserProfile = {
        username: string;
    };

    let { username = '' } = $props() as { username?: string };
    let prototypes = $state<PrototypeListItem[]>([]);
    let loading = $state(true);
    let currentUser = $state<UserProfile | null>(null);
    let activeMenu = $state<number | null>(null);

    onMount(() => {
        document.addEventListener('click', closeMenu);
    });

    onDestroy(() => {
        document.removeEventListener('click', closeMenu);
    });

    const closeMenu = () => activeMenu = null;

    function toggleMenu(id: number, e: MouseEvent) {
        e.stopPropagation();
        activeMenu = activeMenu === id ? null : id;
    }

    $effect(() => {
        if (username) {
            loadData();
        }
    });

    async function loadData() {
        loading = true;
        currentUser = await fetchProfile();
        if (currentUser?.username === username) {
            prototypes = (await fetchMyPrototypes()) as PrototypeListItem[];
        } else {
            prototypes = (await fetchUserPrototypes(username)) as PrototypeListItem[];
        }
        loading = false;
    }

    async function handleAction(action: string, prototype: PrototypeListItem) {
        if (action === 'edit') {
            window.history.pushState({}, '', `/prototype/${prototype.prototype_id}`);
        } else if (action === 'delete') {
            if (await showConfirm('Are you sure you want to delete this prototype?')) {
                const res = await deletePrototype(prototype.prototype_id);
                if (res.result === 0) {
                    await loadData();
                } else {
                    await showError('Failed to delete prototype: ' + res.msg);
                }
            }
        } else if (action === 'certify') {
            const res = await certifyPrototype(prototype.prototype_id);
            if (res.result === 0) {
                await loadData();
            } else {
                await showError('Failed to certify prototype: ' + res.msg);
            }
        } else if (action === 'start') {
            const res = await updatePrototype({ prototype_id: prototype.prototype_id, status: 'active' });
            if (res.result === 0) {
                await loadData();
            } else {
                await showError('Failed to start prototype: ' + (res.msg || 'Unknown error'));
            }
        } else if (action === 'stop') {
            const res = await updatePrototype({ prototype_id: prototype.prototype_id, status: 'inactive' });
            if (res.result === 0) {
                await loadData();
            } else {
                await showError('Failed to stop prototype: ' + (res.msg || 'Unknown error'));
            }
        }
    }

    // Check if current user is owner (or admin if applicable, but simplest is owner check)
    let isOwner = $derived(!!currentUser && currentUser.username === username);
</script>

<PageContainer id="page-prototypes">
    <InfoStack title="Prototypes by {username}" id="prototypesList">
        {#if loading}
            <Loading />
        {:else if prototypes.length === 0}
            <NotFound text="No prototypes found" />
        {:else}
            {#each prototypes as prototype}
                <InfoStackItem href="/prototype/{prototype.prototype_id}" title={prototype.name} description={prototype.description || 'No description'} separateHover>
                    {#snippet titleSuffix()}
                        {#if prototype.certified}
                            <svg style="width: 1rem; height: 1rem; color: #22c55e;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                            </svg>
                        {/if}
                    {/snippet}

                    {#snippet actions()}
                        <AddToModelButton prototypeId={prototype.prototype_id} prototypeName={prototype.name} size="2.25rem" padding="0.5rem"/>
                        
                        {#if isOwner}
                            <ActionMenu size="2rem"
                                isOpen={activeMenu === prototype.prototype_id} 
                                width="6rem"
                                onclick={(e) => toggleMenu(prototype.prototype_id, e)}
                            >
                                <MenuItem onclick={() => handleAction('edit', prototype)}>Edit</MenuItem>
                                {#if prototype.status !== 'active'}
                                    <MenuItem onclick={() => handleAction('start', prototype)}>Start</MenuItem>
                                {:else}
                                    <MenuItem onclick={() => handleAction('stop', prototype)}>Stop</MenuItem>
                                {/if}
                                <MenuItem onclick={() => handleAction('delete', prototype)}>Delete</MenuItem>
                                {#if !prototype.certified}
                                    <MenuItem onclick={() => handleAction('certify', prototype)}>Certify</MenuItem>
                                {/if}
                            </ActionMenu>
                        {/if}
                    {/snippet}
                </InfoStackItem>
            {/each}
        {/if}
    </InfoStack>
</PageContainer>
