import { getUserModelList } from '../proxy/model.js';

function createModelStore() {
    let models = $state([]);
    let loading = $state(false);
    let initialized = $state(false);
    let inflight = null;

    function normalizeModels(list) {
        const input = Array.isArray(list) ? list : [];
        const unique = [];
        const seen = new Set();
        let droppedDuplicates = 0;
        let droppedMissingIds = 0;

        for (const model of input) {
            const id = model?.model_id;
            if (!id) {
                droppedMissingIds++;
                continue;
            }
            if (seen.has(id)) {
                droppedDuplicates++;
                continue;
            }
            seen.add(id);
            unique.push(model);
        }

        if (droppedDuplicates > 0 || droppedMissingIds > 0) {
            console.warn(
                `Normalized models list: dropped ${droppedDuplicates} duplicates and ${droppedMissingIds} missing-id entries`
            );
        }

        return unique;
    }

    function sortModels(list) {
        return [...normalizeModels(list)].sort((a, b) =>
            String(a?.name || '').localeCompare(String(b?.name || ''))
        );
    }

    async function load() {
        if (inflight) return inflight;
        loading = true;
        inflight = (async () => {
            try {
                const res = await getUserModelList();
                if (res.result === 0) {
                    models = sortModels(res.data?.models);
                    initialized = true;
                }
            } catch (e) {
                console.error('Failed to load models:', e);
            } finally {
                loading = false;
                inflight = null;
            }
        })();
        return inflight;
    }

    function add(model) {
        const id = model?.model_id;
        if (!id) return;
        if (!models.find(m => m.model_id === id)) {
            models = sortModels([...models, model]);
        }
    }

    function remove(modelId) {
        if (!modelId) return;
        models = models.filter((m) => m.model_id !== modelId);
    }
    
    function update(updatedModel) {
        const id = updatedModel?.model_id;
        if (!id) return;
        const idx = models.findIndex(m => m.model_id === id);
        if (idx !== -1) {
            models = sortModels(models.map((m, i) => (i === idx ? { ...m, ...updatedModel } : m)));
        }
    }

    return {
        get models() { return models },
        get loading() { return loading },
        get initialized() { return initialized },
        load,
        add,
        remove,
        update
    };
}

export const modelStore = createModelStore();
