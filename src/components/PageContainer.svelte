<script>
    export let maxWidth = "max-w-7xl";
    export let className = "page-container";
    export let id = "";
    export let gap = "0.25rem";
</script>

<div class={className} {id}>
    <div class="{maxWidth} inner-container" style={gap ? `display: flex; flex-direction: column; gap: ${gap};` : ""}>
        <slot />
    </div>
</div>

<style>
    :global(.page-container) {
        padding-top: 0.5rem;
        padding: 1rem;
        display: flex;
        justify-content: center;
    }

    @media (min-width: 768px) {
        :global(.page-container) {
            padding-top: 1rem;
        }
    }

    .inner-container {
        width: 100%;
    }

    .max-w-7xl {
        max-width: 80rem;
    }

    .max-w-5xl {
        max-width: 64rem;
    }
    
    .max-w-4xl {
        max-width: 56rem;
    }

    .max-w-3xl {
        max-width: 48rem;
    }
    
    .max-w-xl {
        max-width: 36rem;
    }
</style>
