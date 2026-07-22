<script>
    export let disabled = false;
    export let loading = false;
    export let className = '';
    export let padding = undefined;
    export let iconSize = undefined;
    export let onclick = undefined;
    export let variant = 'icon-button'; // icon-button, text-button

    export let menuOpen = false;
    export let menuClass = '';
    export let menuStyle = '';
    export let containerStyle = '';

    export let tooltip = '';
    export let tooltipPosition = 'top';

    let showTooltip = false;
    let tooltipTimeout;

    function handleMouseEnter() {
        if (!tooltip || menuOpen) return;
        tooltipTimeout = setTimeout(() => {
            showTooltip = true;
        }, 600);
    }

    function handleMouseLeave() {
        clearTimeout(tooltipTimeout);
        showTooltip = false;
    }

    function handleClick(e) {
        if (loading) return;
        if (onclick) {
            onclick(e);
        }
    }
</script>

<div 
    class="button-container" 
    style={containerStyle}
    role="group" 
    on:mouseenter={handleMouseEnter} 
    on:mouseleave={handleMouseLeave}
>
    <button 
        type="button"
        class="btn {variant} {className}" 
        style="{padding ? `padding: ${padding} !important;` : ''}{iconSize ? ` --icon-size: ${iconSize};` : ''}{$$restProps.style ? ` ${$$restProps.style}` : ''}"
        disabled={disabled || loading}
        aria-expanded={menuOpen}
        on:click={handleClick}
        {...$$restProps}
    >
        {#if loading}
            <svg 
                class="spinner" 
                style="color: currentColor;" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
            >
                <circle class="spinner-track" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        {:else}
            <slot />
        {/if}
    </button>
    
    {#if menuOpen && $$slots.menu}
        <div class="menu-dropdown {menuClass}" style={menuStyle}>
            <slot name="menu" />
        </div>
    {/if}

    {#if showTooltip && tooltip}
        <div class="tooltip {tooltipPosition}" role="tooltip">
            {tooltip}
        </div>
    {/if}
</div>

<style>
    /* Button layout and icon standardization */
    .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s ease-in-out;
        border: none;
        background-color: transparent;
    }

    /* Icon Button Styles */
    .btn.icon-button {
        background-color: transparent;
        border: none;
        padding: 0;
    }

    @media (hover: hover) and (pointer: fine) {
        .btn.icon-button:hover:not(:disabled) {
            background-color: color-mix(in srgb, var(--color-primary), transparent 80%);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }

        .btn.icon-button:hover:not(:disabled) :global(svg) {
            color: var(--color-primary);
        }
    }
    
    .btn.icon-button:active:not(:disabled) {
        box-shadow: none;
    }
    
    .btn.icon-button :global(svg) {
        width: var(--icon-size, 1.25em);
        height: var(--icon-size, 1.25em);
        flex-shrink: 0;
        transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Text Button Styles */
    .btn.text-button {
        display: inline-flex;
        background-color: var(--color-primary, #0088cc);
        color: var(--color-primary-contrast, #ffffff);
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-weight: 500;
        font-family: inherit;
        font-size: 0.875rem;
        border: 1px solid transparent;
        white-space: nowrap;
        width: max-content;
        min-width: min-content;
        user-select: none;
    }

    @media (hover: hover) and (pointer: fine) {
        .btn.text-button:hover:not(:disabled) {
            filter: brightness(110%);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
    }

    .btn.text-button:active:not(:disabled) {
        filter: brightness(90%);
        box-shadow: none;
    }

    .btn.text-button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    /* Spinner styles */
    .spinner {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .spinner-track {
        opacity: 0.25;
    }

    .spinner-path {
        opacity: 0.75;
    }

    /* Menu specific */
    .button-container {
        position: relative;
        display: inline-flex;
    }

    
    .menu-dropdown {
        position: absolute;
        right: 0;
        top: calc(100% + 0.5rem);
        background-color: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05);
        z-index: 50;
        display: flex;
        flex-direction: column;
        padding: 6px;
        min-width: max-content;
        animation: menu-enter 0.15s cubic-bezier(0.2, 0, 0.13, 1.5) forwards;
        transform-origin: top right;
    }

    @keyframes menu-enter {
        from {
            opacity: 0;
            transform: scale(0.9) translateY(-10px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }

    /* Tooltip styles */
    .tooltip {
        position: absolute;
        background-color: var(--color-text-main, #333);
        color: var(--color-text-inverse, #fff);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        line-height: 1.2;
        white-space: nowrap;
        z-index: 100;
        pointer-events: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        opacity: 0;
        animation: tooltip-fade 0.2s forwards;
    }

    .tooltip.top {
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%) translateY(-6px);
    }

    .tooltip.bottom {
        top: 100%;
        left: 50%;
        transform: translateX(-50%) translateY(6px);
    }
    
    .tooltip.left {
        top: 50%;
        right: 100%;
        transform: translateY(-50%) translateX(-6px);
    }
    
    .tooltip.right {
        top: 50%;
        left: 100%;
        transform: translateY(-50%) translateX(6px);
    }

    @keyframes tooltip-fade {
        to { opacity: 1; }
    }
</style>