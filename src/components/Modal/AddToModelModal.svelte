<script>
    import { addToMyModels } from '../../proxy/model.js';
    import { modelStore } from '../../store/models.svelte.js';
    import Dialog from './Dialog.svelte';
    import Button from '../Button/Button.svelte';
    import InfoStackInput from '../InfoStack/InfoStackInput.svelte';
    import InfoStackItem from '../InfoStack/InfoStackItem.svelte';

    let { 
        show = $bindable(false), 
        prototypeId,
        initialName = '',
        onadded = () => {},
        onclose = () => {}
    } = $props();

    let name = $state('');
    let loading = $state(false);
    let error = $state('');

    $effect(() => {
        if (show) {
            name = initialName;
            error = '';
            loading = false;
        }
    });

    async function handleAdd() {
        if (!name) return;
        
        loading = true;
        error = '';
        
        const res = await addToMyModels(prototypeId, name);
        
        if (res.result === 0) {
            modelStore.add(res.data);
            onadded(res.data);
            close();
        } else {
            error = res.msg || 'Failed to add model';
        }
        
        loading = false;
    }

    function close() {
        show = false;
        onclose();
    }
</script>

{#if show}
    {#snippet modelIcon()}
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    {/snippet}
    <Dialog 
        title="Add to My Models" 
        onclose={close} 
        maxWidth="max-w-md"
        icon={modelIcon}
    >
        <InfoStackItem>
                <p style="color: #666; font-size: 0.9rem; margin: 0;">
                Are you sure you want to add this account to your models?
                </p>
            </InfoStackItem>
        
        <InfoStackInput 
            title="Model Name" 
            bind:value={name} 
            placeholder="Enter unique model name"
        />
        
        {#if error}
            <InfoStackItem>
                <div style="font-size: 0.75rem; color: #ef4444;">{error}</div>
            </InfoStackItem>
        {/if}

        <InfoStackItem>
            {#snippet actions()}
                <div style="display: flex; gap: 0.5rem;">
                    <Button onclick={close} disabled={loading}>Cancel</Button>
                    <Button 
                        variant="text-button" 
                        onclick={handleAdd}
                        disabled={!name.trim() || loading}
                        {loading}
                    >
                        Add
                    </Button>
                </div>
            {/snippet}
        </InfoStackItem>
    </Dialog>
{/if}
