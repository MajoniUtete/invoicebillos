import test from "node:test";
import assert from "node:assert/strict";
import { createChunkStore } from "../lib/chunk-store.mjs";
function fixture() {
  const data = new Map();
  let i = 0;
  const storage = {
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => data.set(key, value),
    deleteItemAsync: async (key) => data.delete(key),
  };
  return {
    data,
    storage,
    store: createChunkStore(storage, () => `generation-${++i}`),
  };
}
test("round trips Unicode, chunks within native keychain limits, and isolates accounts", async () => {
  const { data, store } = fixture();
  const raw = JSON.stringify({ notes: "🔐".repeat(1800) });
  await store.setItem("draft.user-a", raw);
  await store.setItem("draft.user-b", "different");
  assert.equal(await store.getItem("draft.user-a"), raw);
  assert.equal(await store.getItem("draft.user-b"), "different");
  for (const value of data.values())
    assert.ok(Buffer.byteLength(value, "utf8") < 2048);
  await store.removeItem("draft.user-a");
  assert.equal(await store.getItem("draft.user-a"), null);
  assert.equal(await store.getItem("draft.user-b"), "different");
});
test("interrupted chunk write preserves last committed draft", async () => {
  const { storage, store } = fixture();
  await store.setItem("draft.a", "original");
  const set = storage.setItemAsync;
  storage.setItemAsync = async (key, value) => {
    if (key.endsWith(".1")) throw new Error("device interrupted");
    return set(key, value);
  };
  await assert.rejects(store.setItem("draft.a", "x".repeat(1200)));
  assert.equal(await store.getItem("draft.a"), "original");
});
test("serializes concurrent saves and rejects incomplete records", async () => {
  const { data, store } = fixture();
  await Promise.all([
    store.setItem("session", "first"),
    store.setItem("session", "second"),
  ]);
  assert.equal(await store.getItem("session"), "second");
  const key = [...data.keys()].find((key) => key.endsWith(".0"));
  data.delete(key);
  await assert.rejects(store.getItem("session"), /incomplete/);
});
