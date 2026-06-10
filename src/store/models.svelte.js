import { getUserModelList } from '../proxy/model.js';

function createModelStore() {
    let models = $state([]);
    let loading = $state(false);
    let initialized = $state(false);

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

    async function load() {
        if (loading) return;
        loading = true;
        try {
            const res = await getUserModelList();
            if (res.result === 0) {
                models = normalizeModels(res.data?.models);
                initialized = true;
            }
        } catch (e) {
            console.error('Failed to load models:', e);
        } finally {
            loading = false;
        }
    }

    function add(model) {
        const id = model?.model_id;
        if (!id) return;
        if (!models.find(m => m.model_id === id)) {
            models.push(model);
        }
    }

    function remove(modelId) {
        if (!modelId) return;
        const idx = models.findIndex(m => m.model_id === modelId);
        if (idx !== -1) {
            models.splice(idx, 1);
        }
    }
    
    function update(updatedModel) {
        const id = updatedModel?.model_id;
        if (!id) return;
        const idx = models.findIndex(m => m.model_id === id);
        if (idx !== -1) {
            models[idx] = { ...models[idx], ...updatedModel };
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
