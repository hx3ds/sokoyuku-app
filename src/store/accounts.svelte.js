import { getUserAccountList } from '../proxy/account.js';

function createAccountStore() {
    let accounts = $state([]);
    let loading = $state(false);
    let initialized = $state(false);

    async function load() {
        if (loading) return;
        loading = true;
        try {
            const res = await getUserAccountList();
            if (res.result === 0) {
                accounts = res.data.accounts || [];
                initialized = true;
            }
        } catch (e) {
            console.error('Failed to load accounts:', e);
        } finally {
            loading = false;
        }
    }

    function add(account) {
        if (!accounts.find(a => a.account_id === account.account_id || a.account_username === account.account_username)) {
            accounts.push(account);
        }
    }

    function remove(accountId) {
        const idx = accounts.findIndex(a => a.account_id === accountId);
        if (idx !== -1) {
            accounts.splice(idx, 1);
        }
    }

    function update(updatedAccount) {
        const idx = accounts.findIndex(a => a.account_id === updatedAccount.account_id);
        if (idx !== -1) {
            accounts[idx] = { ...accounts[idx], ...updatedAccount };
        }
    }

    return {
        get accounts() { return accounts },
        get loading() { return loading },
        get initialized() { return initialized },
        load,
        add,
        remove,
        update
    };
}

export const accountStore = createAccountStore();
