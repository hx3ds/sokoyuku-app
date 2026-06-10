<script>
  import { validateEmail, validatePassword } from '../../utils.js';
  import { signUp, requestVerificationCode, checkUsername as checkUsernameApi } from '../../proxy/auth.js';
  import Link from '../../components/InfoStack/Link.svelte';
  import { showAlert } from '../../components/Modal/state.svelte.js';
  import AuthLayout from '../../components/AuthLayout.svelte';
  import InfoStack from '../../components/InfoStack/InfoStack.svelte';
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
  let timer;

  async function handleGetCode() {
    if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
      return;
    }
    errors.email = '';

    const result = await requestVerificationCode(email, 'sign_up');
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

  async function handleSignUp(e) {
    e.preventDefault();
    errors = {
        email: '',
        code: '',
        username: '',
        password: ''
    };

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
        disabled={countdown > 0}
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
                className="clean-item"
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
