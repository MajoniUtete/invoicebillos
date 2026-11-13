import test from "node:test";
import assert from "node:assert/strict";
import {
  recoveryRequest,
  completeRecovery,
  recoveryRedirect,
} from "../lib/recovery.mjs";
test("accepts only the recovery deep link and refuses injected session fragments", () => {
  assert.deepEqual(recoveryRequest(`${recoveryRedirect}?code=one-time-code`), {
    code: "one-time-code",
  });
  for (const url of [
    "https://evil.test/?code=x",
    "invoicebillos-dev://evil/recovery?code=x",
    `${recoveryRedirect}?code=a&code=b`,
    `${recoveryRedirect}#access_token=x&refresh_token=y`,
    `${recoveryRedirect}?error_code=otp_expired`,
  ])
    assert.throws(() => recoveryRequest(url));
});
test("exchanges PKCE code and reports verification failure without exposing tokens", async () => {
  let code;
  assert.deepEqual(
    await completeRecovery(`${recoveryRedirect}?code=abc`, {
      exchangeCodeForSession: async (value) => {
        code = value;
        return { data: { session: { user: { id: "test" } } }, error: null };
      },
    }),
    { user: { id: "test" } },
  );
  assert.equal(code, "abc");
  await assert.rejects(
    completeRecovery(`${recoveryRedirect}?code=abc`, {
      exchangeCodeForSession: async () => ({
        error: { message: "sensitive detail" },
      }),
    }),
    /verification failed/,
  );
});
