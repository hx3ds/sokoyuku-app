<script>
    import InfoStackItem from './InfoStackItem.svelte';

    let {
        title,
        description,
        ...rest
    } = $props();
</script>

<InfoStackItem {title} {description} {...rest} className="model-item {rest.className || ''}">
    {#snippet start()}
        <div class="icon-wrapper">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
        </div>
    {/snippet}
</InfoStackItem>

<style>
    .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        background-color: #f3f4f6;
        border-radius: 0.5rem;
        color: #4b5563;
    }

    .icon {
        width: 1.25rem;
        height: 1.25rem;
    }


</style>
