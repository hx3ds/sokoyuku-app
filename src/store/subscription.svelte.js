import { fetchPlatformSubscription } from '../proxy/subscription.js';

function createSubscriptionStore() {
    let subscription = $state(null);
    let loading = $state(false);
    let initialized = $state(false);
    let inflight = null;

    async function load() {
        if (inflight) return inflight;
        loading = true;
        inflight = (async () => {
            try {
                const res = await fetchPlatformSubscription();
                subscription = res?.result === 0 ? res.data : null;
                initialized = true;
            } catch (e) {
                console.error('Failed to load platform subscription:', e);
            } finally {
                loading = false;
                inflight = null;
            }
        })();
        return inflight;
    }

    return {
        get subscription() { return subscription; },
        get loading() { return loading; },
        get initialized() { return initialized; },
        load,
    };
}

export const subscriptionStore = createSubscriptionStore();
