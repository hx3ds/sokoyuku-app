import { request } from '../utils.js';

export function getStripeConnectStatus() {
    return request('/api/stripe/connect/status');
}

export function createStripeConnectOnboardingLink({
    returnUrl,
    refreshUrl = returnUrl,
    country = 'US'
}) {
    return request('/api/stripe/connect/onboarding_link', {
        body: {
            return_url: returnUrl,
            refresh_url: refreshUrl,
            country
        }
    });
}
