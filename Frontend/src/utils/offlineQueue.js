import localforage from "localforage";

localforage.config({
  name: "CollabFlow",
  storeName: "offline_operations_queue",
});

export const enqueueOperation = async (operation) => {
  try {
    const queue = (await localforage.getItem("offline_queue")) || [];
    queue.push({
      ...operation,
      timestamp: Date.now(),
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    });
    await localforage.setItem("offline_queue", queue);
  } catch (error) {
    console.error("Failed to enqueue offline operation", error);
  }
};

export const getOfflineQueue = async () => {
  try {
    return (await localforage.getItem("offline_queue")) || [];
  } catch (error) {
    console.error("Failed to get offline queue", error);
    return [];
  }
};

export const clearOfflineQueue = async () => {
  try {
    await localforage.removeItem("offline_queue");
  } catch (error) {
    console.error("Failed to clear offline queue", error);
  }
};
