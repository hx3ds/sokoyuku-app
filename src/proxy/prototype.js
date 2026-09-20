import { request } from '../utils.js';

function normalizeBillingInterval(type, billingInterval) {
    if (type === 'subscription') {
        return billingInterval || 'monthly';
    }
    return '';
}

function isHttpHttpsUrl(value) {
    const text = String(value ?? '').trim();
    if (!text || /\s/.test(text)) return false;
    if (!/^https?:\/\//i.test(text)) return false;
    if (typeof URL.canParse === 'function' && !URL.canParse(text)) return false;
    const parsed = new URL(text);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return Boolean((parsed.hostname || '').trim());
}

function normalizeAccessPoint(value, isLocal) {
    const text = String(value ?? '').trim().replace(/\/+$/, '');
    if (!text) {
        if (isLocal) return { error: 'access_point is required for local prototypes' };
        return { value: '' };
    }
    if (!isHttpHttpsUrl(text)) {
        return { error: 'access_point must be a valid http or https URL' };
    }
    return { value: text };
}

function normalizePrototypeFields(data = {}) {
    const type = data.type ?? 'token';
    const isLocal = Boolean(data.is_local);
    const charge = isLocal ? 0 : (type === 'subscription' ? (data.charge ?? 0) : 0);
    const maxTierCharge = isLocal ? 0 : (type === 'subscription' ? (data.max_tier_charge ?? 0) : 0);
    let hasFreeTier = Boolean(data.has_free_tier);
    if (type !== 'subscription') {
        hasFreeTier = false;
    } else if (isLocal) {
        hasFreeTier = true;
    } else if (Number(charge) === 0 && Number(maxTierCharge) === 0 && data.has_free_tier == null) {
        hasFreeTier = true;
    }
    return {
        name: data.name ?? '',
        description: data.description ?? '',
        access_point: data.access_point ?? '',
        path: data.path ?? '',
        status: data.status ?? '',
        private: isLocal ? true : Boolean(data.private),
        max_chats: data.max_chats ?? 1,
        charge,
        has_free_tier: hasFreeTier,
        max_tier_charge: maxTierCharge,
        max_charge_per_message: isLocal ? 0 : (data.max_charge_per_message ?? 0),
        type,
        billing_interval: normalizeBillingInterval(type, data.billing_interval),
        reply_window: data.reply_window ?? 0,
        is_local: isLocal,
        qr_platforms: Array.isArray(data.qr_platforms) ? data.qr_platforms : [],
        terms_of_use: data.terms_of_use ?? '',
        privacy_policy: data.privacy_policy ?? '',
        call_support: type === 'subscription' ? Boolean(data.call_support) : false,
    };
}

export function fetchPrototypes(params = {}) {
    const body = {
        query: '',
        offset: 0,
        limit: 20,
        username: '',
        certified_only: false,
        types: [],
        include_private: false,
        ...params,
    };
    if (body.username == null) body.username = '';
    if (!Array.isArray(body.types)) body.types = [];
    if (body.certified_only == null) body.certified_only = false;
    if (body.include_private == null) body.include_private = false;
    if (body.query == null) body.query = '';
    if (body.offset == null) body.offset = 0;
    if (body.limit == null) body.limit = 20;
    return request('/api/search_prototypes', { body });
}

export async function fetchPrototype(id) {
    const prototypeData = await request('/api/get_prototype', { body: { prototype_id: id } });
    if (prototypeData.result !== 0) return null;

    return prototypeData.data || {};
}

export function createPrototype(data) {
    const body = normalizePrototypeFields(data);
    const access = normalizeAccessPoint(body.access_point, body.is_local);
    if (access.error) return Promise.resolve({ result: 1, msg: access.error });
    body.access_point = access.value;
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
    if (!prototypeId) {
        const body = {
            prototype_id: data?.prototype_id ?? 0,
            ...normalizePrototypeFields(data),
        };
        const access = normalizeAccessPoint(body.access_point, body.is_local);
        if (access.error) return { result: 1, msg: access.error };
        body.access_point = access.value;
        return request('/api/change_prototype', { body });
    }

    const requiredKeys = [
        'name',
        'description',
        'access_point',
        'path',
        'status',
        'private',
        'max_chats',
        'charge',
        'max_charge_per_message',
        'type',
        'billing_interval',
        'reply_window',
        'qr_platforms',
        'terms_of_use',
        'privacy_policy',
        'call_support',
    ];

    let source = data;
    const missingRequired = requiredKeys.some((key) => data?.[key] == null);
    if (missingRequired) {
        const current = await fetchPrototype(prototypeId);
        if (!current) return { result: 1, msg: 'Prototype not found' };
        source = { ...current, ...data };
    }

    const normalized = {
        prototype_id: prototypeId,
        ...normalizePrototypeFields(source),
    };
    const access = normalizeAccessPoint(normalized.access_point, normalized.is_local);
    if (access.error) return { result: 1, msg: access.error };
    normalized.access_point = access.value;
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
        body: { username: username ?? '' }
    });
    return data.result === 0 ? data.data.prototypes : [];
}

