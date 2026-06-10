import { request } from '../utils.js';

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
    const body = {
        account_username: accountData.account_username,
        account_token: accountData.account_token,
        name: accountData.name,
        description: accountData.description,
        type
    };
    if (accountData.server) {
        body.server = accountData.server;
    }
    return request('/api/add_account', { body });
}

export function changeAccount(accountData) {
    const body = {
        account_id: normalizeId(accountData.account_id),
        account_token: accountData.account_token,
        type: accountData.type ?? 'telegram',
        name: accountData.name,
        description: accountData.description,
    };
    if (accountData.server) {
        body.server = accountData.server;
    }
    return request('/api/change_account', { body });
}

export function removeAccount(accountId) {
    return request('/api/remove_account', {
        body: { account_id: normalizeId(accountId) }
    });
}
