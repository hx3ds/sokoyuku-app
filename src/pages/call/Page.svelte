<script lang="ts">
    import { onDestroy } from 'svelte';
    import PageContainer from '../../components/PageContainer.svelte';
    import Loading from '../../components/Loading.svelte';
    import Button from '../../components/Button/Button.svelte';
    import { fetchModel } from '../../proxy/model.js';
    import { openCallSession, closeCallSession, mintCallTurn, signalCall, openCallEvents } from '../../proxy/call.js';

    let { modelId = null } = $props() as { modelId?: string | null };

    let loading = $state(true);
    let status = $state('Connecting…');
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

    $effect(() => {
        if (modelId) {
            startCall();
        }
        return () => {
            void hangup();
        };
    });

    onDestroy(() => {
        void hangup();
    });

    async function startCall() {
        loading = true;
        error = '';
        hungUp = false;
        try {
            const model = await fetchModel(modelId);
            if (!model) {
                error = 'Model not found';
                loading = false;
                return;
            }
            modelName = model.name || 'Model';
            if (!model.call_support || model.type !== 'subscription') {
                error = 'This model does not support calls';
                loading = false;
                return;
            }

            status = 'Opening session…';
            const opened = await openCallSession(modelId);
            if (opened.result !== 0) {
                error = opened.msg || 'Failed to open call session';
                loading = false;
                return;
            }
            sessionKey = opened.data.session_key;
            sessionId = opened.data.session_id;

            status = 'Requesting microphone…';
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            status = 'Minting TURN…';
            const turnRes = await mintCallTurn(sessionKey);
            if (turnRes.result !== 0) {
                error = turnRes.msg || 'Failed to mint TURN';
                loading = false;
                return;
            }
            const iceServers = turnRes.data.iceServers || [];

            pc = new RTCPeerConnection({ iceServers });
            for (const track of localStream.getAudioTracks()) {
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
                if (pc.connectionState === 'connected') status = 'Connected';
                else if (pc.connectionState === 'failed') status = 'Connection failed';
                else if (pc.connectionState === 'disconnected') status = 'Disconnected';
            };

            callId = crypto.randomUUID();
            const offer = await pc.createOffer({ offerToReceiveAudio: true });
            await pc.setLocalDescription(offer);

            eventSource = openCallEvents(sessionKey, {
                onEvent: (msg) => {
                    void handleSignalDown(msg);
                },
                onError: () => {
                    if (!hungUp) status = 'Signaling interrupted';
                },
            });

            status = 'Calling…';
            const inviteRes = await signalCall(sessionKey, 'm.call.invite', {
                call_id: callId,
                version: 0,
                lifetime: 60000,
                offer: {
                    sdp: offer.sdp,
                    type: 'offer',
                },
            });
            if (inviteRes.result !== 0) {
                error = inviteRes.msg || 'Failed to send invite';
                loading = false;
                return;
            }
            loading = false;
            status = 'Waiting for answer…';
        } catch (e: any) {
            error = e?.message || 'Call failed';
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
                status = 'Connecting media…';
            }
        } else if (type === 'm.call.candidates') {
            const candidates = content.candidates || [];
            for (const c of candidates) {
                try {
                    await pc.addIceCandidate(c);
                } catch (_) {}
            }
        } else if (type === 'm.call.hangup') {
            status = 'Call ended';
            await hangup(false);
        }
    }

    async function hangup(sendSignal = true) {
        if (hungUp) return;
        hungUp = true;
        try {
            if (sendSignal && sessionKey && callId) {
                await signalCall(sessionKey, 'm.call.hangup', { call_id: callId, version: 0 });
            }
        } catch (_) {}
        try {
            if (sessionKey || sessionId) {
                await closeCallSession({ sessionId, sessionKey });
            }
        } catch (_) {}
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

    function leave() {
        void hangup().then(() => {
            history.pushState(null, '', '/models');
            window.dispatchEvent(new PopStateEvent('popstate'));
        });
    }
</script>

<PageContainer id="page-call">
    {#if loading}
        <Loading />
        <p style="text-align:center;margin-top:1rem;opacity:0.7">{status}</p>
    {:else if error}
        <div style="text-align:center;padding:2rem;">
            <h2>Call unavailable</h2>
            <p>{error}</p>
            <Button onclick={leave}>Back to models</Button>
        </div>
    {:else}
        <div style="text-align:center;padding:2rem;display:flex;flex-direction:column;gap:1rem;align-items:center;">
            <h1>{modelName}</h1>
            <p>{status}</p>
            <Button onclick={leave}>Hang up</Button>
        </div>
    {/if}
</PageContainer>
