
import { BASE_URL } from './config.js';

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
