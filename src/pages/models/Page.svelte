<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import * as ModelAPI from '../../proxy/model.js';
    import * as AccountAPI from '../../proxy/account.js';
    import * as SubAPI from '../../proxy/subscription.js';
    import * as ChatAPI from '../../proxy/chat.js';
    import { showConfirm, showError, showSuccess } from '../../components/Modal/state.svelte.js';
    import { modelStore } from '../../store/models.svelte.js';
    import { accountStore } from '../../store/accounts.svelte.js';

    import PageContainer from '../../components/PageContainer.svelte';
    import InfoStack from '../../components/InfoStack/InfoStack.svelte';
    import InfoStackItem from '../../components/InfoStack/InfoStackItem.svelte';
    import ActionMenu from '../../components/Button/ActionMenu.svelte';
    import MenuItem from '../../components/Button/MenuItem.svelte';
    import Button from '../../components/Button/Button.svelte';
    import OpenChatButton from '../../components/Button/OpenChatButton.svelte';
    import AccountSelectModal from '../../components/Modal/AccountSelectModal.svelte';
    import ChatManagementModal from '../../components/Modal/ChatManagementModal.svelte';
    import AddAccountModal from '../../components/Modal/AddAccountModal.svelte';
    import AccountDetailsModal from '../../components/Modal/AccountDetailsModal.svelte';

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
        period?: string | null;
        auto_renew?: boolean | null;
        stripe_subscription_id?: string | null;
        subscription_status?: string | null;
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
        created_at?: string | null;
        models?: Array<{ model_id: string; name: string }>;
        assignedModelName?: string;
        assignedModelStatus?: 'current' | 'other';
    };

    type ModalType = 'accountSelect' | 'shareAccountSelect' | 'chatManage' | 'addAccount' | 'accountDetails' | null;

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

    onMount(async () => {
        await loadData();
        document.addEventListener('click', closeMenu);
    });

    onDestroy(() => document.removeEventListener('click', closeMenu));

    const formatDate = (d: string | null | undefined) =>
        d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

    function getDeleteDisabledReason(model: Model) {
        if (model.stripe_subscription_id && !['canceled', 'incomplete_expired'].includes(model.subscription_status || '')) {
            return 'Cannot delete model with active subscription. Please unsubscribe first.';
        }
        if (model.period && new Date(model.period) > new Date()) {
            // Token models can be deleted even if they have available time
            if (model.type === 'token') {
                return null;
            }
            return 'Cannot delete model while it is still available.';
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
            showError('Operation failed: ' + (res.msg || 'Unknown error'));
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
        
        if (type === 'chatManage' && data?.model_id) loadChats(String(data.model_id));
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

    function getAssignedAccountCount(model: Model | null | undefined): number {
        return getModelAccounts(model).length;
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
        return (accountStoreAny.accounts as Account[]).map((account) => {
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
            return `In ${assignedModels[0].name}`;
        }
        return `In ${assignedModels[0].name} +${assignedModels.length - 1}`;
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
            if (!await showConfirm(`Account "${account.account_username}" is used by "${existingModel.name}". Reassign?`)) return;
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
            showError(res.msg || 'Failed to start chat');
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
                prompt('Copy start command:', startCmd);
            } else {
                showSuccess('Start command copied!');
            }
            closeModal();
            await loadData();
            return;
        }

        showError(res.msg || 'Failed to start chat');
    }

    async function handleShareWithAccount(account: Account, modelArg: Model | null = modalData as Model | null) {
        const model = modelArg;
        if (!model || !account) return;

        const res = await AccountAPI.requestOtpForChat(account.account_id, model.model_id);
        if (res.result !== 0) {
            showError(res.msg || 'Share failed');
            return;
        }

        const link = buildOpenChatLink(account, model.model_id, res.data?.otp, res.data?.link);
        if (link) {
            const copied = await copyTextToClipboard(link);
            if (!copied) {
                prompt('Copy link:', link);
            } else {
                showSuccess('Link copied!');
            }
            closeModal();
            await loadData();
            return;
        }

        if (res.data?.otp) {
            const startCmd = buildStartCommand(model.model_id, res.data.otp);
            const copied = await copyTextToClipboard(startCmd);
            if (!copied) {
                prompt('Copy start command:', startCmd);
            } else {
                showSuccess('Start command copied!');
            }
            closeModal();
            await loadData();
            return;
        }

        showError(res.msg || 'Share failed');
    }

    // Model Actions
    const handleDeleteModel = (id: string) => performAction(async (arg: string) => {
        const res = await ModelAPI.deleteModel(arg);
        if (res.result === 0) {
            modelStore.remove(arg);
        }
        return res;
    }, id, 'Delete this model? This cannot be undone.');

    // Subscription
    async function handleSubscriptionCheckout(modelId: string) {
        const res = await SubAPI.createModelSubscriptionCheckout({
            model_id: modelId,
            success_url: `${window.location.origin}/models?subscription=success`,
            cancel_url: `${window.location.origin}/models?subscription=cancelled`
        });
        if (res.result === 0 && res.data?.url) window.location.href = res.data.url;
        else showError(res.msg || 'Checkout failed');
    }

    const handleUnsubscribe = (id: string) => performAction(SubAPI.cancelModelSubscription, id, 'Cancel subscription?');

    async function handleShare(modelId: string) {
        const model = (modelStoreAny.models as Model[]).find((m) => m.model_id === modelId);
        const accounts = getResolvedModelAccounts(model);

        if (!model || accounts.length === 0) {
            showError('No account assigned to this model.');
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
        
        if (!await showConfirm('Remove this chat?')) return;
        
        const res = await ChatAPI.removeChatFromModel(model.model_id, chat.chat_id, chat.account_id);
        if (res.result === 0) {
            showSuccess('Chat removed');
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
                    is_local: res.data.is_local
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
    }, accountId, 'Remove this account?');
    
    function navigateToModel(id: string) {
        history.pushState(null, '', `/model/${id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }
</script>

<PageContainer id="page-models">
    <!-- Models List -->
    <InfoStack 
        title="Models" 
        loading={modelStore.loading}
        empty={modelStore.models.length === 0}
        emptyText="No models found"
    >
        {#snippet icon()}
            <svg style="width: 1.125rem; height: 1.125rem; color: var(--color-primary);" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
        {/snippet}

        {#each modelStore.models as model (model.model_id)}
            <InfoStackItem 
                title={model.name}
                description={model.description || 'No description'}
                onclick={() => navigateToModel(model.model_id)}
            >
                {#snippet titleSuffix()}
                    <span class="account-count-badge">
                        {getAssignedAccountCount(model)} {getAssignedAccountCount(model) === 1 ? 'account' : 'accounts'}
                    </span>
                {/snippet}

                {#snippet actions()}
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
                            <MenuItem style="opacity: 0.5; cursor: not-allowed;" onclick={() => showError(deleteDisabledReason)}>Delete</MenuItem>
                        {:else}
                            <MenuItem onclick={() => handleDeleteModel(model.model_id)}>Delete</MenuItem>
                        {/if}
                        
                        <div style="height: 1px; background-color: #e1e4e8; margin: 4px 0;"></div>
                        <MenuItem onclick={() => openModal('chatManage', model)}>Manage Chats</MenuItem>
                                
                        {#if model.type !== 'token'}
                            {#if !model.stripe_subscription_id || ['canceled', 'incomplete_expired', 'unpaid', 'paused'].includes(model.subscription_status)}
                                <MenuItem onclick={() => handleSubscriptionCheckout(model.model_id)}>Subscribe</MenuItem>
                            {:else if model.auto_renew}
                                <MenuItem onclick={() => handleUnsubscribe(model.model_id)}>Unsubscribe</MenuItem>
                            {:else}
                                <MenuItem onclick={() => handleSubscriptionCheckout(model.model_id)}>Resubscribe</MenuItem>
                            {/if}
                        {/if}
                        <MenuItem onclick={() => handleShare(model.model_id)}>Share</MenuItem>
                    </ActionMenu>
                {/snippet}
            </InfoStackItem>
        {/each}
    </InfoStack>

    <InfoStack 
        title="Accounts" 
        expanded={isAccountsSectionExpanded} 
        collapsible={true}
        loading={accountStore.loading}
        empty={accountStore.accounts.length === 0}
        emptyText="No accounts found"
        onClick={() => isAccountsSectionExpanded = !isAccountsSectionExpanded}
    >
        {#snippet icon()}
            <svg style="width: 1.125rem; height: 1.125rem; color: var(--color-primary);" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m7.875 14.25 1.214 1.942a2.25 2.25 0 0 0 1.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 0 1 1.872 1.002l.164.246a2.25 2.25 0 0 0 1.872 1.002h2.092a2.25 2.25 0 0 0 1.872-1.002l.164-.246A2.25 2.25 0 0 1 16.954 9h4.636M2.41 9a2.25 2.25 0 0 0-.16.832V12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 12V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.25 2.25 0 0 1 .382-.632l3.285-3.832a2.25 2.25 0 0 1 1.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0 0 21.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
        {/snippet}

        {#snippet headerActions()}
            <Button variant="icon-button" iconSize="1.25rem" padding="0.25rem" onclick={() => openModal('addAccount')} aria-label="Add account">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            </Button>
        {/snippet}
        
        {#each accountStore.accounts as account (account.account_id ?? account.account_username)}
            {@const assignedModelBadgeText = getAccountAssignedModelBadgeText(account)}
            <InfoStackItem 
                title={account.name}
                description={account.description || 'No description'}
                onclick={() => openModal('accountDetails', { ...account })}
            >
                {#snippet titleSuffix()}
                    {#if assignedModelBadgeText}
                        <span class="account-count-badge">{assignedModelBadgeText}</span>
                    {/if}
                {/snippet}

                {#snippet meta()}
                    <div style="color: #586069; font-size: 0.875rem;">
                        <span>{account.type === 'discord' ? account.account_username : `@${account.account_username}`} · Group: {account.account_group || 'free'}</span>
                    </div>
                {/snippet}

                {#snippet actions()}
                    <ActionMenu
                        iconSize="1.25rem" padding="0.25rem"
                        isOpen={activeMenu === (account.account_id ?? account.account_username)} 
                        width="8rem"
                        onclick={(e: MouseEvent) => handleToggleMenu({ detail: { id: account.account_id ?? account.account_username, event: e } })}
                    >
                        <MenuItem onclick={() => openModal('accountDetails', { ...account })}>Edit</MenuItem>
                        <MenuItem onclick={() => handleRemoveAccount(account.account_id)}>Delete</MenuItem>
                    </ActionMenu>
                {/snippet}
            </InfoStackItem>
        {/each}
    </InfoStack>

    {#if activeModal === 'accountSelect'}
        <AccountSelectModal 
            accounts={getAccountSelectOptions(modalData as Model | null)}
            loading={modalLoading}
            busyAccountId={modalBusyAccountId}
            title="Select Account for Chat"
            emptyText="No accounts found"
            emptyDescription="Create an account first to assign it to this model"
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
            onnavigate={navigateToModel}
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
        background: #eef2ff;
        color: #4338ca;
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;
    }
</style>
