// client/db/indexeddb.ts
export async function openDB() {
    return await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("stockpro-db", 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains("products")) db.createObjectStore("products", { keyPath: "id" });
            if (!db.objectStoreNames.contains("warehouses")) db.createObjectStore("warehouses", { keyPath: "value" }); // e.g., "north"
            if (!db.objectStoreNames.contains("clients")) db.createObjectStore("clients", { keyPath: "email" });
            if (!db.objectStoreNames.contains("sales")) db.createObjectStore("sales", { keyPath: "orderNumber" });
            if (!db.objectStoreNames.contains("pending_requests")) db.createObjectStore("pending_requests", { keyPath: "id", autoIncrement: true });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
