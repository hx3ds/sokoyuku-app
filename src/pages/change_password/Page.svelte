<script>
  import { validateEmail, validatePassword } from '../../utils.js';
  import { changePassword, requestVerificationCode } from '../../proxy/auth.js';
  import Link from '../../components/InfoStack/Link.svelte';
  import AuthLayout from '../../components/AuthLayout.svelte';
  import InfoStack from '../../components/InfoStack/InfoStack.svelte';
  import InfoStackInput from '../../components/InfoStack/InfoStackInput.svelte';
  import Button from '../../components/Button/Button.svelte';

  let email = $state('');
  let code = $state('');
  let newPassword = $state('');
  
  let errors = $state({
      email: '',
      code: '',
      newPassword: ''
  });
  let countdown = $state(0);
  let timer;

  async function handleGetCode() {
    if (!validateEmail(email)) {
        errors.email = 'Please enter a valid email address';
        return;
    }
    errors.email = '';

    const result = await requestVerificationCode(email, 'change_password');
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
        errors.email = result.msg || 'Failed to send code';
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    errors = {
        email: '',
        code: '',
        newPassword: ''
    };
    
    if (!validatePassword(newPassword)) {
        // optional check
    }

    const data = await changePassword(email, code, newPassword);
        
    if (data.result === 0) {
        history.pushState(null, '', '/signin');
        window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
        if (data.msg) {
            if (data.msg.toLowerCase().includes('code')) errors.code = data.msg;
            else errors.email = data.msg;
        }
    }
  }
</script>

{#snippet codeActions()}
    <Button 
        type="button"
        disabled={countdown > 0}
        onclick={handleGetCode}
        style="white-space: nowrap;"
        variant="text-button"
    >
        {countdown > 0 ? `${countdown}s` : 'Get Code'}
    </Button>
{/snippet}

<AuthLayout title="Change Password">
    <InfoStack showTitle={false} style="padding: 0 !important; border: none !important; box-shadow: none !important; background: transparent !important;">
    <form onsubmit={handleChangePassword}>
      <div style="padding-top: 2rem; padding-bottom: 1rem; display: flex; flex-direction: column; gap: 0;">
        <div style="padding-bottom: 0.5rem;">
          <InfoStackInput
            id="changePasswordEmail"
            title="Email"
            type="email"
            placeholder="Enter your email"
            bind:value={email}
            required
            style={errors.email ? 'border-color: #ef4444;' : ''}
            inputClass="boxed-input"
            className="clean-item"
          />
          {#if errors.email}
            <p style="padding-top: 0.25rem; font-size: 0.75rem; color: #ef4444;">{errors.email}</p>
          {/if}
        </div>
        
        <div style="padding-bottom: 0.5rem;">
            <InfoStackInput 
                id="changePasswordVerificationCode" 
                title="Verification Code"
                type="text" 
                required 
                bind:value={code}
                placeholder="Enter 6-digit code"
                style={errors.code ? 'border-color: #ef4444;' : ''}
                actions={codeActions}
                inputClass="boxed-input"
                className="clean-item"
            />
            {#if errors.code}
                <p style="padding-top: 0.25rem; font-size: 0.75rem; color: #ef4444;">{errors.code}</p>
            {/if}
        </div>

        <div style="padding-bottom: 2rem;">
          <InfoStackInput
            id="changePasswordNew"
            title="New Password"
            type="password"
            placeholder="Enter your new password"
            bind:value={newPassword}
            required
            style={errors.newPassword ? 'border-color: #ef4444;' : ''}
            inputClass="boxed-input"
            className="clean-item"
          />
          {#if errors.newPassword}
            <p style="padding-top: 0.25rem; font-size: 0.75rem; color: #ef4444;">{errors.newPassword}</p>
          {/if}
        </div>
        
        <Button
          type="submit"
          variant="text-button"
          style="width: 100%; justify-content: center;"
          containerStyle="padding: 0 0.5rem;"
        >Reset Password</Button>
      </div>
    </form>
    <div style="padding-top: 1rem; text-align: center; display: flex; flex-direction: column; gap: 0.25rem;">
      <div style="display: block; font-size: 0.875rem;">
        <Link href="/signin" style="font-weight: 500; text-decoration: none;">Back to Sign In</Link>
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
</style>
