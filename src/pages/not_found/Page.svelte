<script>
  import Button from '../../components/Button/Button.svelte';

  function handleGoBack(e) {
    if (e) e.preventDefault();
    // Try to go back in history. 
    // If successful, the browser will fire 'popstate', which App.svelte listens to.
    // App.svelte will then handle the routing and auth redirection.
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // Fallback: Go to app root using the custom routing mechanism
        // This pushes state and dispatches 'popstate' for App.svelte to pick up
        window.history.pushState(null, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }
</script>

<div style="background-color: #f6f8fa; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: var(--font-roboto); padding: 1rem;">
  <div style="background-color: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); width: 100%; max-width: 28rem;">
    <h1 style="font-size: 1.875rem; line-height: 2.25rem; font-weight: 700; text-align: center; color: var(--color-dark); padding-bottom: 0.5rem; margin: 0;">404</h1>
    <p style="text-align: center; color: #4b5563; padding-bottom: 2rem; margin: 0;">Page Not Found</p>
    <div style="padding-top: 1rem; text-align: center; display: flex; justify-content: center;">
        <Button variant="text-button" onclick={handleGoBack}>Go Back</Button>
    </div>
  </div>
</div>

