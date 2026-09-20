import { getUserAccountList } from '../proxy/account.js';

function groupRank(group) {
    const g = String(group || 'free').toLowerCase();
    if (g === 'free') return 0;
    if (g === 'pro') return 1;
    return 2;
}

function compareAccounts(a, b) {
    const localDiff = Number(Boolean(a?.is_local)) - Number(Boolean(b?.is_local));
    if (localDiff !== 0) return localDiff;
    const groupDiff = groupRank(a?.account_group) - groupRank(b?.account_group);
    if (groupDiff !== 0) return groupDiff;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
}

function sortAccounts(list) {
    return [...(Array.isArray(list) ? list : [])].sort(compareAccounts);
}

function createAccountStore() {
    let accounts = $state([]);
    let loading = $state(false);
    let initialized = $state(false);
    let inflight = null;

    async function load() {
        if (inflight) return inflight;
        loading = true;
        inflight = (async () => {
            try {
                const res = await getUserAccountList();
                if (res.result === 0) {
                    accounts = sortAccounts(res.data.accounts || []);
                    initialized = true;
                }
            } catch (e) {
                console.error('Failed to load accounts:', e);
            } finally {
                loading = false;
                inflight = null;
            }
        })();
        return inflight;
    }

    function add(account) {
        if (!accounts.find(a => a.account_id === account.account_id || a.account_username === account.account_username)) {
            accounts = sortAccounts([...accounts, account]);
        }
    }

    function remove(accountId) {
        accounts = accounts.filter((a) => a.account_id !== accountId);
    }

    function update(updatedAccount) {
        const idx = accounts.findIndex(a => a.account_id === updatedAccount.account_id);
        if (idx !== -1) {
            accounts = sortAccounts(accounts.map((a, i) => (i === idx ? { ...a, ...updatedAccount } : a)));
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
