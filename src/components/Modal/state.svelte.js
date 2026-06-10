const initialState = {
    isOpen: false,
    title: '',
    message: '',
    type: 'info', // info, success, error, warning
    isConfirm: false,
    onConfirm: null,
    onCancel: null
};

// Use $state for reactivity
export const modalState = $state({ ...initialState });

export function showAlert(message, title = 'Notification', type = 'info') {
    return new Promise((resolve) => {
        modalState.isOpen = true;
        modalState.title = title;
        modalState.message = message;
        modalState.type = type;
        modalState.isConfirm = false;
        modalState.onConfirm = () => {
            closeModal();
            resolve(true);
        };
        modalState.onCancel = null;
    });
}

export function showConfirm(message, title = 'Confirm', type = 'warning') {
    return new Promise((resolve) => {
        modalState.isOpen = true;
        modalState.title = title;
        modalState.message = message;
        modalState.type = type;
        modalState.isConfirm = true;
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

export function showSuccess(message, title = 'Success') {
    return showAlert(message, title, 'success');
}

export function showError(message, title = 'Error') {
    return showAlert(message, title, 'error');
}

export function showWarning(message, title = 'Warning') {
    return showAlert(message, title, 'warning');
}

export function closeModal() {
    // Reset state
    Object.assign(modalState, initialState);
}
