import { request, encryptWithPublicKeyToken, isEncryptedToken } from '../utils.js';
import { getMyConductorPublicKey } from './user.js';

function normalizeId(id) {
    return typeof id === 'string' ? id.replace(/-/g, '') : id;
}

function normalizeAccountGroup(value) {
    return String(value ?? 'free').trim().toLowerCase() === 'pro' ? 'pro' : 'free';
}

function requiresProAccountGroup(type, isLocal) {
    if (isLocal) return false;
    const platform = String(type ?? '').trim().toLowerCase();
    return platform !== '' && platform !== 'telegram' && platform !== 'whatsapp_cloud' && platform !== 'sokoyuku';
}

function resolveAccountGroup(type, isLocal, value) {
    if (requiresProAccountGroup(type, isLocal)) return 'pro';
    return normalizeAccountGroup(value);
}

export function getUserAccountList() {
    return request('/api/get_user_account_list');
}

export function requestOtpForChat(accountId, modelId) {
    return request('/api/request_otp_for_chat', {
        body: {
            account_id: normalizeId(accountId),
            model_id: normalizeId(modelId),
        }
    });
}

export function addAccount(accountData) {
    const type = accountData.type ?? 'telegram';
    const is_local = Boolean(accountData.is_local ?? false);
    const body = {
        account_username: accountData.account_username ?? '',
        account_token: accountData.account_token ?? '',
        name: accountData.name ?? '',
        description: accountData.description ?? '',
        type,
        server: accountData.server ?? '',
        is_local,
        account_group: resolveAccountGroup(type, is_local, accountData.account_group ?? accountData.group),
    };
    return (async () => {
        if (is_local) {
            const key = await getMyConductorPublicKey();
            if (!key) return { result: 1, msg: 'conductor_public_key is required for local accounts' };
            const token = String(body.account_token || '').trim();
            if (!token) return { result: 1, msg: 'Account token is required' };
            body.account_token = isEncryptedToken(token) ? token : await encryptWithPublicKeyToken(key, token);
            const server = String(body.server || '').trim();
            body.server = server
                ? (isEncryptedToken(server) ? server : await encryptWithPublicKeyToken(key, server))
                : '';
        } else {
            body.server = String(body.server || '');
        }
        return request('/api/add_account', { body });
    })();
}

export function addQrAccount(accountData) {
    const body = {
        name: accountData.name ?? '',
        description: accountData.description ?? '',
        type: accountData.type ?? '',
        account_group: normalizeAccountGroup(accountData.account_group ?? accountData.group),
        prototype_id: accountData.prototype_id ?? 0,
        account_id: accountData.account_id ? normalizeId(accountData.account_id) : '',
        qr_timeout_ms: Number(accountData.qr_timeout_ms ?? 0) || 0,
    };
    return request('/api/add_qr_account', { body });
}

export function changeAccount(accountData) {
    const is_local = Boolean(accountData.is_local ?? false);
    const type = accountData.type ?? 'telegram';
    const body = {
        account_id: normalizeId(accountData.account_id),
        account_token: accountData.account_token ?? '',
        type,
        server: accountData.server ?? '',
        name: accountData.name ?? '',
        description: accountData.description ?? '',
        is_local,
        account_group: resolveAccountGroup(type, is_local, accountData.account_group ?? accountData.group),
    };
    return (async () => {
        if (is_local) {
            const key = await getMyConductorPublicKey();
            if (!key) return { result: 1, msg: 'conductor_public_key is required for local accounts' };
            const token = String(body.account_token || '').trim();
            body.account_token = token
                ? (isEncryptedToken(token) ? token : await encryptWithPublicKeyToken(key, token))
                : '';
            const server = String(body.server || '').trim();
            body.server = server
                ? (isEncryptedToken(server) ? server : await encryptWithPublicKeyToken(key, server))
                : '';
        } else {
            body.server = String(body.server || '');
            body.account_token = String(body.account_token || '');
        }
        return request('/api/change_account', { body });
    })();
}

export function removeAccount(accountId) {
    return request('/api/remove_account', {
        body: { account_id: normalizeId(accountId) }
    });
}
