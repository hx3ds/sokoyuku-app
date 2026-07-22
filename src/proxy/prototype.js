import { request } from '../utils.js';

export function fetchPrototypes(params = {}) {
    const defaultParams = {
        query: '',
        offset: 0,
        limit: 20,
        certified_only: false,
        include_private: false,
    };
    return request('/api/search_prototypes', {
        body: { ...defaultParams, ...params }
    });
}

export async function fetchPrototype(id) {
    const prototypeData = await request('/api/get_prototype', { body: { prototype_id: id } });
    if (prototypeData.result !== 0) return null;

    return prototypeData.data || {};
}

export function createPrototype(data) {
    const body = { ...(data || {}) };
    if (Boolean(body.is_local)) {
        body.is_local = true;
        body.private = true;
    }
    return request('/api/add_prototype', { body });
}

export function deletePrototype(prototypeId) {
    return request('/api/delete_prototype', {
        body: { prototype_id: prototypeId }
    });
}

export function refreshPrototypeToken(prototypeId) {
    return request('/api/refresh_prototype_token', {
        body: { prototype_id: prototypeId }
    });
}

export async function updatePrototype(data) {
    const prototypeId = data?.prototype_id;
    if (!prototypeId) return request('/api/change_prototype', { body: data });

    const requiredKeys = [
        'name',
        'description',
        'access_point',
        'status',
        'private',
        'max_chats',
        'charge',
        'type',
        'billing_interval',
        'reply_window',
        'is_local',
        'terms_of_use',
        'privacy_policy',
    ];

    const missingRequired = requiredKeys.some((key) => data?.[key] == null);
    if (!missingRequired) return request('/api/change_prototype', { body: data });

    const current = await fetchPrototype(prototypeId);
    if (!current) return { result: 1, msg: 'Prototype not found' };

    const body = { ...current, ...data };
    const isLocal = Boolean(body.is_local);
    const normalized = {
        ...body,
        name: body.name ?? '',
        description: body.description ?? '',
        access_point: body.access_point ?? '',
        status: body.status ?? '',
        private: isLocal ? true : (body.private ?? false),
        max_chats: body.max_chats ?? 1,
        charge: body.charge ?? 0,
        type: body.type ?? 'token',
        billing_interval: (body.type ?? 'token') === 'subscription'
            ? (body.billing_interval ?? 'monthly')
            : null,
        reply_window: body.reply_window ?? 0,
        is_local: isLocal,
        terms_of_use: body.terms_of_use ?? '',
        privacy_policy: body.privacy_policy ?? '',
    };
    return request('/api/change_prototype', { body: normalized });
}

export function getPrototypeToken(prototypeId) {
    return request('/api/get_prototype_token', {
        body: { prototype_id: prototypeId }
    });
}

export async function fetchMyPrototypes() {
    const data = await request('/api/get_my_prototype_list');
    return data.result === 0 ? data.data.prototypes : [];
}

export async function fetchMyPrototypePayoutDetails() {
    const data = await request('/api/get_my_prototype_payout_details');
    return data.result === 0 ? data.data.prototypes : [];
}

export async function fetchUserPrototypes(username) {
    const data = await request('/api/get_user_prototype_list', {
        body: { username }
    });
    return data.result === 0 ? data.data.prototypes : [];
}

export function certifyPrototype(prototypeId) {
    return request('/api/certify_prototype', {
        body: { prototype_id: prototypeId }
    });
}
