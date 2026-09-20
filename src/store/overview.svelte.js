import { modelStore } from './models.svelte.js';
import { accountStore } from './accounts.svelte.js';
import { prototypeStore } from './prototypes.svelte.js';
import { subscriptionStore } from './subscription.svelte.js';

export async function refreshOverview() {
    await Promise.all([
        modelStore.load(),
        accountStore.load(),
        prototypeStore.load(),
        subscriptionStore.load(),
    ]);
}
