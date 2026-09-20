import { fetchMyPrototypes } from '../proxy/prototype.js';

function sortPrototypes(list) {
    return [...(Array.isArray(list) ? list : [])].sort((a, b) =>
        String(a?.name || '').localeCompare(String(b?.name || ''))
    );
}

function createPrototypeStore() {
    let prototypes = $state([]);
    let loading = $state(false);
    let initialized = $state(false);
    let inflight = null;

    async function load() {
        if (inflight) return inflight;
        loading = true;
        inflight = (async () => {
            try {
                const list = await fetchMyPrototypes();
                prototypes = sortPrototypes(list);
                initialized = true;
            } catch (e) {
                console.error('Failed to load prototypes:', e);
            } finally {
                loading = false;
                inflight = null;
            }
        })();
        return inflight;
    }

    function add(prototype) {
        if (!prototypes.find(p => p.prototype_id === prototype.prototype_id)) {
            prototypes = sortPrototypes([...prototypes, prototype]);
        }
    }

    function remove(prototypeId) {
        prototypes = prototypes.filter((p) => p.prototype_id !== prototypeId);
    }
    
    function update(updatedPrototype) {
        const idx = prototypes.findIndex(p => p.prototype_id === updatedPrototype.prototype_id);
        if (idx !== -1) {
            prototypes = sortPrototypes(
                prototypes.map((p, i) => (i === idx ? { ...p, ...updatedPrototype } : p))
            );
        }
    }

    return {
        get prototypes() { return prototypes },
        get loading() { return loading },
        get initialized() { return initialized },
        load,
        add,
        remove,
        update
    };
}

export const prototypeStore = createPrototypeStore();
