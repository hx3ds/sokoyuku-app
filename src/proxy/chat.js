import { request } from '../utils.js';

export async function fetchChatHistory() {
    const data = await request('/api/get_chat_history');
    return data.result === 0 ? data.data : [];
}

export function getUserActiveChats() {
    return request('/api/get_user_active_chats');
}

export function removeChatFromUserModels(chatId) {
    return request('/api/remove_chat_from_user_models', {
        body: { chat_id: chatId }
    });
}

export function getModelChats(modelId) {
    return request('/api/get_model_chats', {
        body: { model_id: modelId }
    });
}

export function removeChatFromModel(modelId, chatId, accountId) {
    return request('/api/remove_chat_from_model', {
        body: {
            model_id: modelId,
            chat_id: chatId,
            account_id: accountId,
        },
    });
}
