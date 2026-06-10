<script>
    import Button from '../Button/Button.svelte';
    import Loading from '../Loading.svelte';
    import NotFound from '../NotFound.svelte';

    let {
        title = '',
        showTitle = true,
        className = '',
        collapsible = false,
        expanded = $bindable(true),
        empty = false,
        emptyText = 'No items found',
        loading = false,
        
        // Edit mode props
        editable = false,
        isEditing = false,
        
        // Display
        display = 'block', // 'block' | 'flex'
        
        // Events
        onedit = undefined,
        oncancel = undefined,
        onsave = undefined,
        
        // Snippets
        children = undefined,
        icon = undefined,
        headerActionsStart = undefined,
        headerActions = undefined,
        loadingContent = undefined,
        emptyContent = undefined,
        
        ...rest
    } = $props();

    function handleToggle() {
        if (collapsible) expanded = !expanded;
    }
</script>

<div class="list-section {className}" {...rest}>
    {#if title && showTitle}
        <div class="list-header">
            {#if collapsible}
                 <button class="header-button" onclick={handleToggle}>
                    {#if icon}
                        <div class="header-title-icon">
                            {@render icon()}
                        </div>
                    {/if}
                    <h3 class="header-title">{title}</h3>
                    <svg class="header-icon {expanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                </button>
            {:else}
                <div class="header-static">
                    {#if icon}
                        <div class="header-title-icon">
                            {@render icon()}
                        </div>
                    {/if}
                    <h3 class="header-title">{title}</h3>
                </div>
            {/if}
            <div class="header-actions">
                {#if headerActionsStart}
                    {@render headerActionsStart()}
                {/if}
                
                {#if editable || onedit}
                    {#if !isEditing}
                        <Button variant="icon-button" onclick={onedit} aria-label="Edit">
                            <svg class="icon-sm" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                        </Button>
                    {:else}
                        <Button variant="icon-button" onclick={oncancel} aria-label="Cancel">
                            <svg class="icon-sm" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </Button>
                        <Button variant="icon-button" onclick={onsave} aria-label="Save">
                            <svg class="icon-sm" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        </Button>
                    {/if}
                {/if}
                
                {#if headerActions}
                    {@render headerActions()}
                {/if}
            </div>
        </div>
    {/if}

    {#if expanded}
        {#if loading}
            {#if loadingContent}
                {@render loadingContent()}
            {:else}
                <Loading />
            {/if}
        {:else if empty}
            {#if emptyContent}
                {@render emptyContent()}
            {:else}
                <NotFound text={emptyText} />
            {/if}
        {:else}
            <div class="info-content {display}">
                {#if children}
                    {@render children()}
                {/if}
            </div>
        {/if}
    {/if}
</div>

<style>
    .list-section {
        background-color: var(--color-bg-surface, white);
        border-radius: 8px;
        border: 1px solid var(--color-border, #dadce0);
        box-shadow: var(--shadow-sm, 0 2px 6px rgba(0, 0, 0, 0.08));
        padding: 0.5rem;
    }

    .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 0.25rem;
        padding-bottom: 0.5rem;
        padding-right: 0.5rem;
        border-bottom: 1px solid var(--color-border-muted, #e1e4e8);
    }

    .header-button {
        height: 100%;
        padding-top: 0.25rem;
        padding-bottom: 0.25rem;
        flex-grow: 1;
        min-width: 0;
        padding-left: 0.25rem;
        padding-right: 0.25rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        text-align: left;
        background: none;
        border: none;
        cursor: pointer;
        font-family: inherit;
        color: inherit;
    }

    .header-button:hover {
        background-color: var(--color-bg-subtle, #f6f8fa);
    }

    .header-static {
        height: 100%;
        padding-top: 0.25rem;
        padding-bottom: 0.25rem;
        flex-grow: 1;
        min-width: 0;
        padding-left: 0.5rem;
        padding-right: 0.5rem;
        display: flex;
        align-items: center;
        text-align: left;
        gap: 0.5rem;
    }

    .header-title-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-secondary, #6b7280);
    }

    .header-title {
        font-size: 1.125rem;
        font-weight: 500;
        color: var(--color-dark);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .info-content {
        padding-top: 0.25rem;
    }
    
    .flex {
        display: flex;
    }
    
    .flex-col {
        display: flex;
        flex-direction: column;
    }

    .header-icon {
        width: 1rem;
        height: 1rem;
        transition: transform 0.2s;
    }

    .rotate-180 {
        transform: rotate(180deg);
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .icon-sm {
        width: 1rem;
        height: 1rem;
    }

    .info-content.flex {
        display: flex;
        flex-direction: column;
    }
</style>
