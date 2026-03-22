import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export interface Notification {
  id: number;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  reference_type?: string;
  reference_id?: number;
}

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<Notification[]>([]);
  const unreadCount = ref(0);

  async function fetch() {
    try {
      const { data } = await axios.get('/api/notifications');
      items.value = data;
      unreadCount.value = data.filter((n: Notification) => !n.is_read).length;
    } catch { /* silent */ }
  }

  async function markRead(id: number) {
    await axios.patch(`/api/notifications/${id}/read`);
    const n = items.value.find(x => x.id === id);
    if (n) { n.is_read = true; unreadCount.value = Math.max(0, unreadCount.value - 1); }
  }

  return { items, unreadCount, fetch, markRead };
});
