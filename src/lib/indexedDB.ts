import { Message, Chat } from '../types/index.js';

const DB_NAME = 'SzChat_Offline_Cache';
const DB_VERSION = 1;

export class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('chatId', 'chatId', { unique: false });
        }
      };
    });
  }

  async cacheChats(chats: Chat[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    const tx = this.db.transaction('chats', 'readwrite');
    const store = tx.objectStore('chats');
    store.clear(); // Wipe deleted/stale chats from local cache
    for (const chat of chats) {
      store.put(chat);
    }
  }

  async deleteCachedChat(chatId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    try {
      const tx = this.db.transaction(['chats', 'messages'], 'readwrite');
      tx.objectStore('chats').delete(chatId);

      const msgStore = tx.objectStore('messages');
      const index = msgStore.index('chatId');
      const request = index.openCursor(IDBKeyRange.only(chatId));
      request.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (err) {
      console.warn('Failed to delete cached chat:', err);
    }
  }

  async getCachedChats(): Promise<Chat[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const tx = this.db!.transaction('chats', 'readonly');
      const store = tx.objectStore('chats');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  async cacheMessages(chatId: string, messages: Message[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    const tx = this.db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    for (const msg of messages) {
      store.put(msg);
    }
  }

  async getCachedMessages(chatId: string): Promise<Message[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const tx = this.db!.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const index = store.index('chatId');
      const request = index.getAll(chatId);

      request.onsuccess = () => {
        const msgs = request.result || [];
        msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        resolve(msgs);
      };
      request.onerror = () => resolve([]);
    });
  }
}

export const indexedDBService = new IndexedDBService();
