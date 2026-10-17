import { request } from '../utils.js';

export function getModelChats(modelId) {
    return request('/api/get_model_chats', {
        body: { model_id: modelId ?? '' }
    });
}

export function removeChatFromModel(modelId, chatId, accountId) {
    return request('/api/remove_chat_from_model', {
        body: {
            model_id: modelId ?? '',
            chat_id: chatId ?? '',
            account_id: accountId ?? '',
        },
    });
}
