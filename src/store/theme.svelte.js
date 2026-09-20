export const STORAGE_KEY = 'sokoyuku-theme';
export const THEMES = ['day', 'night', 'system'];

const THEME_IDS = new Set(THEMES);

function mediaQuery() {
    return window.matchMedia('(prefers-color-scheme: dark)');
}

function readStoredTheme() {
    let stored = null;
    try {
        stored = localStorage.getItem(STORAGE_KEY);
    } catch {
        stored = null;
    }
    if (stored == null || stored === '') return 'system';
    if (!THEME_IDS.has(stored)) {
        throw new Error(`Invalid stored theme: ${stored}`);
    }
    return stored;
}

function resolveTheme(preference) {
    if (preference === 'night') return 'night';
    if (preference === 'day') return 'day';
    return mediaQuery().matches ? 'night' : 'day';
}

function applyTheme(resolved) {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved === 'night' ? 'dark' : 'light';
}

function loadPreference() {
    try {
        return readStoredTheme();
    } catch (e) {
        console.error(e);
        return 'system';
    }
}

export const theme = $state({
    preference: loadPreference(),
    resolved: 'day',
});

theme.resolved = resolveTheme(theme.preference);
applyTheme(theme.resolved);

export function setTheme(preference) {
    if (!THEME_IDS.has(preference)) {
        throw new Error(`Invalid theme: ${preference}`);
    }
    theme.preference = preference;
    theme.resolved = resolveTheme(preference);
    try {
        localStorage.setItem(STORAGE_KEY, preference);
    } catch (e) {
        console.error(e);
    }
    applyTheme(theme.resolved);
}

mediaQuery().addEventListener('change', () => {
    if (theme.preference !== 'system') return;
    theme.resolved = resolveTheme('system');
    applyTheme(theme.resolved);
});
