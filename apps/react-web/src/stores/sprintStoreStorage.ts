import type { StateStorage } from "zustand/middleware";

const memoryStorage = new Map<string, string>();

const fallbackStorage: StateStorage = {
  getItem: (name) => memoryStorage.get(name) ?? null,
  setItem: (name, value) => {
    memoryStorage.set(name, value);
  },
  removeItem: (name) => {
    memoryStorage.delete(name);
  }
};

export function getStorage(): StateStorage {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallbackStorage;
  }
  return window.localStorage;
}
