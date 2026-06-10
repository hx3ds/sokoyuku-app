import { request } from '../utils.js';

export async function fetchProfile() {
    const data = await request('/api/get_my_profile');
    return data.result === 0 ? data.data : null;
}

export function whoami() {
    return request('/api/whoami');
}

export async function getMyEmail() {
    const data = await request('/api/get_my_email');
    return data.result === 0 ? data.data.email : null;
}

export async function getMyWalletBalance() {
    const data = await request('/api/get_my_wallet_balance');
    if (data.result !== 0) return 0;
    const raw = data.data?.wallet_balance ?? data.data?.balance ?? 0;
    const num = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    return Number.isFinite(num) ? num : 0;
}

export function updateProfile(data) {
    return request('/api/change_my_profile', { body: data });
}

export async function fetchUserProfile(username) {
    const data = await request('/api/get_user_profile', {
        body: { username }
    });
    return data.result === 0 ? data.data : null;
}
