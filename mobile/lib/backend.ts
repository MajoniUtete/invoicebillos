import { AppState } from "react-native";
import { createClient, processLock } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import { createChunkStore } from "./chunk-store.mjs";

export const secureStorage = createChunkStore(
  {
    getItemAsync: (key: string) => SecureStore.getItemAsync(key),
    setItemAsync: (key: string, value: string) =>
      SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    deleteItemAsync: (key: string) => SecureStore.deleteItemAsync(key),
  },
  randomUUID,
);
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key)
  throw new Error(
    "Set the development Supabase URL and publishable key in mobile/.env",
  );
if (key.startsWith("sb_secret_"))
  throw new Error("A server secret cannot be used in a mobile application");
export const supabase = createClient(url, key, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
