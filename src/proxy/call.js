import { request } from '../utils.js';
import { BASE_URL } from '../config.js';

export function openCallSession(modelId) {
    return request('/api/call/open_session', {
        body: { model_id: String(modelId || '').replace(/-/g, '') },
    });
}

export function listOpenCallSessions() {
    return request('/api/call/open_sessions', { method: 'GET' });
}

export function closeCallSession({ sessionId, sessionKey } = {}) {
    return request('/api/call/close_session', {
        body: {
            session_id: sessionId || undefined,
            session_key: sessionKey || undefined,
        },
        headers: sessionKey ? { 'X-Call-Session-Key': sessionKey } : {},
    });
}

export function mintCallTurn(sessionKey) {
    return request('/api/call/mint_turn', {
        body: { session_key: sessionKey },
        headers: { 'X-Call-Session-Key': sessionKey },
    });
}

export function signalCall(sessionKey, type, content) {
    return request('/api/call/signal', {
        body: {
            session_key: sessionKey,
            type,
            content: content || {},
        },
        headers: { 'X-Call-Session-Key': sessionKey },
    });
}

export function openCallEvents(sessionKey, { onEvent, onError } = {}) {
    const url = `${BASE_URL}/api/call/events?key=${encodeURIComponent(sessionKey)}`;
    const source = new EventSource(url, { withCredentials: true });
    source.addEventListener('webrtc', (ev) => {
        try {
            const data = JSON.parse(ev.data || '{}');
            if (onEvent) onEvent(data);
        } catch (e) {
            if (onError) onError(e);
        }
    });
    source.onerror = (err) => {
        if (onError) onError(err);
    };
    return source;
}
