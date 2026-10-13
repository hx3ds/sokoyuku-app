import { request } from '../utils.js';

function createPlatformSettingsStore() {
    let settings = $state(null);
    let initialized = $state(false);
    let inflight = null;

    async function load() {
        if (inflight) return inflight;
        inflight = (async () => {
            try {
                const res = await request('/api/get_platform_settings');
                settings = res?.result === 0 ? res.data : null;
                initialized = res?.result === 0;
            } catch (e) {
                console.error('Failed to load platform settings:', e);
            } finally {
                inflight = null;
            }
        })();
        return inflight;
    }

    return {
        get settings() { return settings; },
        get initialized() { return initialized; },
        load,
    };
}

export const platformSettingsStore = createPlatformSettingsStore();
