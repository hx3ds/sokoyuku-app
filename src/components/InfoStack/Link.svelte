<script>
    import { onMount } from 'svelte';

    let {
        href = '#',
        className = '',
        activeClassName = '',
        title = '',
        block = false,
        children,
        ...rest
    } = $props();
    
    let isActive = $state(false);

    function handleClick(e) {
        e.preventDefault();
        // Push state and dispatch a custom event that App.svelte listens to
        history.pushState(null, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    function checkActive() {
        if (typeof window === 'undefined') return;
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
    class="{className} {isActive ? activeClassName : ''} {block ? 'link-block' : ''}" 
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
    .link-block:hover {
        color: var(--color-primary, #0088cc);
    }
</style>
