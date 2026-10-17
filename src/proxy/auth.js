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
    const body = {
        telegram_data: telegramData || {},
        username: '',
        email: '',
        password: password ?? '',
    };
    if (telegramData) {
        // telegram path: unused strings stay empty
    } else if (isEmail) {
        body.email = identifier ?? '';
    } else {
        body.username = identifier ?? '';
    }
    return request('/api/sign_in', { body });
}

export function signInWithGoogle(credential) {
    return request('/api/sign_in_google', {
        body: {
            credential: credential ?? '',
            email: '',
            google_sub: '',
            full_name: '',
        }
    });
}

export function signUp({ email, code, full_name, username, password }) {
    return request('/api/sign_up', {
        body: {
            email: email ?? '',
            code: code ?? '',
            full_name: full_name ?? '',
            username: username ?? '',
            password: password ?? '',
        }
    });
}

export function requestVerificationCode(email, status, captchaToken) {
    return request('/api/request_verification_code', {
        body: {
            email: email ?? '',
            status: status ?? '',
            captcha_token: captchaToken ?? '',
        }
    });
}

export function checkUsername(username) {
    return request('/api/check_username', {
        body: { username: username ?? '' }
    });
}

export function changePassword(email, code, newPassword) {
    return request('/api/change_password', {
        body: {
            email: email ?? '',
            code: code ?? '',
            new_password: newPassword ?? '',
        }
    });
}
