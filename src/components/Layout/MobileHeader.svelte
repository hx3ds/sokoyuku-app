<header class="mobile-header">
    <div class="header-content">
        <div class="logo-container">
            <h1 class="logo-text">Sokoyuku</h1>
        </div>
    </div>
</header>

<style>
    .mobile-header {
        background-color: var(--color-bg-surface);
        border-bottom: 1px solid var(--color-border);
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 40;
        height: 64px;
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .header-content {
        display: flex;
        align-items: center;
        padding: 0 16px;
        height: 100%;
    }

    .logo-container {
        display: flex;
        align-items: center;
    }

    .logo-text {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--color-primary);
    }

    @media (min-width: 768px) {
        .mobile-header {
            display: none;
        }
    }
</style>
