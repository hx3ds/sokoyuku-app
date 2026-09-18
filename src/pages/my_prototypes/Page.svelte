<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { deletePrototype } from '../../proxy/prototype.js';
    import { addToMyModels } from '../../proxy/model.js';
    import { modelStore } from '../../store/models.svelte.js';
    import { prototypeStore } from '../../store/prototypes.svelte.js';
    import { showConfirm, showError, showSuccess } from '../../components/Modal/state.svelte.js';
    import PageContainer from '../../components/PageContainer.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    import InfoStackDivider from '../../components/InfoStack/InfoStackDivider.svelte';
    import Button from '../../components/Button/Button.svelte';
    import ActionMenu from '../../components/Button/ActionMenu.svelte';
    import MenuItem from '../../components/Button/MenuItem.svelte';
    import AddToModelButton from '../../components/Button/AddToModelButton.svelte';
    import AddPrototypeModal from '../../components/Modal/AddPrototypeModal.svelte';
    import InfoStackBadge from '../../components/InfoStack/InfoStackBadge.svelte';

    let showAddModal: boolean = $state(false);
    let activeMenu: number | null = $state(null);
    let addingToModels: Record<string, boolean> = $state({});

    onMount(async () => {
        document.addEventListener('click', closeMenu);
        await prototypeStore.load();
    });

    onDestroy(() => {
        document.removeEventListener('click', closeMenu);
    });

    const closeMenu = () => (activeMenu = null);

    function toggleMenu(id: number, e: MouseEvent) {
        e.stopPropagation();
        activeMenu = activeMenu === id ? null : id;
    }

    function openAddModal() {
        showAddModal = true;
    }

    function navigateToPrototype(id: number) {
        history.pushState(null, '', `/prototype/${id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    async function handleDelete(id: number) {
        if (await showConfirm('Are you sure you want to delete this prototype?')) {
            const res = await deletePrototype(id);
            if (res.result === 0) {
                prototypeStore.remove(id);
            } else {
                await showError('Failed to delete prototype: ' + (res.msg || 'Unknown error'));
            }
        }
    }

    let normalPrototypes = $derived(prototypeStore.prototypes.filter((prototype) => !prototype.is_local));
    let localPrototypes = $derived(prototypeStore.prototypes.filter((prototype) => Boolean(prototype.is_local)));
</script>

{#snippet prototypeRow(prototype)}
    <InfoStackItem 
        href="/prototype/{prototype.prototype_id}"
        title={prototype.name}
        description={prototype.description || 'No description'}
    >
        {#snippet titleSuffix()}
            {#if prototype.certified}
                <svg style="width: 1rem; height: 1rem; color: #a67c52;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
            {/if}
            {#if prototype.private}
                <InfoStackBadge class="private-badge" label="Private" title="Only visible to you" />
            {/if}
        {/snippet}

        {#snippet actions()}
            <AddToModelButton prototypeId={prototype.prototype_id} prototypeName={prototype.name} />
            
            <ActionMenu 
                isOpen={activeMenu === prototype.prototype_id} 
                width="8rem"
                onclick={(e) => toggleMenu(prototype.prototype_id, e)}
            >
                <MenuItem onclick={() => navigateToPrototype(prototype.prototype_id)}>Edit</MenuItem>
                <MenuItem onclick={() => handleDelete(prototype.prototype_id)}>Delete</MenuItem>
            </ActionMenu>
        {/snippet}
    </InfoStackItem>
{/snippet}

<PageContainer id="page-my-prototypes">
    <InfoStack 
        title="My Prototypes" 
        loading={prototypeStore.loading} 
        empty={prototypeStore.prototypes.length === 0} 
        emptyText="You haven't created any prototypes yet."
    >
        {#snippet headerActions()}
            <Button variant="icon-button" iconSize="1.25rem" padding="0.25rem" onclick={openAddModal} aria-label="Create Prototype">
                <svg class="icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            </Button>
        {/snippet}

        {#each normalPrototypes as prototype (prototype.prototype_id)}
            {@render prototypeRow(prototype)}
        {/each}
        {#if normalPrototypes.length > 0 && localPrototypes.length > 0}
            <InfoStackDivider label="Local" ariaLabel="Local prototypes" />
        {/if}
        {#each localPrototypes as prototype (prototype.prototype_id)}
            {@render prototypeRow(prototype)}
        {/each}
    </InfoStack>
</PageContainer>

<AddPrototypeModal 
    bind:show={showAddModal} 
    oncreated={() => prototypeStore.load()}
/>

<style>
    :global(.info-stack-badge.private-badge) {
        background: rgba(107, 114, 128, 0.12);
        color: rgb(75, 85, 99);
    }
</style>
