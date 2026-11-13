/** Crash-safe pointer commit over a native secure key/value store. */
export function createChunkStore(storage, randomId) {
  const queues = new Map();
  const serial = (key, task) => {
    const next = (queues.get(key) || Promise.resolve())
      .catch(() => {})
      .then(task);
    queues.set(key, next);
    void next
      .finally(() => {
        if (queues.get(key) === next) queues.delete(key);
      })
      .catch(() => {});
    return next;
  };
  const keyFor = (key) => {
    if (!/^[\w.-]+$/.test(key)) throw new Error("Invalid storage key");
    return `invoicebillos.${key}`;
  };
  async function manifest(key) {
    const raw = await storage.getItemAsync(key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (
      !/^[\w-]+$/.test(value.generation) ||
      !Number.isInteger(value.count) ||
      value.count < 1 ||
      value.count > 200
    )
      throw new Error("Invalid secure storage manifest");
    return value;
  }
  async function clean(key, current) {
    if (current)
      await Promise.all(
        Array.from({ length: current.count }, (_, i) =>
          storage.deleteItemAsync(`${key}.${current.generation}.${i}`),
        ),
      );
  }
  return {
    getItem: (key) =>
      serial(key, async () => {
        const base = keyFor(key),
          current = await manifest(base);
        if (!current) return null;
        const chunks = await Promise.all(
          Array.from({ length: current.count }, (_, i) =>
            storage.getItemAsync(`${base}.${current.generation}.${i}`),
          ),
        );
        if (chunks.some((chunk) => chunk === null))
          throw new Error("Secure data is incomplete");
        return chunks.join("");
      }),
    setItem: (key, value) =>
      serial(key, async () => {
        if (typeof value !== "string" || value.length > 64000)
          throw new Error("Secure record exceeds 64,000 characters");
        const base = keyFor(key),
          old = await manifest(base),
          generation = randomId();
        const characters = Array.from(value),
          chunks = [];
        for (let i = 0; i < characters.length; i += 400)
          chunks.push(characters.slice(i, i + 400).join(""));
        if (!chunks.length) chunks.push("");
        try {
          for (let i = 0; i < chunks.length; i++)
            await storage.setItemAsync(`${base}.${generation}.${i}`, chunks[i]);
          await storage.setItemAsync(
            base,
            JSON.stringify({ generation, count: chunks.length }),
          );
        } catch (error) {
          await clean(base, { generation, count: chunks.length }).catch(
            () => {},
          );
          throw error;
        }
        await clean(base, old).catch(() => {});
      }),
    removeItem: (key) =>
      serial(key, async () => {
        const base = keyFor(key),
          current = await manifest(base);
        await storage.deleteItemAsync(base);
        await clean(base, current).catch(() => {});
      }),
  };
}
