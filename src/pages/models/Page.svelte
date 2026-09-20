<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import * as ModelAPI from '../../proxy/model.js';
    import * as AccountAPI from '../../proxy/account.js';
    import * as SubAPI from '../../proxy/subscription.js';
    import * as ChatAPI from '../../proxy/chat.js';
    import { showConfirm, showError, showSuccess, showAlert } from '../../components/Modal/state.svelte.js';
    import { modelStore } from '../../store/models.svelte.js';
    import { accountStore } from '../../store/accounts.svelte.js';
    import { callStore } from '../../store/calls.svelte.js';

    import PageContainer from '../../components/PageContainer.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    import InfoStackDivider from '../../components/InfoStack/InfoStackDivider.svelte';
    import ActionMenu from '../../components/Button/ActionMenu.svelte';
    import MenuItem from '../../components/Button/MenuItem.svelte';
    import Button from '../../components/Button/Button.svelte';
    import OpenChatButton from '../../components/Button/OpenChatButton.svelte';
    import CallButton from '../../components/Button/CallButton.svelte';
    import AccountSelectModal from '../../components/Modal/AccountSelectModal.svelte';
    import ChatManagementModal from '../../components/Modal/ChatManagementModal.svelte';
    import CallManagementModal from '../../components/Modal/CallManagementModal.svelte';
    import AddAccountModal from '../../components/Modal/AddAccountModal.svelte';
    import AccountDetailsModal from '../../components/Modal/AccountDetailsModal.svelte';
    import ModelDetailsModal from '../../components/Modal/ModelDetailsModal.svelte';
    import InfoStackBadge from '../../components/InfoStack/InfoStackBadge.svelte';
    import Link from '../../components/InfoStack/Link.svelte';
    import { t, tAccountType, tStatus } from '../../i18n/locale.svelte.js';

    type ModelAccount = {
        acct_id: string;
        acct_username: string;
        acct_type?: string | null;
        server?: string | null;
        account_group?: string | null;
        subscription_disabled?: boolean;
        is_last_used?: boolean;
    };

    type Model = {
        model_id: string;
        prototype_id?: number;
        name: string;
        description?: string | null;
        status?: string | null;
        type?: string | null;
        call_support?: boolean;
        period?: string | null;
        auto_renew?: boolean | null;
        stripe_subscription_id?: string | null;
        subscription_status?: string | null;
        subscription_tier?: string | null;
        charge?: number | null;
        has_free_tier?: boolean | null;
        max_tier_charge?: number | null;
        max_charge_per_message?: number | null;
        is_local?: boolean;
        accts?: ModelAccount[];
    };

    type Account = {
        account_id: string;
        account_username: string;
        name: string;
        description?: string | null;
        type?: string | null;
        server?: string | null;
        is_local?: boolean;
        account_group?: string | null;
        subscription_disabled?: boolean;
        created_at?: string | null;
        models?: Array<{ model_id: string; name: string }>;
        assignedModelName?: string;
        assignedModelStatus?: 'current' | 'other';
    };

    type ModalType = 'accountSelect' | 'shareAccountSelect' | 'chatManage' | 'callManage' | 'addAccount' | 'accountDetails' | 'modelDetails' | null;

    const modelStoreAny = modelStore as any;
    const accountStoreAny = accountStore as any;

    let activeMenu: string | null = $state(null);
    
    // UI State
    let activeModal: ModalType = $state(null);
    let modalData: Model | Account | null = $state(null);
    let modalLoading: boolean = $state(false);
    let modalBusyAccountId: string | null = $state(null);
    let isEditingAccount: boolean = $state(false);
    let managedChats: any[] = $state([]);
    let isAccountsSectionExpanded: boolean = $state(false);
    let activeCallPoll: ReturnType<typeof setInterval> | null = null;
    let managedCallSessions: any[] = $state([]);

    $effect(() => {
        if (accountStore.initialized && accountStore.accounts.length === 0) {
            isAccountsSectionExpanded = true;
        }
    });

    function modelHasActiveCall(model: Model) {
        void callStore.sessions;
        return callStore.sessionsForModel(model.model_id).length > 0;
    }

    async function refreshActiveCalls() {
        try {
            await callStore.refresh();
            if (activeModal === 'callManage' && modalData && 'model_id' in modalData) {
                managedCallSessions = callStore.sessionsForModel((modalData as Model).model_id);
            }
        } catch (_) {}
    }

    async function handleCallClick(model: Model) {
        try {
            const res = await callStore.refresh();
            if (res && res.result !== 0) {
                showError(res.msg || t('Failed to list call sessions'));
                return;
            }
        } catch (_) {
            showError(t('Failed to list call sessions'));
            return;
        }
        const sessions = callStore.sessionsForModel(model.model_id);
        if (sessions.length > 1) {
            openModal('callManage', model);
            return;
        }
        if (sessions.length === 1) {
            callStore.setIntent({ modelId: model.model_id, sessionId: sessions[0].session_id });
        } else {
            callStore.setIntent({ modelId: model.model_id, sessionId: '' });
        }
        callStore.goToCall(model.model_id);
    }

    function handleResumeCall(session: { session_id?: string }) {
        const model = modalData as Model | null;
        if (!model?.model_id || !session?.session_id) return;
        callStore.setIntent({ modelId: model.model_id, sessionId: session.session_id });
        closeModal();
        callStore.goToCall(model.model_id);
    }

    async function handleHangupCall(session: { session_id?: string }) {
        if (!session?.session_id) return;
        if (!await showConfirm(t('Hang up this call?'))) return;
        const res = await callStore.hangupSession(session);
        if (res?.result !== 0) {
            showError(res?.msg || t('Operation failed: {msg}', { msg: t('Unknown error') }));
            return;
        }
        const model = modalData as Model | null;
        managedCallSessions = model?.model_id ? callStore.sessionsForModel(model.model_id) : [];
    }

    onMount(async () => {
        await loadData();
        await refreshActiveCalls();
        document.addEventListener('click', closeMenu);
        window.addEventListener('focus', refreshActiveCalls);
        document.addEventListener('visibilitychange', onVisibilityChange);
        activeCallPoll = setInterval(() => {
            if (document.visibilityState === 'visible') void refreshActiveCalls();
        }, 8000);
    });

    function onVisibilityChange() {
        if (document.visibilityState === 'visible') void refreshActiveCalls();
    }

    onDestroy(() => {
        document.removeEventListener('click', closeMenu);
        window.removeEventListener('focus', refreshActiveCalls);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        if (activeCallPoll) clearInterval(activeCallPoll);
    });

    function getDeleteDisabledReason(model: Model) {
        if (model.stripe_subscription_id && !['canceled', 'incomplete_expired'].includes(model.subscription_status || '')) {
            return t('Cannot delete model with active subscription. Please unsubscribe first.');
        }
        if (model.period && new Date(model.period) > new Date()) {
            // Token models can be deleted even if they have available time
            if (model.type === 'token') {
                return null;
            }
            return t('Cannot delete model while it is still available.');
        }
        return null;
    }

    async function loadData() {
        await Promise.all([
            modelStore.load(),
            accountStore.load()
        ]);
    }

    const closeMenu = () => (activeMenu = null);
    
    function handleToggleMenu(event: { detail: { id: string; event: MouseEvent } }) {
        const { id, event: e } = event.detail;
        e.stopPropagation();
        activeMenu = activeMenu === id ? null : id;
    }

    // Generic Action Helper
    async function performAction(actionFn: (arg: any) => Promise<any>, arg: any, confirmMsg: string | null = null) {
        if (confirmMsg && !await showConfirm(confirmMsg)) return;
        
        const res = await actionFn(arg);
        if (res.result === 0) {
            await loadData();
            return true;
        } else {
            showError(t('Operation failed: {msg}', { msg: res.msg || t('Unknown error') }));
            return false;
        }
    }

    // Modals
    const openModal = (type: Exclude<ModalType, null>, data: any = null) => {
        activeModal = type;
        modalData = data;
        modalLoading = false;
        modalBusyAccountId = null;
        isEditingAccount = false;
        managedChats = [];
        managedCallSessions = [];
        
        if (type === 'chatManage' && data?.model_id) loadChats(String(data.model_id));
        if (type === 'callManage' && data?.model_id) {
            managedCallSessions = callStore.sessionsForModel(data.model_id);
        }
    };
    
    const closeModal = () => {
        activeModal = null;
        modalData = null;
        modalBusyAccountId = null;
        isEditingAccount = false;
    };

    function normalizeId(id: string) {
        return String(id || '').replace(/-/g, '');
    }

    function buildStartCommand(modelId: string, otp: string | number | null | undefined) {
        return `/start ${normalizeId(modelId)}${String(otp ?? '')}`;
    }

    function buildTelegramStartLink(accountUsername: string | null | undefined, modelId: string, otp: string | number | null | undefined) {
        const username = String(accountUsername || '').replace(/^@/, '').trim();
        if (!username) return null;
        const start = `${normalizeId(modelId)}${String(otp)}`;
        return `https://t.me/${username}?start=${start}`;
    }

    function buildDiscordInviteLink(accountUsername: string | null | undefined) {
        const clientId = String(accountUsername || '').trim();
        if (!clientId) return null;
        return `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&permissions=110230338919168&integration_type=0&scope=bot`;
    }

    function buildOpenChatLink(account: Account, modelId: string, otp: string | number | null | undefined, apiLink: string | null | undefined = null) {
        const type = account?.type || 'telegram';
        if (type === 'discord') {
            if (!String(account?.account_username || '').trim()) return null;
            return apiLink || buildDiscordInviteLink(account.account_username);
        }
        if (type === 'telegram') {
            return apiLink || buildTelegramStartLink(account.account_username, modelId, otp);
        }
        return null;
    }

    function getModelAccounts(model: Model | null | undefined): ModelAccount[] {
        return Array.isArray(model?.accts) ? model.accts : [];
    }

    function getResolvedModelAccounts(model: Model | null | undefined): Account[] {
        return getModelAccounts(model).map((account) => {
            const stored = (accountStoreAny.accounts as Account[]).find((item) => item.account_id === account.acct_id);
            return {
                account_id: account.acct_id,
                account_username: account.acct_username || stored?.account_username || '',
                name: stored?.name || account.acct_username || account.acct_id,
                description: stored?.description || null,
                type: account.acct_type || stored?.type || null,
                server: account.server || stored?.server || null,
                is_local: stored?.is_local,
                created_at: stored?.created_at,
                models: stored?.models,
            };
        });
    }

    function findModelUsingAccount(accountId: string, excludeModelId: string | null = null): Model | undefined {
        return (modelStoreAny.models as Model[]).find((model) => {
            if (excludeModelId && model.model_id === excludeModelId) {
                return false;
            }
            return getModelAccounts(model).some((account) => account.acct_id === accountId);
        });
    }

    function getAccountSelectOptions(model: Model | null | undefined): Account[] {
        const modelIsLocal = Boolean(model?.is_local);
        return (accountStoreAny.accounts as Account[])
            .filter((account) => Boolean(account.is_local) === modelIsLocal)
            .map((account) => {
            const currentModelUsesAccount = Boolean(
                model?.model_id && getModelAccounts(model).some((item) => item.acct_id === account.account_id)
            );
            const assignedModel = currentModelUsesAccount
                ? model
                : findModelUsingAccount(account.account_id, model?.model_id || null);
            return {
                ...account,
                assignedModelName: assignedModel?.name || undefined,
                assignedModelStatus: assignedModel
                    ? (currentModelUsesAccount ? 'current' : 'other')
                    : undefined,
            };
        });
    }

    function getModelsUsingAccount(accountId: string | null | undefined): Model[] {
        if (!accountId) return [];
        return (modelStoreAny.models as Model[]).filter((model) =>
            getModelAccounts(model).some((account) => account.acct_id === accountId)
        );
    }

    function getAccountAssignedModelBadgeText(account: Account | null | undefined): string {
        const assignedModels = getModelsUsingAccount(account?.account_id);
        if (assignedModels.length === 0) {
            return '';
        }
        if (assignedModels.length === 1) {
            return t('In {name}', { name: assignedModels[0].name });
        }
        return t('In {name} +{count}', { name: assignedModels[0].name, count: assignedModels.length - 1 });
    }

    async function copyTextToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    }

    // Chat Logic
    async function handleStartChat(account: Account) {
        const model = modalData as Model | null;
        if (!model || !account) return;
        if (modalLoading) return;

        const accountId = account.account_id;
        const existingModel = findModelUsingAccount(accountId, model.model_id);
        if (existingModel) {
            if (!await showConfirm(t('Account "{account}" is used by "{model}". Reassign?', { account: account.account_username, model: existingModel.name }))) return;
        }

        modalLoading = true;
        modalBusyAccountId = accountId;
        let res;
        try {
            res = await AccountAPI.requestOtpForChat(accountId, model.model_id);
        } finally {
            modalLoading = false;
            modalBusyAccountId = null;
        }

        if (res.result !== 0) {
            if (await offerSubscribeIfNeeded(res, model, () => handleStartChat(account))) return;
            showError(res.msg || t('Failed to start chat'));
            return;
        }

        const link = buildOpenChatLink(account, model.model_id, res.data?.otp, res.data?.link);
        if (link) {
            window.open(link, '_blank');
            closeModal();
            await loadData();
            return;
        }

        if (res.data?.otp) {
            const startCmd = buildStartCommand(model.model_id, res.data.otp);
            const copied = await copyTextToClipboard(startCmd);
            if (!copied) {
                prompt(t('Copy start command:'), startCmd);
            }
            if ((account?.type || '') === 'whatsapp_cloud') {
                const verifyToken = String(res.data?.verify_token || '').trim();
                const webhookURL = String(res.data?.webhook_url || '').trim();
                const lines = [t('Start command copied!')];
                lines.push('');
                lines.push(t('Configure Meta WhatsApp webhook settings:'));
                if (verifyToken) lines.push(`Verify token: ${verifyToken}`);
                if (webhookURL) lines.push(`Webhook URL: ${webhookURL}`);
                lines.push('');
                lines.push(t('Verify token is derived from this account id. Set both values in Meta before messaging.'));
                await showAlert(lines.join('\n'), t('WhatsApp Cloud API'), 'info');
            } else if (copied) {
                showSuccess(t('Start command copied!'));
            }
            closeModal();
            await loadData();
            return;
        }

        showError(res.msg || t('Failed to start chat'));
    }

    async function handleShareWithAccount(account: Account, modelArg: Model | null = modalData as Model | null) {
        const model = modelArg;
        if (!model || !account) return;

        const res = await AccountAPI.requestOtpForChat(account.account_id, model.model_id);
        if (res.result !== 0) {
            if (await offerSubscribeIfNeeded(res, model, () => handleShareWithAccount(account, model))) return;
            showError(res.msg || t('Share failed'));
            return;
        }

        const link = buildOpenChatLink(account, model.model_id, res.data?.otp, res.data?.link);
        if (link) {
            const copied = await copyTextToClipboard(link);
            if (!copied) {
                prompt(t('Copy link:'), link);
            } else {
                showSuccess(t('Link copied!'));
            }
            closeModal();
            await loadData();
            return;
        }

        if (res.data?.otp) {
            const startCmd = buildStartCommand(model.model_id, res.data.otp);
            const copied = await copyTextToClipboard(startCmd);
            if (!copied) {
                prompt(t('Copy start command:'), startCmd);
            }
            if ((account?.type || '') === 'whatsapp_cloud') {
                const verifyToken = String(res.data?.verify_token || '').trim();
                const webhookURL = String(res.data?.webhook_url || '').trim();
                const lines = [t('Start command copied!')];
                lines.push('');
                lines.push(t('Configure Meta WhatsApp webhook settings:'));
                if (verifyToken) lines.push(`Verify token: ${verifyToken}`);
                if (webhookURL) lines.push(`Webhook URL: ${webhookURL}`);
                lines.push('');
                lines.push(t('Verify token is derived from this account id. Set both values in Meta before messaging.'));
                await showAlert(lines.join('\n'), t('WhatsApp Cloud API'), 'info');
            } else if (copied) {
                showSuccess(t('Start command copied!'));
            }
            closeModal();
            await loadData();
            return;
        }

        showError(res.msg || t('Share failed'));
    }

    // Model Actions
    const handleDeleteModel = (id: string) => performAction(async (arg: string) => {
        const res = await ModelAPI.deleteModel(arg);
        if (res.result === 0) {
            modelStore.remove(arg);
        }
        return res;
    }, id, t('Delete this model? This cannot be undone.'));

    async function handleSubscriptionCheckout(modelId: string) {
        const res = await SubAPI.createModelSubscriptionCheckout({
            model_id: modelId,
            success_url: `${window.location.origin}/models?subscription=success`,
            cancel_url: `${window.location.origin}/models?subscription=cancelled`
        });
        if (res.result === 0 && (res.data?.subscribed || res.data?.reactivated)) {
            await loadData();
            return 'subscribed';
        }
        if (res.result === 0 && res.data?.url) {
            window.location.href = res.data.url;
            return 'checkout';
        }
        showError(res.msg || t('Checkout failed'));
        return 'failed';
    }

    async function offerSubscribeIfNeeded(res: any, model: Model, retry: () => Promise<void>) {
        if (!res?.data?.need_subscription) return false;
        if (!await showConfirm(
            t('This model is not subscribed yet. Do you want to subscribe?'),
            t('Subscribe'),
            'warning',
            t('Subscribe')
        )) return true;
        const outcome = await handleSubscriptionCheckout(model.model_id);
        if (outcome === 'subscribed') await retry();
        return true;
    }

    const handleUnsubscribe = (id: string) => performAction(SubAPI.cancelModelSubscription, id, t('Cancel subscription?'));

    async function handleShare(modelId: string) {
        const model = (modelStoreAny.models as Model[]).find((m) => m.model_id === modelId);
        const accounts = getResolvedModelAccounts(model);

        if (!model || accounts.length === 0) {
            showError(t('No account assigned to this model.'));
            return;
        }

        if (accounts.length === 1) {
            await handleShareWithAccount(accounts[0], model);
            return;
        }

        openModal('shareAccountSelect', model);
    }

    // Chat Management
    async function loadChats(modelId: string) {
        modalLoading = true;
        const res = await ChatAPI.getModelChats(modelId);
        managedChats = res.result === 0
            ? (res.data.chats || []).map((c) => ({
                ...c,
                id: c.chat_id,
                title: c.chat_id,
            }))
            : [];
        modalLoading = false;
    }

    async function handleRemoveChat(chat: any) {
        const model = modalData as Model | null;
        if (!model || !chat?.chat_id || !chat?.account_id) return;
        
        if (!await showConfirm(t('Remove this chat?'))) return;
        
        const res = await ChatAPI.removeChatFromModel(model.model_id, chat.chat_id, chat.account_id);
        if (res.result === 0) {
            showSuccess(t('Chat removed'));
            await loadChats(model.model_id);
        } else {
            showError(res.msg);
        }
    }

    async function handleOpenChat(chat: any) {
        // Implement logic to open chat details or navigate
        console.log('Open chat', chat);
    }

    async function handleAddAccountToChat(chatId: string) {
        console.log('Add account to chat', chatId);
    }

    async function handleRemoveAccountFromChat(data: any) {
        console.log('Remove account from chat', data);
    }
    
    // Account Management
    async function handleAddAccountSubmit(formData: any) {
        const res = await AccountAPI.addAccount(formData);
        if (res.result === 0) {
            if (res.data?.account_id) {
                accountStore.add({
                    account_id: res.data.account_id,
                    account_username: res.data.account_username,
                    name: res.data.name,
                    description: res.data.description,
                    type: res.data.type,
                    server: res.data.server,
                    is_local: res.data.is_local,
                    account_group: res.data.account_group,
                    subscription_disabled: Boolean(res.data.subscription_disabled)
                });
            } else {
                await accountStore.load();
            }
            closeModal();
            isAccountsSectionExpanded = true;
        } else {
            showError(res.msg);
        }
    }

    async function saveAccountChanges(formData: any) {
        const res = await AccountAPI.changeAccount(formData);
        if (res.result === 0) {
            accountStore.update(formData);
            // Update local modalData to reflect changes
            const updated = (accountStoreAny.accounts as Account[]).find((a) => a.account_id === formData.account_id);
            if (updated) modalData = { ...updated };
        } else {
            showError(res.msg);
        }
    }
    
    const handleRemoveAccount = (accountId: string) => performAction(async (arg: string) => {
        const res = await AccountAPI.removeAccount(arg);
        if (res.result === 0) {
            accountStore.remove(arg);
        }
        return res;
    }, accountId, t('Remove this account?'));
    
    function openModelDetails(id: string) {
        openModal('modelDetails', { model_id: id });
    }

    function saveModelChanges(data: any) {
        modelStore.update(data);
    }

    let normalModels = $derived((modelStoreAny.models as Model[]).filter((model) => !model.is_local));
    let localModels = $derived((modelStoreAny.models as Model[]).filter((model) => Boolean(model.is_local)));
    let normalAccounts = $derived((accountStoreAny.accounts as Account[]).filter((account) => !account.is_local));
    let localAccounts = $derived((accountStoreAny.accounts as Account[]).filter((account) => Boolean(account.is_local)));
