import { request } from '../utils.js';

export function createCheckoutSession(data) {
    return request('/api/create_checkout_session', { body: data });
}

export async function fetchTransactionHistory() {
    const data = await request('/api/get_transaction_history');
    return data.result === 0 ? data.data : [];
}

export async function fetchWalletDeductionHistory(limit = 100, offset = 0) {
    const data = await request('/api/get_wallet_deduction_history', {
        body: { limit, offset }
    });
    return data.result === 0 ? data.data.history : [];
}

export function fetchModelSubscription(modelId) {
    return request('/api/get_model_subscription', {
        body: { model_id: modelId }
    });
}

export function createModelSubscriptionCheckout(data) {
    return request('/api/create_model_subscription_checkout', { body: data });
}

export function cancelModelSubscription(modelId) {
    return request('/api/cancel_model_subscription', {
        body: { model_id: modelId }
    });
}

export function fetchPlatformSubscription() {
    return request('/api/get_platform_subscription');
}

export function createPlatformSubscriptionCheckout(data) {
    return request('/api/create_platform_subscription_checkout', { body: data });
}

export function cancelPlatformSubscription() {
    return request('/api/cancel_platform_subscription');
}

export async function fetchAllSubscriptions() {
    const data = await request('/api/get_all_subscriptions');
    return data.result === 0 ? data.data : [];
}

export function createModelSubscriptionWallet(data) {
    return request('/api/create_model_subscription_wallet', { body: data });
}

export async function fetchSubscriptionPlans() {
    const data = await request('/api/get_subscription_plans');
    return data.result === 0 ? data.data : [];
}
