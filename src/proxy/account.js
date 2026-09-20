import { request, encryptWithPublicKeyToken, isEncryptedToken } from '../utils.js';
import { getMyConductorPublicKey } from './user.js';

export const BUILTIN_PUBLIC_ACCOUNT_TYPES = ['telegram', 'matrix', 'discord', 'qq', 'whatsapp_cloud'];
export const CUSTOM_ACCOUNT_TYPE_VALUE = '__custom__';
export const LOCAL_PLATFORM_TYPE_REGEX = /^[a-z][a-z0-9_-]{0,14}$/;
export const ACCOUNT_SETUP_DOCS = {
    telegram: {
        href: 'https://core.telegram.org/bots',
        title: 'Bots: An introduction for developers',
    },
    matrix: {
        href: 'https://spec.matrix.org/latest/client-server-api/#login',
        title: 'Client-Server API',
    },
    discord: {
        href: 'https://discord.com/developers/docs/quick-start/getting-started',
        title: 'Building your first Discord Bot',
    },
    qq: {
        href: 'https://bot.q.qq.com/wiki/develop/api-v2/',
        title: '启动接入',
    },
    whatsapp_cloud: {
        href: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/',
        title: 'WhatsApp Cloud API Get Started',
    },
};

function normalizeId(id) {
    return typeof id === 'string' ? id.replace(/-/g, '') : id;
}

function normalizePlatformType(value) {
    return String(value ?? '').trim().toLowerCase();
}

export function isBuiltinPublicAccountType(type) {
    return BUILTIN_PUBLIC_ACCOUNT_TYPES.includes(normalizePlatformType(type));
}

export function accountTypeChoice(type, isLocal) {
    const raw = normalizePlatformType(type);
    if (isLocal && raw && !isBuiltinPublicAccountType(raw)) return CUSTOM_ACCOUNT_TYPE_VALUE;
    return raw || 'telegram';
}

export function resolveAccountTypeChoice(choice, customType, isLocal) {
    if (isLocal && choice === CUSTOM_ACCOUNT_TYPE_VALUE) {
        return normalizePlatformType(customType);
    }
    return normalizePlatformType(choice);
}

function validateAccountTypeForScope(type, isLocal) {
    const normalized = normalizePlatformType(type);
    if (!normalized) return { ok: false, msg: 'type is required' };
    if (isLocal) {
        const bare = normalized.startsWith('qr:') ? normalized.slice(3) : normalized;
        if (!LOCAL_PLATFORM_TYPE_REGEX.test(bare)) {
            return { ok: false, msg: 'type must match ^[a-z][a-z0-9_-]{0,14}$' };
        }
        return { ok: true, type: normalized.startsWith('qr:') ? `qr:${bare}` : bare };
    }
    if (!isBuiltinPublicAccountType(normalized) && normalized !== 'sokoyuku') {
        return { ok: false, msg: 'Invalid account type' };
    }
    return { ok: true, type: normalized };
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

function composeQqAccountToken(type, username, token) {
    if (String(type || '').trim().toLowerCase() !== 'qq') return String(token ?? '');
    const secret = String(token || '').trim();
    if (!secret) return '';
    if (isEncryptedToken(secret) || secret.startsWith('{')) return secret;
    const appId = String(username || '').trim();
    if (!appId) return secret;
    return JSON.stringify({ app_id: appId, client_secret: secret });
}

export function accountTypeLabel(type) {
    const raw = String(type || '').trim().toLowerCase();
    if (raw.startsWith('qr:')) {
        const inner = accountTypeLabel(raw.slice(3));
        return inner ? `QR ${inner}` : 'QR';
    }
    if (raw === 'whatsapp_cloud') return 'WhatsApp Cloud API';
    if (raw === 'qq') return 'QQ';
    if (raw === 'telegram') return 'Telegram';
    if (raw === 'matrix') return 'Matrix';
    if (raw === 'discord') return 'Discord';
    if (raw === 'sokoyuku') return 'Sokoyuku';
    return String(type || 'account');
}

export function accountUsernameField(type) {
    const raw = normalizePlatformType(type);
    if (raw === 'discord') return { title: 'Application ID', placeholder: 'Enter Application ID' };
    if (raw === 'whatsapp_cloud') return { title: 'Phone number ID', placeholder: 'Enter phone number ID' };
    if (raw === 'qq') return { title: 'AppID', placeholder: 'Enter AppID' };
    if (raw === 'matrix') return { title: 'User ID', placeholder: 'e.g. @user:matrix.org' };
    if (raw === 'telegram') return { title: 'Bot username', placeholder: 'Enter bot username' };
    return { title: 'Account Username', placeholder: 'Enter username' };
}

export function accountTokenField(type) {
    const raw = normalizePlatformType(type);
    if (raw === 'whatsapp_cloud' || raw === 'matrix') return { title: 'Access token', placeholder: 'Enter access token' };
    if (raw === 'qq') return { title: 'AppSecret', placeholder: 'Enter AppSecret' };
    if (raw === 'telegram' || raw === 'discord') return { title: 'Bot token', placeholder: 'Enter bot token' };
    return { title: 'Account Token', placeholder: 'Enter token' };
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
    const is_local = Boolean(accountData.is_local ?? false);
    const scoped = validateAccountTypeForScope(accountData.type ?? 'telegram', is_local);
    if (!scoped.ok) return Promise.resolve({ result: 1, msg: scoped.msg });
    const type = scoped.type;
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
    body.account_token = composeQqAccountToken(type, body.account_username, body.account_token);
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
    const scoped = validateAccountTypeForScope(accountData.type ?? 'telegram', is_local);
    if (!scoped.ok) return Promise.resolve({ result: 1, msg: scoped.msg });
    const type = scoped.type;
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
    body.account_token = composeQqAccountToken(type, accountData.account_username, body.account_token);
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
