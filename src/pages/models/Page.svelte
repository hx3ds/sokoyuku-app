<script>
    import { onMount, onDestroy } from 'svelte';
    import * as ModelAPI from '../../proxy/model.js';
    import * as AccountAPI from '../../proxy/account.js';
    import * as SubAPI from '../../proxy/subscription.js';
    import * as ChatAPI from '../../proxy/chat.js';
    import { showConfirm, showError, showSuccess } from '../../components/Modal/state.svelte.js';
    import { modelStore } from '../../store/models.svelte.js';
    import { accountStore } from '../../store/accounts.svelte.js';

    
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

    let activeMenu = $state(null);
    
    // UI State
    let activeModal = $state(null); // 'accountSelect', 'chatManage', 'addAccount', 'accountDetails'
    let modalData = $state(null);
    let modalLoading = $state(false);
    let modalBusyAccountId = $state(null);
    let isEditingAccount = $state(false);
    let managedChats = $state([]);
    let isAccountsSectionExpanded = $state(false);

    import PageContainer from '../../components/PageContainer.svelte';

    onMount(async () => {
        await loadData();
        document.addEventListener('click', closeMenu);
    });

    onDestroy(() => document.removeEventListener('click', closeMenu));

    const formatDate = d => d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

    function getDeleteDisabledReason(model) {
        if (model.stripe_subscription_id && !['canceled', 'incomplete_expired'].includes(model.subscription_status)) {
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

    const closeMenu = () => activeMenu = null;
    
    function handleToggleMenu(event) {
        const { id, event: e } = event.detail;
        e.stopPropagation();
        activeMenu = activeMenu === id ? null : id;
    }

    // Generic Action Helper
    async function performAction(actionFn, arg, confirmMsg = null) {
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
    const openModal = (type, data = null) => {
        activeModal = type;
        modalData = data;
        modalLoading = false;
        modalBusyAccountId = null;
        isEditingAccount = false;
        managedChats = [];
        
        if (type === 'chatManage' && data) loadChats(data.model_id);
    };
    
    const closeModal = () => {
        activeModal = null;
        modalData = null;
        modalBusyAccountId = null;
        isEditingAccount = false;
    };

    function normalizeId(id) {
        return typeof id === 'string' ? id.replace(/-/g, '') : id;
    }

    function buildTelegramStartLink(accountUsername, modelId, otp) {
        const username = String(accountUsername || '').replace(/^@/, '').trim();
        if (!username) return null;
        const start = `${normalizeId(modelId)}${String(otp)}`;
        return `https://t.me/${username}?start=${start}`;
    }

    async function copyTextToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    }

    // Chat Logic
    async function handleStartChat(account) {
        const model = modalData; // from 'accountSelect'
        if (!model || !account) return;
        if (modalLoading) return;

        const accountId = account.account_id;
        const existingModel = modelStore.models.find(m => m.account_id === accountId);
        if (existingModel && existingModel.model_id !== model.model_id) {
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

        const link = res.data?.link || buildTelegramStartLink(account.account_username, model.model_id, res.data?.otp);
        if (link) {
            window.open(link, '_blank');
            closeModal();
            await loadData();
            return;
        }

        if (res.data?.otp) {
            const copied = await copyTextToClipboard(String(res.data.otp));
            if (!copied) {
                prompt('Copy OTP:', String(res.data.otp));
            } else {
                showSuccess('OTP copied!');
            }
            closeModal();
            await loadData();
            return;
        }

        showError(res.msg || 'Failed to start chat');
    }

    // Model Actions
    const handleDeleteModel = (id) => performAction(async (arg) => {
        const res = await ModelAPI.deleteModel(arg);
        if (res.result === 0) {
            modelStore.remove(arg);
        }
        return res;
    }, id, 'Delete this model? This cannot be undone.');

    // Subscription
    async function handleSubscriptionCheckout(modelId) {
        const res = await SubAPI.createModelSubscriptionCheckout({
            model_id: modelId,
            success_url: `${window.location.origin}/models?subscription=success`,
            cancel_url: `${window.location.origin}/models?subscription=cancelled`
        });
        if (res.result === 0 && res.data?.url) window.location.href = res.data.url;
        else showError(res.msg || 'Checkout failed');
    }

    const handleUnsubscribe = (id) => performAction(SubAPI.cancelModelSubscription, id, 'Cancel subscription?');

    async function handleShare(modelId) {
        const model = modelStore.models.find(m => m.model_id === modelId);
        const accountId = model?.account_id;
        const account = accountStore.accounts?.find(a => a.account_id === accountId);

        if (!accountId) return showError('No account assigned to this model.');

        const res = await AccountAPI.requestOtpForChat(accountId, modelId);
        if (res.result !== 0) {
            showError(res.msg || 'Share failed');
            return;
        }

        const link = res.data?.link || buildTelegramStartLink(account?.account_username, modelId, res.data?.otp);
        if (link) {
            const copied = await copyTextToClipboard(link);
            if (!copied) {
                prompt('Copy link:', link);
            } else {
                showSuccess('Link copied!');
            }
            return;
        }

        if (res.data?.otp) {
            const otp = String(res.data.otp);
            const copied = await copyTextToClipboard(otp);
            if (!copied) {
                prompt('Copy OTP:', otp);
            } else {
                showSuccess('OTP copied!');
            }
            return;
        }

        showError(res.msg || 'Share failed');
    }

    // Chat Management
    async function loadChats(modelId) {
        modalLoading = true;
        const res = await ChatAPI.getModelChats(modelId);
        managedChats = res.result === 0 ? (res.data.chats || []) : [];
        modalLoading = false;
    }

    async function handleRemoveChat(chatId) {
        if (!modalData) return;
        
        if (!await showConfirm('Remove this chat?')) return;
        
        const res = await ChatAPI.removeChatFromModel(modalData.model_id, chatId);
        if (res.result === 0) {
            showSuccess('Chat removed');
            await loadChats(modalData.model_id);
        } else {
            showError(res.msg);
        }
    }

    async function handleOpenChat(chat) {
        // Implement logic to open chat details or navigate
        console.log('Open chat', chat);
    }

    async function handleAddAccountToChat(chatId) {
        console.log('Add account to chat', chatId);
    }

    async function handleRemoveAccountFromChat(data) {
        console.log('Remove account from chat', data);
    }
    
    // Account Management
    async function handleAddAccountSubmit(formData) {
        const res = await AccountAPI.addAccount(formData);
        if (res.result === 0) {
            if (res.data?.account_id) {
                accountStore.add({
                    account_id: res.data.account_id,
                    account_username: res.data.account_username,
                    name: res.data.name,
                    description: res.data.description,
                    type: res.data.type,
                    server: res.data.server
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

    async function saveAccountChanges(formData) {
        const res = await AccountAPI.changeAccount(formData);
        if (res.result === 0) {
            accountStore.update(formData);
            // Update local modalData to reflect changes
            const updated = accountStore.accounts.find(a => a.account_id === formData.account_id);
            if (updated) modalData = { ...updated };
        } else {
            showError(res.msg);
        }
    }
    
    const handleRemoveAccount = (accountId) => performAction(async (arg) => {
        const res = await AccountAPI.removeAccount(arg);
        if (res.result === 0) {
            accountStore.remove(arg);
        }
        return res;
    }, accountId, 'Remove this account?');
    
    function navigateToModel(id) {
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
        {#each modelStore.models as model (model.model_id)}
            <InfoStackItem 
                title={model.name}
                description={model.description || 'No description'}
                onclick={() => navigateToModel(model.model_id)}
            >
                
                {#snippet actions()}
                    <OpenChatButton onclick={(e) => { e.stopPropagation(); openModal('accountSelect', model); }} />
                    
                    <ActionMenu 
                        isOpen={activeMenu === model.model_id}
                        iconSize="1.5rem"
                        padding="0.25rem"
                        width="8rem"
                        onclick={(e) => handleToggleMenu({ detail: { id: model.model_id, event: e } })}
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
        {#snippet headerActions()}
            <Button variant="icon-button" iconSize="1.25rem" padding="0.25rem" onclick={() => openModal('addAccount')} aria-label="Add account">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            </Button>
        {/snippet}
        
        {#each accountStore.accounts as account (account.account_id ?? account.account_username)}
            <InfoStackItem 
                title={account.name}
                description={account.description || 'No description'}
                onclick={() => openModal('accountDetails', { ...account })}
            >
                {#snippet meta()}
                    <div style="color: #586069; font-size: 0.875rem;">
                        <span>@{account.account_username}</span>
                    </div>
                {/snippet}

                {#snippet actions()}
                    <ActionMenu
                        iconSize="1.25rem" padding="0.25rem"
                        isOpen={activeMenu === (account.account_id ?? account.account_username)} 
                        width="8rem"
                        onclick={(e) => handleToggleMenu({ detail: { id: account.account_id ?? account.account_username, event: e } })}
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
            accounts={accountStore.accounts} 
            loading={modalLoading}
            busyAccountId={modalBusyAccountId}
            onclose={closeModal}
            onselect={handleStartChat}
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
