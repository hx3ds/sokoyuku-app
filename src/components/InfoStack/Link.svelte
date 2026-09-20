<script>
    import { onMount } from 'svelte';

    let {
        href = '#',
        className = '',
        activeClassName = '',
        title = '',
        block = false,
        icon = false,
        accent = false,
        children,
        ...rest
    } = $props();
    
    let isActive = $state(false);
    let isExternal = $derived(
        Boolean(rest.target === '_blank' || /^https?:\/\//i.test(href))
    );

    function handleClick(e) {
        if (isExternal) return;
        e.preventDefault();
        // Push state and dispatch a custom event that App.svelte listens to
        history.pushState(null, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    function checkActive() {
        if (typeof window === 'undefined' || isExternal) return;
        const currentPath = window.location.pathname;
        if (href === '/') {
            isActive = currentPath === '/';
        } else {
            isActive = currentPath.startsWith(href);
        }
    }

    onMount(() => {
        checkActive();
        window.addEventListener('popstate', checkActive);
        return () => {
            window.removeEventListener('popstate', checkActive);
        };
    });
</script>

<a 
    {href} 
    class="{className} {isActive ? activeClassName : ''} {block ? 'link-block' : ''} {icon ? 'icon-link' : ''} {icon && accent ? 'accent' : ''}" 
    aria-current={isActive ? 'page' : undefined} 
    {title} 
    onclick={handleClick} 
    {...rest}
>
    {#if children}
        {@render children({ isActive })}
    {/if}
</a>

<style>
    a {
        text-decoration: none;
    }
    .link-block {
        display: block;
        width: 100%;
        padding: 0.5rem;
        color: inherit;
        text-decoration: none;
        transition: color 0.2s;
        border: 1px solid transparent;
    }
    @media (hover: hover) and (pointer: fine) {
        .link-block:hover {
            color: var(--color-primary);
        }
    }

    .icon-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: inherit;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        line-height: 0;
    }

    .icon-link.accent {
        color: var(--color-primary);
    }

    @media (hover: hover) and (pointer: fine) {
        .icon-link:hover {
            color: var(--color-primary);
            text-decoration: none;
            background-color: color-mix(in srgb, var(--color-primary), transparent 80%);
        }

        .icon-link.accent:hover {
            color: var(--color-primary-hover);
        }
    }
</style>
