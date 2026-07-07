<script>
  import { onMount } from 'svelte';
  import { signIn, signInWithGoogle } from '../../proxy/auth.js';
  import { validateEmail } from '../../utils.js';
  import Link from '../../components/InfoStack/Link.svelte';
  import AuthLayout from '../../components/AuthLayout.svelte';
  import InfoStack from '../../components/InfoStack/InfoStack.svelte';
  import InfoStackInput from '../../components/InfoStack/InfoStackInput.svelte';
  import InfoStackCheckbox from '../../components/InfoStack/InfoStackCheckbox.svelte';
  import Button from '../../components/Button/Button.svelte';
  import { renderGoogleSignInButton } from '../../googleIdentity.js';

  let identifier = $state('');
  let password = $state('');
  let identifierError = $state('');

  function navigateToModels() {
    history.pushState(null, '', '/models');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  /** @param {string} credential */
  async function handleGoogleCredential(credential) {
    const data = await signInWithGoogle(credential);

    if (data.result === 0) {
      navigateToModels();
    } else {
      identifierError = data.msg;
    }
  }

  /** @param {SubmitEvent} e */
  async function handleSignIn(e) {
    e.preventDefault();
    identifierError = '';

    const isEmail = validateEmail(identifier);
    
    if (!isEmail && !/^[a-zA-Z0-9._]{1,32}$/.test(identifier)) {
        identifierError = 'Invalid email or username';
        return;
    }

    const data = await signIn(identifier, password);
    
    if (data.result === 0) {
        navigateToModels();
    } else {
        identifierError = data.msg;
    }
  }

  onMount(() => {
    const googleContainer = document.getElementById('google-login-container');
    renderGoogleSignInButton(googleContainer, handleGoogleCredential).catch((error) => {
      console.error('Google sign-in initialization failed:', error);
      identifierError = error?.message || 'Google sign-in is unavailable';
    });
  });
</script>

<AuthLayout title="Sign In with Password">
    <InfoStack showTitle={false} style="padding: 0 !important; border: none !important; box-shadow: none !important; background: transparent !important;">
    <form onsubmit={handleSignIn}>
      <div style="padding-top: 2rem; padding-bottom: 1rem; display: flex; flex-direction: column; gap: 0;">
        <div style="padding-bottom: 0.5rem;">
          <InfoStackInput
            id="signinIdentifier"
            title="Email or Username"
            type="text"
            placeholder="Enter your email or username"
            bind:value={identifier}
            required
            style={identifierError ? 'border-color: #ef4444 !important;' : ''}
            inputClass="boxed-input"
            className="clean-item"
          />
          {#if identifierError}
            <p style="padding-top: 0.25rem; font-size: 0.75rem; color: #ef4444;">{identifierError}</p>
          {/if}
        </div>
        
        <div style="padding-bottom: 0.5rem;">
          <InfoStackInput
            id="signinPassword"
            title="Password"
            type="password"
            placeholder="Enter your password"
            bind:value={password}
            required
            inputClass="boxed-input"
            className="clean-item"
          />
        </div>
        
        <div style="padding-bottom: 0.5rem;">
            <InfoStackCheckbox id="signinTerms" required className="clean-item checkbox-reverse">
                I confirm that I have read and agree to Sokoyuku's <a href="/terms.html" style="color: #0366d6; transition: color 0.2s; font-weight: 500; text-decoration: none;">Terms of Use</a> and
                <a href="/privacy.html" style="color: #0366d6; transition: color 0.2s; font-weight: 500; text-decoration: none;">Privacy Policy</a>.
            </InfoStackCheckbox>
        </div>
        
        <Button
          type="submit"
          variant="text-button"
          style="width: 100%; justify-content: center;"
          containerStyle="padding: 0 0.5rem;"
        >Enter</Button>
      </div>
    </form>

    <div id="google-login-container" style="padding-top: 0.5rem; display: flex; justify-content: center; min-height: 44px;"></div>
    
    <div style="padding-top: 0.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
         <span style="flex: 1; border-bottom: 1px solid #e5e7eb;"></span>
         <span style="font-size: 0.75rem; text-align: center; color: #6b7280; text-transform: uppercase;">or</span>
         <span style="flex: 1; border-bottom: 1px solid #e5e7eb;"></span>
    </div>

    <div style="padding-top: 1rem; text-align: center;">
        <Link href="/signin" style="color: #0366d6; transition: color 0.2s; font-weight: 500; display: block; padding-bottom: 0.5rem; text-decoration: none;">Sign in with Telegram</Link>
    </div>

    <div style="padding-top: 1rem; text-align: center; display: flex; flex-direction: column; gap: 0.25rem;">
      <div style="display: block; font-size: 0.875rem;">
        <Link href="/signup" style="color: #0366d6; transition: color 0.2s; font-weight: 500; text-decoration: none;">Create Account</Link>
      </div>
      <div style="display: block; font-size: 0.875rem;">
        <Link href="/change-password" style="color: #0366d6; transition: color 0.2s; font-weight: 500; text-decoration: none;">Forgot Password?</Link>
      </div>
    </div>
    </InfoStack>
</AuthLayout>

<style>
    :global(.boxed-input) {
        border: 1px solid var(--color-border) !important;
        border-radius: 6px !important;
        padding: 0.5rem 0.75rem !important;
        background-color: var(--color-bg-surface) !important;
    }
    :global(.clean-item) {
        padding: 0 !important;
    }
    :global(.clean-item .input-wrapper) {
        padding-top: 0.25rem !important;
    }
    :global(.checkbox-reverse) {
        flex-direction: row-reverse !important;
        justify-content: flex-end !important;
        gap: 0 !important;
    }
    :global(.checkbox-reverse .actions) {
        padding: 0.5rem 0 0 0.5rem !important;
        align-items: flex-start !important;
    }
</style>
