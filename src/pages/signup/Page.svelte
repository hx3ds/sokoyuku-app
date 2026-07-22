<script lang="ts">
  import { onMount } from 'svelte';
  import { validateEmail, validatePassword, showFieldHint } from '../../utils.js';
  import { signUp, requestVerificationCode, checkUsername as checkUsernameApi } from '../../proxy/auth.js';
  import { TURNSTILE_SITE_KEY } from '../../config.js';
  import { renderTurnstile, resetTurnstile } from '../../turnstile.js';
  import Link from '../../components/InfoStack/Link.svelte';
  import { showAlert } from '../../components/Modal/state.svelte.js';
  import AuthLayout from '../../components/AuthLayout.svelte';
  import InfoStackInput from '../../components/InfoStack/InfoStackInput.svelte';
  import InfoStackCheckbox from '../../components/InfoStack/InfoStackCheckbox.svelte';
  import Button from '../../components/Button/Button.svelte';

  let email = $state('');
  let code = $state('');
  let fullName = $state('');
  let username = $state('');
  let password = $state('');
  
  let errors = $state({
    email: '',
    code: '',
    username: '',
    password: ''
  });
  let countdown = $state(0);
  let timer: ReturnType<typeof setInterval> | undefined;
  let turnstileContainer: HTMLDivElement | undefined;
  let turnstileWidgetId: string | undefined;
  let turnstileToken = $state('');
  let turnstileError = $state('');
  let turnstileLoaded = $state(false);

  onMount(() => {
    let disposed = false;

    async function initTurnstile() {
      try {
        turnstileWidgetId = await renderTurnstile(turnstileContainer, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => {
            turnstileToken = token;
            turnstileError = '';
          },
          'expired-callback': () => {
            turnstileToken = '';
            turnstileError = 'Please complete the verification challenge again';
          },
          'error-callback': () => {
            turnstileToken = '';
            turnstileError = 'Verification challenge failed to load';
          }
        });
        if (!disposed) {
          turnstileLoaded = true;
        }
      } catch (error) {
        if (!disposed) {
          turnstileError = 'Verification challenge failed to load';
        }
      }
    }

    void initTurnstile();

    return () => {
      disposed = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  });

  async function handleGetCode() {
    if (!showFieldHint('signupEmail')) {
      return;
    }
    if (!validateEmail(email)) {
      showFieldHint('signupEmail', 'Please enter a valid email address');
      return;
    }
    errors.email = '';
    errors.code = '';

    if (!turnstileToken) {
      showFieldHint('signupTurnstileGate');
      return;
    }

    const result = await requestVerificationCode(email, 'sign_up', turnstileToken);
    turnstileToken = '';
    resetTurnstile(turnstileWidgetId);
    if (result === true || result.result === 0) {
      countdown = 60;
      timer = setInterval(() => {
        countdown--;
        if (countdown < 0) {
          clearInterval(timer);
          countdown = 0;
        }
      }, 1000);
    } else {
      errors.code = result.msg || 'Failed to send code';
    }
  }

  async function checkUsername() {
    if (!username) return;
    const data = await checkUsernameApi(username);
    if (data.result !== 0) {
        errors.username = 'This username is not available';
    } else {
        errors.username = '';
    }
  }

  async function handleSignUp(e: Event) {
    e.preventDefault();
    errors = {
        email: '',
        code: '',
        username: '',
        password: ''
    };
    turnstileError = '';

    const form = e.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) {
      return;
    }

    if (!validatePassword(password)) {
       // optional check
    }

    const data = await signUp({
        email,
        code,
        full_name: fullName,
        username,
        password
    });
        
    if (data.result === 0) {
        history.pushState(null, '', '/signin');
        window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
        turnstileToken = '';
        resetTurnstile(turnstileWidgetId);
        if (data.msg) {
            const err = data.msg.toLowerCase();
            if (err.includes('code')) errors.code = data.msg;
            else if (err.includes('username')) errors.username = data.msg;
            else if (err.includes('email')) errors.email = data.msg;
            else await showAlert(data.msg);
        }
    }
  }
</script>

