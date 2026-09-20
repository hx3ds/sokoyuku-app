<script lang="ts">
    import { onDestroy } from 'svelte';
    import PageContainer from '../../components/PageContainer.svelte';
    import Button from '../../components/Button/Button.svelte';
    import { fetchModel } from '../../proxy/model.js';
    import { openCallSession, closeCallSession, mintCallTurn, signalCall, openCallEvents } from '../../proxy/call.js';
    import { callStore, normalizeCallId } from '../../store/calls.svelte.js';
    import { t } from '../../i18n/locale.svelte.js';

    let { modelId = null } = $props() as { modelId?: string | null };

    let loading = $state(true);
    let status = $state('');
    let error = $state('');
    let modelName = $state('');
    let sessionKey = $state('');
    let sessionId = $state('');
    let pc: RTCPeerConnection | null = null;
    let localStream: MediaStream | null = null;
    let remoteAudio: HTMLAudioElement | null = null;
    let eventSource: EventSource | null = null;
    let callId = $state('');
    let hungUp = false;
    let startGen = 0;
    let appliedNonce = -1;
    let connected = $state(false);
    let ended = $state(false);
    let muted = $state(false);
    let connectedAt = 0;
    let elapsedLabel = $state('00:00');

    const initial = $derived((modelName || t('Model')).trim().slice(0, 1).toUpperCase() || '•');
    const pulse = $derived(!error && !ended && !connected);
    const statusLine = $derived(
        ended ? t('Call ended')
            : connected ? elapsedLabel
            : (status || t('Connecting…'))
    );

    $effect(() => {
        const currentModelId = modelId;
        const intent = callStore.intent;
        if (!currentModelId) return;
        void applyIntent(currentModelId, intent);
    });

    $effect(() => {
        const nonce = callStore.teardownNonce;
        const sid = callStore.teardownSessionId;
        if (!nonce || !sid) return;
        if (normalizeCallId(sessionId) !== sid) return;
        void teardownMedia();
        hungUp = true;
        ended = true;
        connected = false;
        status = t('Call ended');
        loading = false;
        sessionKey = '';
        sessionId = '';
        callId = '';
        appliedNonce = -1;
    });

    $effect(() => {
        if (!connected) return;
        const started = connectedAt || Date.now();
        const tick = () => {
            const sec = Math.max(0, Math.floor((Date.now() - started) / 1000));
            elapsedLabel = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    });

    onDestroy(() => {
        void teardownMedia();
    });

    async function applyIntent(currentModelId: string, intent: { nonce: number; modelId: string; sessionId: string }) {
        const mid = normalizeCallId(currentModelId);
        const intentForThis = intent.modelId === mid && intent.nonce > 0;
        if (hungUp && !(intentForThis && intent.nonce !== appliedNonce)) return;
        const live = callStore.live;
        const liveHere = Boolean(
            pc
            && !hungUp
            && live.modelId === mid
            && live.sessionId
            && live.sessionId === normalizeCallId(sessionId)
        );

        if (intentForThis && appliedNonce === intent.nonce && liveHere) return;
        if (liveHere) {
            if (intentForThis) appliedNonce = intent.nonce;
            loading = false;
            error = '';
            ended = false;
            return;
        }

        if (intentForThis) appliedNonce = intent.nonce;
        await startCall(currentModelId);
    }

    function markConnected() {
        if (connected) return;
        connected = true;
        connectedAt = Date.now();
        status = t('Connected');
    }

    async function startCall(currentModelId: string) {
        const gen = ++startGen;
        loading = true;
        error = '';
        hungUp = false;
        ended = false;
        connected = false;
        muted = false;
        elapsedLabel = '00:00';
        connectedAt = 0;
        status = t('Connecting…');
        try {
            await teardownMedia();
            const model = await fetchModel(currentModelId);
            if (gen !== startGen) return;
            if (!model) {
                error = t('Model not found');
                loading = false;
                return;
            }
            modelName = model.name || t('Model');
            if (!model.call_support || model.type !== 'subscription') {
                error = t('This model does not support calls');
                loading = false;
                return;
            }

            status = t('Opening session…');
            const opened = await openCallSession(currentModelId);
            if (gen !== startGen) return;
            if (opened.result !== 0) {
                error = opened.msg || t('Failed to open call session');
                loading = false;
                return;
            }
            sessionKey = opened.data.session_key;
            sessionId = opened.data.session_id;
            callStore.rememberKey(sessionId, sessionKey);
            void callStore.refresh();

            status = t('Requesting microphone…');
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            if (gen !== startGen) return;

            status = t('Minting TURN…');
            const turnRes = await mintCallTurn(sessionKey);
            if (gen !== startGen) return;
            if (turnRes.result !== 0) {
                error = turnRes.msg || t('Failed to mint TURN');
                loading = false;
                return;
            }
            const iceServers = turnRes.data.iceServers || [];

            pc = new RTCPeerConnection({ iceServers });
            for (const track of localStream.getAudioTracks()) {
                track.enabled = !muted;
                pc.addTrack(track, localStream);
            }
            remoteAudio = new Audio();
            remoteAudio.autoplay = true;
            pc.ontrack = (ev) => {
                if (remoteAudio) {
                    remoteAudio.srcObject = ev.streams[0];
                }
            };
            pc.onicecandidate = (ev) => {
                if (!ev.candidate || !sessionKey || !callId) return;
                void signalCall(sessionKey, 'm.call.candidates', {
                    call_id: callId,
                    candidates: [ev.candidate.toJSON()],
                    version: 0,
                });
            };
            pc.onconnectionstatechange = () => {
                if (!pc) return;
                if (pc.connectionState === 'connected') markConnected();
                else if (pc.connectionState === 'failed') status = t('Connection failed');
                else if (pc.connectionState === 'disconnected') status = t('Disconnected');
            };

            callId = crypto.randomUUID();
            callStore.setLive({ modelId: currentModelId, sessionId, callId });
            const offer = await pc.createOffer({ offerToReceiveAudio: true });
            await pc.setLocalDescription(offer);
            if (gen !== startGen) return;

            eventSource = openCallEvents(sessionKey, {
                onEvent: (msg) => {
                    void handleSignalDown(msg);
                },
                onError: () => {
                    if (!hungUp) status = t('Signaling interrupted');
                },
            });

            status = t('Calling…');
            const inviteRes = await signalCall(sessionKey, 'm.call.invite', {
                call_id: callId,
                version: 0,
                lifetime: 60000,
                offer: {
                    sdp: offer.sdp,
                    type: 'offer',
                },
            });
            if (gen !== startGen) return;
            if (inviteRes.result !== 0) {
                error = inviteRes.msg || t('Failed to send invite');
                loading = false;
                return;
            }
            loading = false;
            status = t('Waiting for answer…');
        } catch (e: any) {
            if (gen !== startGen) return;
            error = e?.message || t('Call failed');
            loading = false;
            await hangup();
        }
    }

    async function handleSignalDown(msg: any) {
        if (!pc || !msg || hungUp) return;
        const type = msg.type;
        const content = msg.content || {};
        if (type === 'm.call.answer') {
            const sdp = content?.answer?.sdp || content?.sdp;
            if (sdp) {
                await pc.setRemoteDescription({ type: 'answer', sdp });
                status = t('Connecting media…');
            }
        } else if (type === 'm.call.candidates') {
            const candidates = content.candidates || [];
            for (const c of candidates) {
                try {
                    await pc.addIceCandidate(c);
                } catch (_) {}
            }
        } else if (type === 'm.call.hangup') {
            status = t('Call ended');
            await hangup(false);
        }
    }

    async function teardownMedia() {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        if (pc) {
            try { pc.close(); } catch (_) {}
            pc = null;
        }
        if (localStream) {
            for (const track of localStream.getTracks()) track.stop();
            localStream = null;
        }
        if (remoteAudio) {
            remoteAudio.srcObject = null;
            remoteAudio = null;
        }
    }

    async function hangup(sendSignal = true) {
        if (hungUp) return;
        hungUp = true;
        ended = true;
        connected = false;
        const sid = sessionId;
        const key = sessionKey;
        const cid = callId;
        startGen += 1;
        try {
            if (key || sid) {
                await closeCallSession({ sessionId: sid, sessionKey: key });
            }
        } catch (_) {}
        try {
            if (sendSignal && key && cid) {
                await signalCall(key, 'm.call.hangup', { call_id: cid, version: 0 });
            }
        } catch (_) {}
        if (sid) callStore.forgetKey(sid);
        await teardownMedia();
        sessionKey = '';
        sessionId = '';
        callId = '';
        pc = null;
        callStore.clearLive();
        await callStore.refresh();
    }

    function goToModels() {
        history.pushState(null, '', '/models');
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    function leave() {
        void hangup().then(() => goToModels());
    }

    function toggleMute() {
        muted = !muted;
        if (!localStream) return;
        for (const track of localStream.getAudioTracks()) {
            track.enabled = !muted;
        }
    }
</script>

<PageContainer id="page-call">
    <div class="call-card" class:ended={ended && !error} class:failed={!!error}>
        <div class="call-top">
            {#if !error && !ended}
                <Button variant="icon-button" onclick={goToModels} aria-label={t('Hide')} tooltip={t('Hide')}>
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                </Button>
            {:else}
                <span class="top-spacer"></span>
            {/if}
        </div>

        <div class="call-stage">
            <div class="avatar-wrap" class:pulse class:live={connected} class:dim={!!error || ended}>
                <div class="ring ring-a"></div>
                <div class="ring ring-b"></div>
                <div class="avatar">{initial}</div>
            </div>
            <h1 class="name">{modelName || t('Model')}</h1>
            {#if error}
                <p class="status error-text">{error}</p>
            {:else}
                <p class="status" class:live={connected}>{statusLine}</p>
                {#if muted && !ended}
                    <p class="mute-hint">{t('Microphone is off')}</p>
                {/if}
            {/if}
        </div>

        <div class="call-actions">
            {#if error || ended}
                <Button variant="text-button" onclick={goToModels}>{t('Back to models')}</Button>
            {:else}
                <button
                    type="button"
                    class="round mute"
                    class:on={muted}
                    onclick={toggleMute}
                    aria-label={muted ? t('Unmute') : t('Mute')}
                    aria-pressed={muted}
                >
                    {#if muted}
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3l18 18M9 9v3.75A3 3 0 0012.75 15.5m2.25-5V4.5a3 3 0 00-5.686-1.37M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5" /></svg>
                    {:else}
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
                    {/if}
                </button>
                <button
                    type="button"
                    class="round hangup"
                    onclick={leave}
                    aria-label={t('Hang up')}
                    disabled={loading && !sessionId}
                >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                </button>
            {/if}
        </div>
    </div>
</PageContainer>

<style>
    .call-card {
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        min-height: min(36rem, calc(100dvh - 10rem));
        display: flex;
        flex-direction: column;
        padding: 0.75rem 1rem 1.5rem;
    }

    .call-top {
        display: flex;
        justify-content: flex-start;
        min-height: 2rem;
    }

    .top-spacer {
        width: 1.75rem;
        height: 1.75rem;
    }

    .icon {
        width: 1.5rem;
        height: 1.5rem;
        color: var(--color-text-secondary);
    }

    .call-stage {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 1.5rem 0 2rem;
        text-align: center;
    }

    .avatar-wrap {
        position: relative;
        width: 8rem;
        height: 8rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0.5rem;
    }

    .avatar {
        width: 6.5rem;
        height: 6.5rem;
        border-radius: 50%;
        background: var(--color-primary-soft);
        color: var(--color-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.25rem;
        font-weight: 600;
        letter-spacing: -0.02em;
        position: relative;
        z-index: 1;
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary), transparent 80%);
    }

    .avatar-wrap.live .avatar {
        background: color-mix(in srgb, var(--color-success), white 86%);
        color: var(--color-success);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-success), transparent 70%);
    }

    .avatar-wrap.dim .avatar {
        background: var(--color-bg-secondary);
        color: var(--color-text-secondary);
        box-shadow: none;
    }

    .ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 1.5px solid color-mix(in srgb, var(--color-primary), transparent 55%);
        opacity: 0;
    }

    .avatar-wrap.pulse .ring {
        animation: ring-pulse 2.4s ease-out infinite;
    }

    .avatar-wrap.pulse .ring-b {
        animation-delay: 1.2s;
    }

    .avatar-wrap.live .ring {
        border-color: color-mix(in srgb, var(--color-success), transparent 55%);
    }

    .name {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-text-main);
        letter-spacing: -0.02em;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 0 1rem;
    }

    .status {
        margin: 0;
        font-size: 0.9375rem;
        color: var(--color-text-secondary);
        font-variant-numeric: tabular-nums;
        min-height: 1.4em;
    }

    .status.live {
        color: var(--color-success);
        font-weight: 500;
    }

    .error-text {
        color: var(--color-danger);
        padding: 0 1rem;
        line-height: 1.45;
    }

    .mute-hint {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--color-text-tertiary);
    }

    .call-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1.75rem;
        padding-bottom: 0.5rem;
        min-height: 5.5rem;
    }

    .round {
        width: 4rem;
        height: 4rem;
        border: none;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.15s ease, filter 0.15s ease, background-color 0.15s ease;
    }

    .round svg {
        width: 1.75rem;
        height: 1.75rem;
    }

    .round:active:not(:disabled) {
        transform: scale(0.96);
    }

    .round:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    .round.mute {
        background: var(--color-bg-secondary);
        color: var(--color-text-main);
        box-shadow: inset 0 0 0 1px var(--color-border-light);
    }

    .round.mute.on {
        background: var(--color-text-main);
        color: var(--color-text-inverse);
        box-shadow: none;
    }

    .round.hangup {
        width: 4.5rem;
        height: 4.5rem;
        background: var(--color-danger);
        color: var(--color-text-inverse);
        transform: rotate(135deg);
        box-shadow: 0 8px 20px color-mix(in srgb, var(--color-danger), transparent 70%);
    }

    .round.hangup svg {
        width: 2rem;
        height: 2rem;
    }

    @media (hover: hover) and (pointer: fine) {
        .round.mute:hover:not(:disabled) {
            filter: brightness(0.97);
        }
        .round.hangup:hover:not(:disabled) {
            background: var(--color-danger-hover);
        }
    }

    @keyframes ring-pulse {
        0% {
            transform: scale(0.72);
            opacity: 0.45;
        }
        100% {
            transform: scale(1.15);
            opacity: 0;
        }
    }

    @media (min-width: 768px) {
        .call-card {
            min-height: 32rem;
        }
    }
</style>
