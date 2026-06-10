<script>
    import { addToMyModels } from '../../proxy/model.js';
    import { modelStore } from '../../store/models.svelte.js';
    import { showError } from '../Modal/state.svelte.js';
    import AddToModelModal from '../Modal/AddToModelModal.svelte';

    import Button from './Button.svelte';

    export let prototypeId;
    export let prototypeName = '';
    export let className = '';
    export let padding = undefined;
    export let size = '1.75rem';

    let loading = false;
    let added = false;
    let showModal = false;

    async function handleClick(e) {
        e.stopPropagation();
        if (loading) return;
        
        loading = true;
        const res = await addToMyModels(prototypeId);
        
        if (res.result === 0) {
            modelStore.add(res.data);
            handleSuccess();
        } else {
            // If model name already exists, show modal to rename
            if (res.msg && (res.msg.toLowerCase().includes('exist') || res.msg.toLowerCase().includes('duplicate') || res.msg.toLowerCase().includes('already'))) {
                showModal = true;
            } else {
                showError('Failed to add model: ' + res.msg);
            }
        }
        
        loading = false;
    }

    function handleSuccess() {
        added = true;
        setTimeout(() => {
            added = false;
        }, 2000);
    }
</script>

<Button 
    variant="icon-button"
    className="add-model-btn {className}"
    style="width: {size}; height: {size}; {added ? 'color: var(--color-success);' : ''}"
    {padding}
    onclick={handleClick}
    tooltip="Add to my models"
    tooltipPosition="bottom"
    loading={loading}
    aria-label="Add to my models"
>
    {#if added}
        <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    {:else}
        <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
        </svg>
    {/if}
</Button>

<AddToModelModal 
    bind:show={showModal} 
    {prototypeId} 
    initialName={prototypeName}
    onadded={handleSuccess}
/>
