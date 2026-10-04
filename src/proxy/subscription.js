import { request } from '../utils.js';

function normalizeCheckoutBody(data = {}) {
    return {
        ...data,
        success_url: data.success_url ?? '',
        cancel_url: data.cancel_url ?? '',
    };
}

export async function fetchTransactionHistory() {
    const data = await request('/api/get_transaction_history');
    return data.result === 0 ? data.data : [];
}

export function createModelPaymentCheckout(data) {
    const body = normalizeCheckoutBody(data);
    const payload = {
        model_id: body.model_id ?? '',
        success_url: body.success_url,
        cancel_url: body.cancel_url,
    };
    if (body.subscription_tier) {
        payload.subscription_tier = body.subscription_tier;
    }
    if (body.periods) {
        payload.periods = body.periods;
    }
    return request('/api/create_model_payment_checkout', {
        body: payload,
    });
}

export function fetchPlatformSubscription() {
    return request('/api/get_platform_subscription');
}

export function createPlatformSubscriptionCheckout(data) {
    const body = normalizeCheckoutBody(data);
    return request('/api/create_platform_subscription_checkout', {
        body: {
            plan_id: body.plan_id ?? '',
            success_url: body.success_url,
            cancel_url: body.cancel_url,
        },
    });
}

export function cancelPlatformSubscription() {
    return request('/api/cancel_platform_subscription');
}

export function createPlatformBillingPortal({ return_url, flow } = {}) {
    return request('/api/create_platform_billing_portal', {
        body: {
            return_url: return_url ?? '',
            flow: flow ?? 'manage',
        },
    });
}

export async function fetchAllSubscriptions() {
    const data = await request('/api/get_all_subscriptions');
    return data.result === 0 ? data.data : [];
}

export async function fetchSubscriptionPlans() {
    const data = await request('/api/get_subscription_plans');
    return data.result === 0 ? data.data : [];
}