{#snippet codeActions()}
    <Button 
        type="button"
        disabled={countdown > 0 || !turnstileLoaded}
        onclick={handleGetCode}
        variant="text-button"
    >
        {countdown > 0 ? `${countdown}s` : 'Get Code'}
    </Button>
{/snippet}

<AuthLayout title="Sign Up">
    <form onsubmit={handleSignUp}>
      <div style="padding-top: 1rem; padding-bottom: 0.25rem; display: flex; flex-direction: column; gap: 0;">
        <div style="padding-bottom: 0.5rem;">
          <InfoStackInput
            id="signupEmail"
            title="Email"
            type="email"
            placeholder="Enter your email"
            bind:value={email}
            required
            style={errors.email ? 'border-color: #ef4444 !important;' : ''}
            inputClass="boxed-input"
            className="clean-item"
          />
          {#if errors.email}
            <p style="padding-top: 0.25rem; font-size: 0.75rem; color: #ef4444;">{errors.email}</p>
          {/if}
        </div>

        <div style="padding-bottom: 0.5rem;">
            <InfoStackInput 
                id="signupVerificationCode" 
                title="Verification Code"
                type="text" 
                required 
                bind:value={code}
                placeholder="Enter 6-digit code"
                style={errors.code ? 'border-color: #ef4444 !important;' : ''}
                actions={codeActions}
                inputClass="boxed-input"
                className="clean-item code-with-action"
            />
            {#if errors.code}
                <p style="padding-top: 0.25rem; font-size: 0.75rem; color: #ef4444;">{errors.code}</p>
            {/if}
        </div>

        <div style="padding-bottom: 0.5rem;">
          <InfoStackInput
            id="signupFullName"
            title="Full Name"
            type="text"
            placeholder="Enter your full name"
            bind:value={fullName}
            required
            inputClass="boxed-input"
            className="clean-item"
          />
        </div>

        <div style="padding-bottom: 0.5rem;">
          <InfoStackInput
            id="signupUsername"
            title="Username"
            type="text"
            placeholder="Enter your username"
            bind:value={username}
            onblur={checkUsername}
            required
            style={errors.username ? 'border-color: #ef4444 !important;' : ''}
            inputClass="boxed-input"
            className="clean-item"
          />
          {#if errors.username}
            <p style="padding-top: 0.25rem; font-size: 0.75rem; color: #ef4444;">{errors.username}</p>
          {/if}
        </div>

        <div style="padding-bottom: 0.5rem;">
          <InfoStackInput
            id="signupPassword"
            title="Password"
            type="password"
            placeholder="Enter your password"
            bind:value={password}
            required
            style={errors.password ? 'border-color: #ef4444 !important;' : ''}
            inputClass="boxed-input"
            className="clean-item"
          />
          {#if errors.password}
            <p style="padding-top: 0.25rem; font-size: 0.75rem; color: #ef4444;">{errors.password}</p>
          {/if}
        </div>

        <div style="padding-bottom: 0.5rem;">
            <InfoStackCheckbox id="signupTerms" required className="clean-item checkbox-reverse">
                I confirm that I have read and agree to Sokoyuku's <a href="/terms" style="color: #0366d6; transition: color 0.2s; font-weight: 500; text-decoration: none;">Terms of Use</a> and
                <a href="/privacy" style="color: #0366d6; transition: color 0.2s; font-weight: 500; text-decoration: none;">Privacy Policy</a>.
            </InfoStackCheckbox>
        </div>

        <div class="turnstile-wrap">
          <div class="turnstile-relative">
            <input
              id="signupTurnstileGate"
              class="validity-anchor"
              value={turnstileToken}
              required
              tabindex="-1"
              aria-label="Verification challenge"
            />
            <div bind:this={turnstileContainer}></div>
          </div>
          {#if !turnstileLoaded && !turnstileError}
            <p style="padding-top: 0.25rem; font-size: 0.75rem; color: #6b7280;">Loading verification challenge...</p>
          {/if}
          {#if turnstileError}
            <p style="padding-top: 0.25rem; font-size: 0.75rem; color: #ef4444;">{turnstileError}</p>
          {/if}
        </div>
        
        <Button
          type="submit"
          variant="text-button"
          style="width: 100%; justify-content: center;"
          containerStyle="padding: 0 0.5rem;"
        >Sign Up</Button>
      </div>
    </form>
    <div style="padding-top: 1rem; text-align: center; display: flex; flex-direction: column; gap: 0.25rem;">
      <div style="display: block; font-size: 0.875rem;">
        <Link href="/signin" style="color: #0366d6; transition: color 0.2s; font-weight: 500; text-decoration: none;">Already have an account? Sign In</Link>
      </div>
    </div>
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
    :global(.code-with-action) {
        align-items: flex-end !important;
        gap: 0.5rem !important;
    }
    :global(.code-with-action .content-block) {
        padding-bottom: 0 !important;
        padding-right: 0 !important;
    }
    :global(.code-with-action .actions) {
        padding: 0 !important;
        height: auto !important;
        align-self: flex-end;
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
    .turnstile-wrap {
        padding-bottom: 0.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .turnstile-relative {
        position: relative;
    }
    .validity-anchor {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 1px;
        height: 1px;
        margin: 0;
        padding: 0;
        border: none;
        opacity: 0;
        pointer-events: none;
    }
</style>
