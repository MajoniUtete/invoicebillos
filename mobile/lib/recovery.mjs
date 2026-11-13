export const recoveryRedirect = "invoicebillos-dev://auth/recovery";
export function recoveryRequest(url) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "invoicebillos-dev:" ||
    parsed.host !== "auth" ||
    parsed.pathname !== "/recovery" ||
    parsed.hash
  )
    throw new Error("Invalid recovery link. Request a new email.");
  const params = parsed.searchParams;
  if (params.has("error") || params.has("error_code"))
    throw new Error(
      "Recovery link expired or was rejected. Request a new email.",
    );
  if (
    params.getAll("code").length === 1 &&
    params.get("code") &&
    !params.has("token_hash")
  )
    return { code: params.get("code") };
  if (
    params.getAll("token_hash").length === 1 &&
    params.get("token_hash") &&
    params.get("type") === "recovery" &&
    !params.has("code")
  )
    return { token_hash: params.get("token_hash"), type: "recovery" };
  throw new Error(
    "Recovery link is incomplete. Open it on the device that requested it.",
  );
}
export async function completeRecovery(url, auth) {
  const request = recoveryRequest(url);
  const result =
    "code" in request
      ? await auth.exchangeCodeForSession(request.code)
      : await auth.verifyOtp(request);
  if (result.error)
    throw new Error(
      "Recovery verification failed. Request a new email on this device.",
    );
  return result.data.session;
}
