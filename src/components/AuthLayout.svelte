<script>
    export let title = '';
    export let subtitle = '';
</script>

<div class="layout-container">
    <div class="card">
        <h1 class="logo">Sokoyuku</h1>
        {#if title}
            <h2 class="page-title">{title}</h2>
        {/if}
        {#if subtitle}
            <p class="subtitle">{subtitle}</p>
        {/if}
        <slot />
    </div>
</div>

<style>
    .layout-container {
        background-color: var(--color-softcream);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Roboto, sans-serif;
        padding: 1rem;
    }

    .card {
        background-color: var(--color-bg-surface);
        padding: 2.5rem;
        border-radius: 10px;
        box-shadow: var(--shadow-md);
        width: 100%;
        max-width: 28rem;
    }

    .logo {
        font-size: 1.875rem;
        line-height: 2.25rem;
        font-weight: 700;
        text-align: center;
        color: var(--color-primary);
        padding-bottom: 0.5rem;
    }

    .page-title {
        font-size: 1.25rem;
        line-height: 1.75rem;
        font-weight: 600;
        text-align: center;
        color: var(--color-dark);
        padding-bottom: 0.25rem;
    }

    .subtitle {
        text-align: center;
        color: var(--color-text-secondary);
        padding-bottom: 2rem;
    }
</style>
