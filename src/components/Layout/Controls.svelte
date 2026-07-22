<script>
    import Button from '../Button/Button.svelte';

    let { isMobile = false } = $props();

    let showBg = $state(false);
    function toggleBg() {
        showBg = !showBg;
    }

    function setBg(color) {
        document.body.style.backgroundColor = color;
    }
</script>

<div class="nav-controls-root {isMobile ? 'mobile' : 'desktop'}">
    <div class="controls-bar {isMobile ? 'mobile' : ''}">
        <Button onclick={toggleBg} variant="icon-button" className="control-btn {showBg ? 'active' : ''}" aria-label="Background Color">
            <svg class="icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.85 6.361a15.996 15.996 0 00-4.647 4.761m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
            </svg>
        </Button>
    </div>

    {#if showBg}
    <div class="bg-bar-container {isMobile ? 'mobile-bg-bar' : ''}">
        <button class="color-btn" style="background-color: #000000; border: 1px solid #333;" title="Black" onclick={() => setBg('#000000')}></button>
        <button class="color-btn" style="background-color: #ffffff;" title="White" onclick={() => setBg('#ffffff')}></button>
        <button class="color-btn" style="background-color: #1A1B1D;" title="Gray" onclick={() => setBg('#1A1B1D')}></button>
        <button class="color-btn" style="background-color: #FFFDD0;" title="Cream" onclick={() => setBg('#FFFDD0')}></button>
    </div>
    {/if}
</div>

<style>
    .nav-controls-root.desktop {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }
    
    .nav-controls-root.desktop .bg-bar-container {
        position: static;
        margin-top: 8px;
        top: auto;
    }

    .controls-bar {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 24px;
        padding: 4px 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
        height: 38px;
        box-sizing: border-box;
    }

    .controls-bar.mobile {
        background: transparent;
        border: none;
        box-shadow: none;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        padding: 0;
        height: auto;
    }

    .bg-bar-container {
        display: flex;
        gap: 8px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 24px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        animation: slideDown 0.2s ease-out;
        /* Default absolute positioning for desktop usage */
        position: absolute;
        top: 100%;
        z-index: 50;
    }

    .bg-bar-container.mobile-bg-bar {
        position: fixed;
        top: 72px;
        right: 1rem;
        z-index: 50;
    }

    .color-btn {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 1px solid rgba(0,0,0,0.1);
        cursor: pointer;
        padding: 0;
        transition: transform 0.2s;
    }

    @media (hover: hover) and (pointer: fine) {
        .color-btn:hover {
            transform: scale(1.1);
        }
    }

    @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .icon {
        width: 1.25rem;
        height: 1.25rem;
    }

    :global(.control-btn) {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        color: #586069;
        background: transparent;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.2s;
    }
    @media (hover: hover) and (pointer: fine) {
        :global(.control-btn:hover) {
            color: #0366d6;
            background: #f6f8fa;
        }
    }
    :global(.control-btn.active) {
         color: #0366d6;
         background: #f6f8fa;
    }
</style>
