<script>
    import Link from './Link.svelte';

    let {
        href = '',
        className = '',
        title = '',
        description = '',
        lines = 1,
        onclick = undefined,
        children = undefined,
        start = undefined,
        titleSuffix = undefined,
        meta = undefined,
        actions = undefined,
        hover = undefined,
        isLabel = false,
        separateHover = false,
        ...rest
    } = $props();

    let isInteractive = $derived(!!(href || onclick));
    let showHover = $derived(hover === undefined ? isInteractive : hover);
    let hasDescription = $derived(!!(description || children));

    function handleClick(e) {
        if (!separateHover && e.target.closest('.actions')) return;
        if (onclick) onclick(e);
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="list-item {className}" 
    class:interactive={!separateHover && isInteractive} 
    class:hoverable={!separateHover && showHover} 
    class:align-center={!hasDescription} 
    onclick={!separateHover ? handleClick : undefined} 
    style="--line-clamp: {lines};" 
    {...rest}>

    {#snippet mainContent()}
        {#if start}
            <div class="start-slot">
                {@render start()}
            </div>
        {/if}

        {#if href}
            <Link {href} className="content-link">
                {@render content()}
            </Link>
        {:else}
            <div class="content-block">
                {@render content()}
            </div>
        {/if}
    {/snippet}

    {#snippet content()}
        {#if title}
            <div class="title-row">
                <h4 class="title" class:label-title={isLabel}>{title}</h4>
                {#if titleSuffix}
                    {@render titleSuffix()}
                {/if}
            </div>
        {/if}
        {#if meta}
            {@render meta()}
        {/if}
        {#if description}
            <p class="description">{description}</p>
        {/if}
        {#if children}
            {@render children()}
        {/if}
    {/snippet}

    {#if separateHover}
        <div class="main-content-wrapper"
             class:interactive={isInteractive}
             class:hoverable={showHover}
             onclick={handleClick}>
            {@render mainContent()}
        </div>
    {:else}
        {@render mainContent()}
    {/if}

    {#if actions || href}
        <div class="actions">
            {#if actions}
                {@render actions()}
            {:else}
                <svg class="chevron-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                </svg>
            {/if}
        </div>
    {/if}
</div>

<style>
    .chevron-icon {
        width: 1.25rem;
        height: 1.25rem;
        color: #9ca3af;
    }

    .list-item {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 0;
        transition: background-color 0.15s;
        gap: 0;
        border-radius: 4px;
        position: relative;
    }

    .list-item.interactive {
        cursor: pointer;
    }

    .list-item.align-center {
        align-items: center;
    }

    .list-item.hoverable:hover {
        background-color: #f6f8fa;
    }

    .start-slot {
        padding: 0.5rem 0 0.5rem 0.5rem;
    }
    
    .actions {
        padding: 0.5rem 0.5rem 0.5rem 0;
    }

    /* Adjust padding when no start slot */
    .list-item:not(:has(.start-slot)) :global(.content-link),
    .list-item:not(:has(.start-slot)) .content-block {
        padding-left: 0.5rem;
    }

    /* Target the Link component wrapper or div */
    :global(.content-link), .content-block {
        flex: 1;
        min-width: 0;
        display: block;
        text-decoration: none;
        color: inherit;
        padding: 0.5rem 0.5rem 0.5rem 0;
    }

    :global(.content-link:hover) {
        text-decoration: none;
    }

    .title-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .title {
        font-weight: 500;
        color: var(--color-dark);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .title.label-title {
        font-weight: 400;
        color: var(--color-text-secondary);
        font-size: 0.875rem;
    }

    .description {
        font-size: 0.75rem;
        color: var(--color-text-muted, #586069);
        padding-top: 0.125rem;
        line-height: 1.375;
        
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: var(--line-clamp);
        line-clamp: var(--line-clamp);
    }

    .actions {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        height: 100%;
    }

    .main-content-wrapper {
        display: flex;
        flex: 1;
        min-width: 0;
        align-items: inherit;
        gap: inherit;
        border-radius: 4px;
        transition: background-color 0.15s;
    }

    .main-content-wrapper.interactive {
        cursor: pointer;
    }

    .main-content-wrapper.hoverable:hover {
        background-color: #f6f8fa;
    }
</style>
