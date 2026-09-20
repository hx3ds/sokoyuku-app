import { t } from '../../i18n/locale.svelte.js';

const initialState = {
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    isConfirm: false,
    confirmLabel: 'OK',
    onConfirm: null,
    onCancel: null
};

export const modalState = $state({ ...initialState });

export function showAlert(message, title, type = 'info') {
    return new Promise((resolve) => {
        modalState.isOpen = true;
        modalState.title = title || t('Notification');
        modalState.message = message;
        modalState.type = type;
        modalState.isConfirm = false;
        modalState.confirmLabel = t('OK');
        modalState.onConfirm = () => {
            closeModal();
            resolve(true);
        };
        modalState.onCancel = null;
    });
}

export function showConfirm(message, title, type = 'warning', confirmLabel) {
    return new Promise((resolve) => {
        modalState.isOpen = true;
        modalState.title = title || t('Confirm');
        modalState.message = message;
        modalState.type = type;
        modalState.isConfirm = true;
        modalState.confirmLabel = confirmLabel || t('OK');
        modalState.onConfirm = () => {
            closeModal();
            resolve(true);
        };
        modalState.onCancel = () => {
            closeModal();
            resolve(false);
        };
    });
}

export function showSuccess(message, title) {
    return showAlert(message, title || t('Success'), 'success');
}

export function showError(message, title) {
    return showAlert(message, title || t('Error'), 'error');
}

export function showWarning(message, title) {
    return showAlert(message, title || t('Warning'), 'warning');
}

export function closeModal() {
    // Reset state
    Object.assign(modalState, initialState);
}
