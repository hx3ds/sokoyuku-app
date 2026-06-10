<script>
  import { onMount } from 'svelte';
  import { signIn } from '../../proxy/auth.js';
  import Link from '../../components/InfoStack/Link.svelte';
  import AuthLayout from '../../components/AuthLayout.svelte';
  import InfoStack from '../../components/InfoStack/InfoStack.svelte';
  import { TELEGRAM_LOGIN_USERNAME } from '../../config.js';

  let identifierError = $state('');

  onMount(() => {
    // @ts-ignore
    window.onTelegramAuth = async (user) => {
        const data = await signIn(null, null, user);
        
        if (data.result === 0) {
            history.pushState(null, '', '/models');
            window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
            identifierError = data.msg;
        }
    };

    if (TELEGRAM_LOGIN_USERNAME) {
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', TELEGRAM_LOGIN_USERNAME);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        script.async = true;
        
        const container = document.getElementById('telegram-login-container');
        if (container) {
            container.appendChild(script);
        }
    }
  });
</script>

<AuthLayout title="Sign In">
    <InfoStack showTitle={false} style="padding: 0 !important; border: none !important; box-shadow: none !important; background: transparent !important;">
    {#if identifierError}
      <p style="padding-top: 0.25rem; font-size: 0.75rem; color: #ef4444; text-align: center; padding-bottom: 1rem;">{identifierError}</p>
    {/if}

    <div id="telegram-login-container" style="padding-top: 1rem; display: flex; justify-content: center; height: 40px;">
        <!-- Telegram button will be rendered here -->
    </div>
    
    <div style="padding-top: 2rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
         <span style="flex: 1; border-bottom: 1px solid #e5e7eb;"></span>
         <span style="font-size: 0.75rem; text-align: center; color: #6b7280; text-transform: uppercase;">or</span>
         <span style="flex: 1; border-bottom: 1px solid #e5e7eb;"></span>
    </div>

    <div style="padding-top: 1rem; text-align: center; font-size: 0.875rem;">
        <Link href="/signin-password" style="color: #0366d6; font-weight: 500; display: block; padding-bottom: 1rem; transition: color 0.2s; text-decoration: none;">Sign in with Password</Link>
    </div>
    </InfoStack>
</AuthLayout>
