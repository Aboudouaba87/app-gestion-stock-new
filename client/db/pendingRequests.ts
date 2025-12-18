// client/db/pendingRequests.ts
import { openDB } from '@/client/db/indexeddb'

export async function addPendingRequest(method: string, endpoint: string, payload: any) {
    const db = await openDB(); // ta fonction utilitaire pour IndexedDB
    const tx = db.transaction("pending_requests", "readwrite");
    tx.objectStore("pending_requests").add({
        method,
        endpoint,
        payload,
        createdAt: new Date().toISOString(),
        attempts: 0,
        lastError: null,
    });
    await new Promise((res, rej) => {
        tx.oncomplete = () => res(null);
        tx.onerror = () => rej(tx.error);
    });
}
