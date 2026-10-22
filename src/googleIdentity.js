import { GOOGLE_CLIENT_ID } from './config.js';

let googleScriptPromise = null;

function getGoogleIdentity() {
    return /** @type {any} */ (window).google?.accounts?.id || null;
}

function loadGoogleIdentityScript() {
    if (getGoogleIdentity()) {
        return Promise.resolve(getGoogleIdentity());
    }

    if (!googleScriptPromise) {
        googleScriptPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-google-identity="true"]');
            if (existing) {
                existing.addEventListener('load', () => resolve(getGoogleIdentity()), { once: true });
                existing.addEventListener('error', () => reject(new Error('Failed to load Google sign-in')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.dataset.googleIdentity = 'true';
            script.onload = () => resolve(getGoogleIdentity());
            script.onerror = () => reject(new Error('Failed to load Google sign-in'));
            document.head.appendChild(script);
        });
    }

    return googleScriptPromise.then((googleIdentity) => {
        if (!googleIdentity) {
            throw new Error('Google sign-in is unavailable');
        }
        return googleIdentity;
    });
}

/**
 * @param {HTMLElement | null} container
 * @param {(credential: string) => void | Promise<void>} onCredential
 */
export async function renderGoogleSignInButton(container, onCredential) {
    if (!container || !GOOGLE_CLIENT_ID) {
        return false;
    }

    const googleIdentity = await loadGoogleIdentityScript();
    container.innerHTML = '';
    googleIdentity.initialize({
        client_id: GOOGLE_CLIENT_ID,
        /** @param {{ credential?: string }} response */
        callback: (response) => onCredential?.(response?.credential || ''),
        ux_mode: 'popup',
        auto_select: false,
        context: 'signin',
    });
    googleIdentity.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        width: Math.max(container.clientWidth || 0, 240),
    });
    return true;
}