</script>

{#snippet modelRow(model: Model)}
    <InfoStackItem 
        title={model.name}
        description={model.description || t('No description')}
        onclick={() => openModelDetails(model.model_id)}
    >
        {#snippet titleSuffix()}
            {#if modelHasActiveCall(model)}
                <InfoStackBadge
                    class="in-call-badge"
                    label="In call"
                    title="You have an active call with this model"
                />
            {/if}
        {/snippet}

        {#snippet actions()}
            {#if model.call_support && model.type === 'subscription'}
                <CallButton
                    active={modelHasActiveCall(model)}
                    onclick={(e: MouseEvent) => { e.stopPropagation(); void handleCallClick(model); }}
                />
            {/if}
            <OpenChatButton onclick={(e: MouseEvent) => { e.stopPropagation(); openModal('accountSelect', model); }} />
            
            <ActionMenu 
                isOpen={activeMenu === model.model_id}
                iconSize="1.5rem"
                padding="0.25rem"
                width="8rem"
                onclick={(e: MouseEvent) => handleToggleMenu({ detail: { id: model.model_id, event: e } })}
            >
                {@const deleteDisabledReason = getDeleteDisabledReason(model)}
                {#if deleteDisabledReason}
                    <MenuItem style="opacity: 0.5; cursor: not-allowed;" onclick={() => showError(deleteDisabledReason)}>{t('Delete')}</MenuItem>
                {:else}
                    <MenuItem onclick={() => handleDeleteModel(model.model_id)}>{t('Delete')}</MenuItem>
                {/if}
                
                <div style="height: 1px; background-color: var(--color-border); margin: 4px 0;"></div>
                <MenuItem onclick={() => openModal('chatManage', model)}>{t('Manage Chats')}</MenuItem>
                        
                {#if model.type !== 'token'}
                    {@const periodActive = Boolean(model.period && new Date(model.period) > new Date())}
                    {#if periodActive && model.auto_renew}
                        <MenuItem onclick={() => handleUnsubscribe(model.model_id)}>{t('Unsubscribe')}</MenuItem>
                    {:else if periodActive}
                        <MenuItem onclick={() => handleSubscriptionCheckout(model.model_id)}>{t('Resubscribe')}</MenuItem>
                    {:else}
                        <MenuItem onclick={() => handleSubscriptionCheckout(model.model_id)}>{t('Subscribe')}</MenuItem>
                    {/if}
                {/if}
                <MenuItem onclick={() => handleShare(model.model_id)}>{t('Share')}</MenuItem>
            </ActionMenu>
        {/snippet}
    </InfoStackItem>
{/snippet}

{#snippet accountRow(account: Account)}
    {@const assignedModelBadgeText = getAccountAssignedModelBadgeText(account)}
    <InfoStackItem 
        title={account.name}
        description={account.description || t('No description')}
        onclick={() => openModal('accountDetails', { ...account })}
    >
        {#snippet meta()}
            {#if assignedModelBadgeText}
                <span class="account-count-badge">{assignedModelBadgeText}</span>
            {/if}
            <div style="color: var(--color-text-secondary); font-size: 0.875rem;">
                <span>{account.account_username} · {tAccountType(account.type)} · {t('Group: {group}', { group: tStatus(account.account_group || 'free') })} · {account.subscription_disabled ? t('Disabled') : t('Active')}</span>
            </div>
        {/snippet}

        {#snippet actions()}
            <ActionMenu
                iconSize="1.25rem" padding="0.25rem"
                isOpen={activeMenu === (account.account_id ?? account.account_username)} 
                width="8rem"
                onclick={(e: MouseEvent) => handleToggleMenu({ detail: { id: account.account_id ?? account.account_username, event: e } })}
            >
                <MenuItem onclick={() => openModal('accountDetails', { ...account })}>{t('Edit')}</MenuItem>
                <MenuItem onclick={() => handleRemoveAccount(account.account_id)}>{t('Delete')}</MenuItem>
            </ActionMenu>
        {/snippet}
    </InfoStackItem>
{/snippet}

{#snippet emptyModels()}
    <div class="empty-hint">
        <p>{t('Add a prototype from Explore, then open chat')}</p>
        <Link href="/explore" className="empty-hint-link">{t('Explore')}</Link>
    </div>
{/snippet}

{#snippet emptyAccounts()}
    <div class="empty-hint">
        <p>{t('Add an account, then open chat from a model')}</p>
        <Button variant="text-button" onclick={() => openModal('addAccount')}>{t('Add account')}</Button>
    </div>
{/snippet}

<PageContainer id="page-models">
    <InfoStack 
        title="Models" 
        loading={modelStore.loading}
        empty={modelStore.models.length === 0}
        emptyText="No models found"
        emptyContent={emptyModels}
    >
        {#snippet icon()}
            <svg style="width: 1.125rem; height: 1.125rem; color: var(--color-primary);" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
        {/snippet}

        {#each normalModels as model (model.model_id)}
            {@render modelRow(model)}
        {/each}
        {#if normalModels.length > 0 && localModels.length > 0}
            <InfoStackDivider label="Local" ariaLabel="Local models" />
        {/if}
        {#each localModels as model (model.model_id)}
            {@render modelRow(model)}
        {/each}
    </InfoStack>

    <InfoStack 
        title="Accounts" 
        expanded={isAccountsSectionExpanded} 
        collapsible={true}
        loading={accountStore.loading}
        empty={accountStore.accounts.length === 0}
        emptyText="No accounts found"
        emptyContent={emptyAccounts}
        onClick={() => isAccountsSectionExpanded = !isAccountsSectionExpanded}
    >
        {#snippet icon()}
            <svg style="width: 1.125rem; height: 1.125rem; color: var(--color-primary);" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m7.875 14.25 1.214 1.942a2.25 2.25 0 0 0 1.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 0 1 1.872 1.002l.164.246a2.25 2.25 0 0 0 1.872 1.002h2.092a2.25 2.25 0 0 0 1.872-1.002l.164-.246A2.25 2.25 0 0 1 16.954 9h4.636M2.41 9a2.25 2.25 0 0 0-.16.832V12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 12V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.25 2.25 0 0 1 .382-.632l3.285-3.832a2.25 2.25 0 0 1 1.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0 0 21.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
        {/snippet}

        {#snippet headerActions()}
            <Button variant="icon-button" iconSize="1.25rem" padding="0.25rem" onclick={() => openModal('addAccount')} aria-label={t('Add account')}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            </Button>
        {/snippet}
        
        {#each normalAccounts as account (account.account_id ?? account.account_username)}
            {@render accountRow(account)}
        {/each}
        {#if normalAccounts.length > 0 && localAccounts.length > 0}
            <InfoStackDivider label="Local" ariaLabel="Local accounts" />
        {/if}
        {#each localAccounts as account (account.account_id ?? account.account_username)}
            {@render accountRow(account)}
        {/each}
    </InfoStack>

    {#if activeModal === 'accountSelect'}
        {@const selectModel = modalData as Model | null}
        <AccountSelectModal 
            accounts={getAccountSelectOptions(selectModel)}
            loading={modalLoading}
            busyAccountId={modalBusyAccountId}
            title="Select Account for Chat"
            emptyText="No accounts found"
            emptyDescription={selectModel?.is_local
                ? 'Add a local account, then open chat'
                : 'Add an account, then open chat'}
            emptyActionLabel="Add account"
            onemptyAction={() => {
                isAccountsSectionExpanded = true;
                openModal('addAccount');
            }}
            showAssignedModel={true}
            onclose={closeModal}
            onselect={handleStartChat}
        />
    {/if}

    {#if activeModal === 'shareAccountSelect'}
        <AccountSelectModal
            accounts={getResolvedModelAccounts(modalData as Model | null)}
            loading={modalLoading}
            busyAccountId={modalBusyAccountId}
            title="Select Account to Share"
            emptyText="No assigned accounts"
            emptyDescription="Assign at least one account to this model before sharing it"
            onclose={closeModal}
            onselect={handleShareWithAccount}
        />
    {/if}

    {#if activeModal === 'chatManage'}
        <ChatManagementModal 
            model={modalData}
            chats={managedChats} 
            loading={modalLoading} 
            onclose={closeModal}
            ondeleteChat={handleRemoveChat}
        />
    {/if}

    {#if activeModal === 'callManage'}
        <CallManagementModal
            model={modalData}
            sessions={managedCallSessions}
            loading={modalLoading}
            onclose={closeModal}
            onresume={handleResumeCall}
            onhangup={handleHangupCall}
        />
    {/if}

    {#if activeModal === 'addAccount'}
        <AddAccountModal 
            onclose={closeModal}
            onsubmit={handleAddAccountSubmit}
        />
    {/if}

    {#if activeModal === 'accountDetails'}
        <AccountDetailsModal 
            account={modalData}
            isEditing={isEditingAccount}
            ontoggleEdit={() => isEditingAccount = !isEditingAccount}
            onclose={closeModal}
            onsave={saveAccountChanges}
            onnavigate={openModelDetails}
        />
    {/if}

    {#if activeModal === 'modelDetails'}
        <ModelDetailsModal
            modelId={(modalData as Model | null)?.model_id}
            onclose={closeModal}
            onupdated={saveModelChanges}
        />
    {/if}
</PageContainer>

<style>
    .account-count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.125rem 0.5rem;
        border-radius: 999px;
        background: var(--color-primary-soft);
        color: var(--color-primary);
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;
    }

    :global(.info-stack-badge.in-call-badge) {
        background: var(--color-success-soft);
        color: var(--color-success-soft-text);
    }

    .empty-hint {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 0.5rem;
        text-align: center;
    }

    .empty-hint p {
        margin: 0;
        font-size: 0.875rem;
        color: color-mix(in srgb, var(--color-dark), transparent 40%);
    }

    :global(.empty-hint-link) {
        font-size: 0.875rem;
        font-weight: 500;
    }

</style>
