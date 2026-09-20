//export const BASE_URL = import.meta.env.DEV ? 'http://localhost:9000' : 'https://api.sokoyuku.com';
//export const BASE_URL = import.meta.env.DEV ? 'http://localhost:9000' : 'https://apid.sokoyuku.com';
//export const BASE_URL = import.meta.env.DEV ? 'http://localhost:9000' : 'https://apis.sokoyuku.com';
//export const BASE_URL = 'https://api.sokoyuku.com';

// npm test sets VITE_BASE_URL=http://localhost:9000; manual `npm run dev` uses apid.
export const BASE_URL =
    import.meta.env.VITE_BASE_URL ||
    (import.meta.env.DEV ? 'https://apid.sokoyuku.com' : 'https://apis.sokoyuku.com');
export const GOOGLE_CLIENT_ID =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '1073852159531-hoob9nn2f9jse3o5eb65s698crl4res6.apps.googleusercontent.com';
export const TELEGRAM_LOGIN_USERNAME = import.meta.env.DEV ? 'tom_bridge_bot' : 'sam_bridge_bot';
//export const TELEGRAM_LOGIN_USERNAME = 'david_bridge_bot';
export const TURNSTILE_SITE_KEY = '0x4AAAAAADtW0HIvV0MNKpDv';
export const LEGAL_SITE_URL = 'https://sokoyuku.com';
export const LEGAL_TERMS_URL = `${LEGAL_SITE_URL}/legal/terms`;
export const LEGAL_PRIVACY_URL = `${LEGAL_SITE_URL}/legal/privacy`;
export const LEGAL_COOKIES_URL = `${LEGAL_SITE_URL}/legal/cookies`;
export const LEGAL_CREATOR_CONTRACT_URL = `${LEGAL_SITE_URL}/legal/creator-contract`;
export const LEGAL_MODEL_PRIVACY_URL = `${LEGAL_SITE_URL}/legal/model-privacy`;
