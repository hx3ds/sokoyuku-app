import { request } from '../utils.js';

export async function signOut() {
    const res = await request('/api/sign_out');
    if (res.result !== -1) {
         window.location.href = '/signin';
         return true;
    }
    return false;
}

export async function signIn(identifier, password, telegramData) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const body = telegramData 
        ? { telegram_data: telegramData }
        : {
            [isEmail ? 'email' : 'username']: identifier,
            password: password
        };
    return request('/api/sign_in', { body });
}

export function signInWithGoogle(credential) {
    return request('/api/sign_in_google', {
        body: { credential }
    });
}

export function signUp({ email, code, full_name, username, password }) {
    return request('/api/sign_up', {
        body: { email, code, full_name, username, password }
    });
}

export function requestVerificationCode(email, status, captchaToken) {
    return request('/api/request_verification_code', {
        body: { email, status, captcha_token: captchaToken }
    });
}

export function checkUsername(username) {
    return request('/api/check_username', {
        body: { username }
    });
}

export function changePassword(email, code, newPassword) {
    return request('/api/change_password', {
        body: { email, code, new_password: newPassword }
    });
}
