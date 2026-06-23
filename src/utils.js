
import { BASE_URL } from './config.js';

const PUBLIC_KEY_TOKEN_PREFIX = 'lcpk1:';
const ENCRYPTED_TOKEN_PREFIX = 'lcenc1:';

export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

export function validatePassword(password) {
    // Password must be at least 8 characters long and contain at least one number
    const re = /^(?=.*\d).{8,}$/;
    return re.test(password);
}

/**
 * @param {string} endpoint
 * @param {Omit<RequestInit, 'body'> & { body?: any }} [options]
 */
export async function request(endpoint, { body, ...options } = {}) {
    try {
        /** @type {HeadersInit} */
        // @ts-ignore
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        
        /** @type {RequestInit} */
        const config = {
            method: 'POST',
            credentials: 'include',
            ...options,
            headers
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, config);
        
        // Handle non-JSON responses (like 401/403 without body, or 500 html)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        // For endpoints that don't return JSON (rare but possible)
        if (!response.ok) {
             throw new Error(`Request failed with status ${response.status}`);
        }
        return { result: 0 }; // Default success if no JSON
    } catch (err) {
        console.error(`Error requesting ${endpoint}:`, err);
        return { 
            result: -1, 
            msg: err.message || 'Connection error',
            ...(import.meta.env.DEV ? { error: err, stack: err.stack } : {})
        };
    }
}

function b64urlEncodeBytes(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlDecodeToBytes(s) {
    const input = String(s || '').trim();
    if (!input) throw new Error('empty base64url');
    const padLen = (4 - (input.length % 4)) % 4;
    const padded = input + '='.repeat(padLen);
    const normalized = padded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        out[i] = binary.charCodeAt(i);
    }
    return out;
}

export function parsePublicKeyToken(token) {
    const t = String(token || '').trim();
    if (!t.startsWith(PUBLIC_KEY_TOKEN_PREFIX)) return null;
    const raw = t.slice(PUBLIC_KEY_TOKEN_PREFIX.length);
    try {
        const decoded = b64urlDecodeToBytes(raw);
        const json = new TextDecoder().decode(decoded);
        const jwk = JSON.parse(json);
        if (!jwk || String(jwk.kty || '').toUpperCase() !== 'RSA') return null;
        if (!jwk.n || !jwk.e) return null;
        return { kty: 'RSA', n: String(jwk.n), e: String(jwk.e) };
    } catch {
        return null;
    }
}

export function isEncryptedToken(token) {
    return String(token || '').trim().startsWith(ENCRYPTED_TOKEN_PREFIX);
}

export function ensureEncryptedTokenPrefix(token) {
    const t = String(token || '').trim();
    if (!t) return t;
    return t.startsWith(ENCRYPTED_TOKEN_PREFIX) ? t : ENCRYPTED_TOKEN_PREFIX + t;
}

export async function encryptWithPublicKeyToken(publicKeyToken, plaintext) {
    const jwk = parsePublicKeyToken(publicKeyToken);
    if (!jwk) throw new Error('invalid public key token');
    if (!globalThis.crypto?.subtle) throw new Error('WebCrypto unavailable');

    const publicKey = await crypto.subtle.importKey(
        'jwk',
        { ...jwk, alg: 'RSA-OAEP-256', ext: true, key_ops: ['encrypt'] },
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
    );

    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const encKeyBuf = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, keyBytes);

    const aesKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
    const cipherBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        aesKey,
        new TextEncoder().encode(String(plaintext ?? ''))
    );

    const payload = {
        v: 1,
        k: b64urlEncodeBytes(new Uint8Array(encKeyBuf)),
        n: b64urlEncodeBytes(nonce),
        c: b64urlEncodeBytes(new Uint8Array(cipherBuf)),
    };
    const rawPayload = new TextEncoder().encode(JSON.stringify(payload));
    return ENCRYPTED_TOKEN_PREFIX + b64urlEncodeBytes(rawPayload);
}
