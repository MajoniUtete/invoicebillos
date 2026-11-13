import assert from "node:assert/strict";
import { networkInterfaces } from "node:os";

// LAN testing must be explicitly selected and target this computer, never a
// hosted Supabase project or another machine on the network.
export function assertLocalTestOrigin(config, origin = process.env.DEV_PUBLIC_ORIGIN, interfaces = networkInterfaces()) {
  const url = new URL(config.API_URL);
  assert.equal(url.protocol, "http:");
  assert.equal(url.port, "54321");
  assert.equal(url.pathname, "/");
  assert.ok(!url.username && !url.password && !url.search && !url.hash);
  if (url.hostname === "127.0.0.1") return;
  assert.equal(config.MODE, "minimal");
  assert.equal(config.DB_CONTAINER, "invoicebillos-dev-db");
  assert.equal(origin, url.origin, "Explicit DEV_PUBLIC_ORIGIN must match the isolated backend");
  const octets = url.hostname.split(".").map(Number);
  assert.ok(octets.length === 4 && octets.every(n => Number.isInteger(n) && n >= 0 && n <= 255));
  assert.ok(octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168), "Only RFC1918 LAN addresses are permitted");
  assert.ok(Object.values(interfaces).flat().some(i => i && i.address === url.hostname && !i.internal), "Backend must run on this development computer");
}
