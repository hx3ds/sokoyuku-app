import { listOpenCallSessions, closeCallSession } from '../proxy/call.js';

const KEYS_STORAGE = 'sokoyuku-call-session-keys';

export function normalizeCallId(id) {
    return String(id || '').replace(/-/g, '').toLowerCase();
}

function loadKeys() {
    try {
        const parsed = JSON.parse(localStorage.getItem(KEYS_STORAGE) || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return parsed;
    } catch {
        return {};
    }
}

function saveKeys(next) {
    try {
        localStorage.setItem(KEYS_STORAGE, JSON.stringify(next || {}));
    } catch {
        void 0;
    }
}

function createCallStore() {
    let sessions = $state(/** @type {any[]} */ ([]));
    let keys = $state(loadKeys());
    let intent = $state({ nonce: 0, modelId: '', sessionId: '' });
    let live = $state({ modelId: '', sessionId: '', callId: '' });
    let teardownNonce = $state(0);
    let teardownSessionId = $state('');

    function rememberKey(sessionId, sessionKey) {
        const id = normalizeCallId(sessionId);
        if (!id || !sessionKey) return;
        keys = { ...keys, [id]: sessionKey };
        saveKeys(keys);
    }

    function forgetKey(sessionId) {
        const id = normalizeCallId(sessionId);
        if (!id || !(id in keys)) return;
        const next = { ...keys };
        delete next[id];
        keys = next;
        saveKeys(keys);
    }

    function keyFor(sessionId) {
        return keys[normalizeCallId(sessionId)] || '';
    }

    function sessionsForModel(modelId) {
        const mid = normalizeCallId(modelId);
        return sessions.filter((session) => normalizeCallId(session.model_id) === mid);
    }

    function setIntent(opts) {
        intent = {
            nonce: intent.nonce + 1,
            modelId: normalizeCallId(opts && opts.modelId),
            sessionId: normalizeCallId(opts && opts.sessionId),
        };
    }

    function setLive(opts) {
        live = {
            modelId: normalizeCallId(opts && opts.modelId),
            sessionId: normalizeCallId(opts && opts.sessionId),
            callId: String((opts && opts.callId) || ''),
        };
    }

    function clearLive() {
        live = { modelId: '', sessionId: '', callId: '' };
    }

    function isLiveSession(sessionId) {
        return Boolean(live.sessionId && live.sessionId === normalizeCallId(sessionId));
    }

    function requestTeardown(sessionId) {
        teardownSessionId = normalizeCallId(sessionId);
        teardownNonce += 1;
    }

    function pruneKeys(openSessions) {
        const open = new Set(openSessions.map((session) => normalizeCallId(session.session_id)));
        let changed = false;
        const next = { ...keys };
        for (const id of Object.keys(next)) {
            if (!open.has(id)) {
                delete next[id];
                changed = true;
            }
        }
        if (changed) {
            keys = next;
            saveKeys(keys);
        }
    }

    async function refresh() {
        const res = await listOpenCallSessions();
        if (res?.result !== 0) return res;
        const list = Array.isArray(res?.data?.sessions) ? res.data.sessions : [];
        sessions = list;
        pruneKeys(list);
        return res;
    }

    async function hangupSession(session) {
        const sessionId = session?.session_id || '';
        const sessionKey = keyFor(sessionId);
        const res = await closeCallSession({ sessionId, sessionKey });
        if (res?.result === 0) {
            forgetKey(sessionId);
            sessions = sessions.filter((item) => normalizeCallId(item.session_id) !== normalizeCallId(sessionId));
            if (isLiveSession(sessionId)) clearLive();
            requestTeardown(sessionId);
        }
        return res;
    }

    function activeModelIds() {
        return new Set(sessions.map((session) => normalizeCallId(session.model_id)).filter(Boolean));
    }

    function goToCall(modelId) {
        history.pushState(null, '', `/call/${modelId}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    return {
        get sessions() { return sessions; },
        get intent() { return intent; },
        get live() { return live; },
        get teardownNonce() { return teardownNonce; },
        get teardownSessionId() { return teardownSessionId; },
        rememberKey,
        forgetKey,
        keyFor,
        sessionsForModel,
        setIntent,
        setLive,
        clearLive,
        isLiveSession,
        refresh,
        hangupSession,
        activeModelIds,
        goToCall,
    };
}

export const callStore = createCallStore();
