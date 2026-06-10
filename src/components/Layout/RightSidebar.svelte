<div class="right-sidebar">
    <div class="recommendations-card">
        <h3 class="recommendations-title">Recommendations</h3>
    </div>
</div>

<style>
    .right-sidebar {
        display: none;
        width: 360px;
        padding: 0.5rem;
        padding-top: 3rem;
    }

    .recommendations-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
        padding: 1.5rem;
    }

    .recommendations-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #24292e;
        padding-bottom: 1rem;
    }

    @media (min-width: 1280px) {
        .right-sidebar {
            display: block;
        }
    }
</style>
