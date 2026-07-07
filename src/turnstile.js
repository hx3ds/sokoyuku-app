let turnstileScriptPromise;

function getTurnstileGlobal() {
    return typeof window !== 'undefined' ? window['turnstile'] : undefined;
}

export function loadTurnstile() {
    const existing = getTurnstileGlobal();
    if (existing) {
        return Promise.resolve(existing);
    }

    if (turnstileScriptPromise) {
        return turnstileScriptPromise;
    }

    turnstileScriptPromise = new Promise((resolve, reject) => {
        if (typeof document === 'undefined') {
            reject(new Error('Turnstile requires a browser environment'));
            return;
        }

        const existingScript = document.querySelector('script[data-turnstile-script="true"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(getTurnstileGlobal()), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('Failed to load Turnstile')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.turnstileScript = 'true';
        script.onload = () => resolve(getTurnstileGlobal());
        script.onerror = () => reject(new Error('Failed to load Turnstile'));
        document.head.appendChild(script);
    });

    return turnstileScriptPromise;
}

/**
 * @param {HTMLDivElement | undefined} container
 * @param {Record<string, unknown>} options
 */
export async function renderTurnstile(container, options) {
    if (!container) {
        throw new Error('Turnstile container is required');
    }

    const turnstile = await loadTurnstile();
    if (!turnstile) {
        throw new Error('Turnstile did not initialize');
    }

    return turnstile.render(container, options);
}

/**
 * @param {string | undefined} widgetId
 */
export function resetTurnstile(widgetId) {
    const turnstile = getTurnstileGlobal();
    if (!turnstile || widgetId == null) {
        return;
    }
    turnstile.reset(widgetId);
}
