import { request, encryptWithPublicKeyToken, isEncryptedToken } from '../utils.js';
import { getMyConductorPublicKey } from './user.js';

function normalizeId(id) {
    return typeof id === 'string' ? id.replace(/-/g, '') : id;
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
        account_username: accountData.account_username,
        account_token: accountData.account_token,
        name: accountData.name,
        description: accountData.description,
        type,
        is_local,
    };
    if (accountData.server) {
        body.server = accountData.server;
    }
    return (async () => {
        if (is_local) {
            const key = await getMyConductorPublicKey();
            if (!key) return { result: 1, msg: 'conductor_public_key is required for local accounts' };
            const token = String(body.account_token || '').trim();
            if (!token) return { result: 1, msg: 'Account token is required' };
            body.account_token = isEncryptedToken(token) ? token : await encryptWithPublicKeyToken(key, token);
        }
        return request('/api/add_account', { body });
    })();
}

export function changeAccount(accountData) {
    const is_local = Boolean(accountData.is_local ?? false);
    const body = {
        account_id: normalizeId(accountData.account_id),
        account_token: accountData.account_token,
        type: accountData.type ?? 'telegram',
        name: accountData.name,
        description: accountData.description,
        is_local,
    };
    if (accountData.server) {
        body.server = accountData.server;
    }
    return (async () => {
        if (is_local) {
            const token = String(body.account_token || '').trim();
            if (token) {
                const key = await getMyConductorPublicKey();
                if (!key) return { result: 1, msg: 'conductor_public_key is required for local accounts' };
                body.account_token = isEncryptedToken(token) ? token : await encryptWithPublicKeyToken(key, token);
            }
        }
        return request('/api/change_account', { body });
    })();
}

export function removeAccount(accountId) {
    return request('/api/remove_account', {
        body: { account_id: normalizeId(accountId) }
    });
}
