import { request } from '../utils.js';

export function getStripeConnectStatus() {
    return request('/api/stripe/connect/status');
}

export function createStripeConnectOnboardingLink({
    returnUrl,
    refreshUrl = returnUrl,
    country,
    entityType,
    currency,
    forceRecreate = false
}) {
    const body = {
        return_url: returnUrl,
        refresh_url: refreshUrl,
        force_recreate: Boolean(forceRecreate)
    };
    const code = String(country || '').trim().toUpperCase();
    if (code) {
        if (code.length !== 2) {
            return Promise.resolve({ result: 1, msg: 'country must be a 2-letter ISO code' });
        }
        body.country = code;
    }
    const entity = String(entityType || '').trim().toLowerCase();
    if (entity) {
        if (entity !== 'individual' && entity !== 'company') {
            return Promise.resolve({ result: 1, msg: 'entity_type must be individual or company' });
        }
        body.entity_type = entity;
    }
    const currencyCode = String(currency || '').trim().toLowerCase();
    if (currencyCode) {
        body.currency = currencyCode;
    }
    return request('/api/stripe/connect/onboarding_link', { body });
}
