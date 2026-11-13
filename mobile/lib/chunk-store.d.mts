export type SecureKeyValue = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<unknown>;
  deleteItemAsync(key: string): Promise<unknown>;
};
export function createChunkStore(
  storage: SecureKeyValue,
  randomId: () => string,
): {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
