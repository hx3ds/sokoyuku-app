import { request } from '../utils.js';

export async function addToMyModels(prototypeId, name = null) {
    const body = { prototype_id: parseInt(prototypeId) };
    if (name) {
        body.name = name;
    }
    const maxAttempts = 10;
    let last = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        last = await request('/api/add_prototype_to_user_model_list', { body });
        if (last?.result === 0) return last;

        const msg = String(last?.msg || '').toLowerCase();
        const nonRetryable =
            msg.includes('already exists') ||
            msg.includes('duplicate') ||
            msg.includes('exist') ||
            msg.includes('not found') ||
            msg.includes('unauthorized') ||
            msg.includes('permission') ||
            msg.includes('required') ||
            msg.includes('invalid');

        const retryable =
            !nonRetryable ||
            msg.includes('no eligible conductor') ||
            msg.includes('not available') ||
            msg.includes('timeout') ||
            last?.result === -1;

        if (!retryable || attempt === maxAttempts) return last;

        const delayMs = Math.min(2000, 250 * attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return last;
}

export function getUserModelList() {
    return request('/api/get_user_model_list');
}

export function deleteModel(modelId) {
    return request('/api/delete_model', {
        body: { model_id: modelId }
    });
}

export async function fetchModel(modelId) {
    const data = await request('/api/get_model', {
        body: { model_id: modelId }
    });
    return data.result === 0 ? data.data : null;
}

export function removeModelFromUserModelList(modelId) {
    return request('/api/remove_model_from_user_model_list', {
        body: { model_id: modelId }
    });
}

export function updateModel(data) {
    return request('/api/change_model', { body: data });
}
