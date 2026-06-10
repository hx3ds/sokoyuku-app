import { request } from '../utils.js';

export async function fetchNotifications() {
    const data = await request('/api/get_notifications');
    return data.result === 0 ? data.data : [];
}
