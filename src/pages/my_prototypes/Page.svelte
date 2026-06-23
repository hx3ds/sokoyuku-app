<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { deletePrototype, certifyPrototype, updatePrototype } from '../../proxy/prototype.js';
    import { addToMyModels } from '../../proxy/model.js';
    import { modelStore } from '../../store/models.svelte.js';
    import { prototypeStore } from '../../store/prototypes.svelte.js';
    import { showConfirm, showError, showSuccess } from '../../components/Modal/state.svelte.js';
    import PageContainer from '../../components/PageContainer.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    import Button from '../../components/Button/Button.svelte';
    import ActionMenu from '../../components/Button/ActionMenu.svelte';
    import MenuItem from '../../components/Button/MenuItem.svelte';
    import AddToModelButton from '../../components/Button/AddToModelButton.svelte';
    import AddPrototypeModal from '../../components/Modal/AddPrototypeModal.svelte';

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

    async function handleCertify(id: number) {
        const res = await certifyPrototype(id);
        if (res.result === 0) {
            // Assume certification just sets a flag, but we might want to reload to be sure
            // or update manually. Let's update manually for responsiveness.
            prototypeStore.update({ prototype_id: id, certified: true });
        } else {
            await showError('Failed to certify prototype: ' + (res.msg || 'Unknown error'));
        }
    }

    async function handleStart(id: number) {
        const res = await updatePrototype({ prototype_id: id, status: 'active' });
        if (res.result === 0) {
            prototypeStore.update({ prototype_id: id, status: 'active' });
        } else {
            await showError('Failed to start prototype: ' + (res.msg || 'Unknown error'));
        }
    }

    async function handleStop(id: number) {
        const res = await updatePrototype({ prototype_id: id, status: 'inactive' });
        if (res.result === 0) {
            prototypeStore.update({ prototype_id: id, status: 'inactive' });
        } else {
            await showError('Failed to stop prototype: ' + (res.msg || 'Unknown error'));
        }
    }
</script>

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

        {#each prototypeStore.prototypes as prototype (prototype.prototype_id)}
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
                    {#if prototype.is_local}
                        <span style="padding: 0.125rem 0.375rem; font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 0.125rem; background-color: rgba(56, 189, 248, 0.15); color: rgba(3, 105, 161, 0.9);">Local</span>
                    {/if}
                    {#if prototype.private}
                        <span style="padding: 0.125rem 0.375rem; font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 0.125rem; background-color: rgba(0, 0, 0, 0.1); color: rgba(0, 0, 0, 0.6);">Private</span>
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
                        {#if prototype.status !== 'active'}
                            <MenuItem onclick={() => handleStart(prototype.prototype_id)}>Start</MenuItem>
                        {:else}
                            <MenuItem onclick={() => handleStop(prototype.prototype_id)}>Stop</MenuItem>
                        {/if}
                        <MenuItem onclick={() => handleDelete(prototype.prototype_id)}>Delete</MenuItem>
                        {#if !prototype.certified}
                            <MenuItem onclick={() => handleCertify(prototype.prototype_id)}>Certify</MenuItem>
                        {/if}
                    </ActionMenu>
                {/snippet}
            </InfoStackItem>
        {/each}
    </InfoStack>
</PageContainer>

<AddPrototypeModal 
    bind:show={showAddModal} 
    oncreated={() => prototypeStore.load()}
/>
