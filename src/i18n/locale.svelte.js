import { catalogs } from './catalogs.js';

export const STORAGE_KEY = 'sokoyuku-locale';

export const LOCALES = [
    { id: 'en', nativeLabel: 'English', htmlLang: 'en', intl: 'en-US' },
    { id: 'jp', nativeLabel: '日本語', htmlLang: 'ja', intl: 'ja-JP' },
    { id: 'zh-Hans', nativeLabel: '简体中文', htmlLang: 'zh-Hans', intl: 'zh-CN' },
    { id: 'zh-Hant', nativeLabel: '繁體中文', htmlLang: 'zh-Hant', intl: 'zh-TW' },
];

const LOCALE_IDS = new Set(LOCALES.map((item) => item.id));

const ALIASES = [
    { test: (tag) => tag === 'jp' || tag === 'ja' || tag.startsWith('ja-'), id: 'jp' },
    { test: (tag) => tag === 'zh-hant' || tag.startsWith('zh-hant') || tag === 'zh-tw' || tag === 'zh-hk' || tag === 'zh-mo' || tag.startsWith('zh-tw') || tag.startsWith('zh-hk') || tag.startsWith('zh-mo'), id: 'zh-Hant' },
    { test: (tag) => tag === 'zh-hans' || tag.startsWith('zh-hans') || tag === 'zh-cn' || tag === 'zh-sg' || tag === 'zh-my' || tag.startsWith('zh-cn') || tag === 'zh', id: 'zh-Hans' },
    { test: (tag) => tag === 'en' || tag.startsWith('en-'), id: 'en' },
];

export function matchLocale(tag) {
    const normalized = String(tag || '').trim().replace(/_/g, '-').toLowerCase();
    if (!normalized) return null;
    if (LOCALE_IDS.has(tag)) return tag;
    for (const alias of ALIASES) {
        if (alias.test(normalized)) return alias.id;
    }
    return null;
}

function readStoredLocale() {
    try {
        return matchLocale(localStorage.getItem(STORAGE_KEY));
    } catch {
        return null;
    }
}

function detectBrowserLocale() {
    const tags = [];
    if (Array.isArray(navigator.languages)) tags.push(...navigator.languages);
    if (navigator.language) tags.push(navigator.language);
    for (const tag of tags) {
        const matched = matchLocale(tag);
        if (matched) return matched;
    }
    return 'en';
}

function localeMeta(id) {
    return LOCALES.find((item) => item.id === id) || LOCALES[0];
}

function applyDocumentLang(id) {
    const meta = localeMeta(id);
    document.documentElement.lang = meta.htmlLang;
}

export const locale = $state({
    current: readStoredLocale() || detectBrowserLocale(),
});

applyDocumentLang(locale.current);

export function setLocale(id) {
    const matched = matchLocale(id) || 'en';
    locale.current = matched;
    try {
        localStorage.setItem(STORAGE_KEY, matched);
    } catch {
        void 0;
    }
    applyDocumentLang(matched);
}

export function t(key, vars) {
    const current = locale.current;
    if (key == null || key === '') return '';
    const source = String(key);
    const dict = catalogs[current];
    let text = (dict && dict[source]) || source;
    if (vars) {
        for (const [name, value] of Object.entries(vars)) {
            text = text.replaceAll(`{${name}}`, String(value ?? ''));
        }
    }
    return text;
}

const STATUS_KEYS = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past Due',
    canceled: 'Cancelled',
    cancelled: 'Cancelled',
    paid: 'Paid',
    pending: 'Pending',
    failed: 'Failed',
    reserved: 'Reserved',
    settled: 'Settled',
    free: 'Free',
    pro: 'Pro',
    success: 'Success',
    completed: 'Success',
    token: 'Token',
    subscription: 'Subscription',
};

export function tStatus(status) {
    const value = String(status || '').trim();
    if (!value) return t('Unknown');
    const key = STATUS_KEYS[value.toLowerCase()];
    return key ? t(key) : value;
}

export function tAccountType(type) {
    const raw = String(type || '').trim();
    const lower = raw.toLowerCase();
    if (lower.startsWith('qr:')) {
        const inner = tAccountType(raw.slice(3));
        return inner ? t('QR {platform}', { platform: inner }) : 'QR';
    }
    if (lower === 'whatsapp_cloud') return t('WhatsApp Cloud API');
    if (lower === 'qq') return t('QQ');
    if (lower === 'telegram') return t('Telegram');
    if (lower === 'matrix') return t('Matrix');
    if (lower === 'discord') return t('Discord');
    if (lower === 'sokoyuku') return 'Sokoyuku';
    if (!raw) return t('account');
    return t(raw);
}

export function tSplit(key, names) {
    let remaining = t(key);
    const parts = [];
    for (const name of names) {
        const token = `{${name}}`;
        const index = remaining.indexOf(token);
        if (index < 0) {
            throw new Error(`Missing {${name}} in "${key}"`);
        }
        if (index > 0) {
            parts.push({ text: remaining.slice(0, index) });
        }
        parts.push({ slot: name });
        remaining = remaining.slice(index + token.length);
    }
    if (remaining) {
        parts.push({ text: remaining });
    }
    return parts;
}

export function intlLocale() {
    return localeMeta(locale.current).intl;
}

export function formatDate(value, options) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(intlLocale(), options || {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatDateTime(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(intlLocale());
}

export function formatMoney(amount, currency = 'USD') {
    const numericAmount = Number(amount ?? 0);
    const normalized = String(currency || 'USD').toUpperCase();
    try {
        return new Intl.NumberFormat(intlLocale(), {
            style: 'currency',
            currency: normalized,
            minimumFractionDigits: 2,
        }).format(Number.isFinite(numericAmount) ? numericAmount : 0);
    } catch {
        return `${normalized} ${(Number.isFinite(numericAmount) ? numericAmount : 0).toFixed(2)}`;
    }
}

export function yesNo(value) {
    return t(value ? 'Yes' : 'No');
}
