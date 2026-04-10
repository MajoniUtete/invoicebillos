"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

type TurnstileWidgetProps = {
  onErrorChange: (message: string) => void;
  onTokenChange: (token: string) => void;
  resetKey: number;
};

export default function TurnstileWidget({
  onErrorChange,
  onTokenChange,
  resetKey,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousResetKey = useRef(resetKey);
  const [scriptReady, setScriptReady] = useState(false);
  const [widgetId, setWidgetId] = useState<string | null>(null);

  useEffect(() => {
    if (!turnstileSiteKey || !scriptReady || !containerRef.current || widgetId) {
      return;
    }

    const api = window.turnstile;
    if (!api) {
      return;
    }

    const renderedWidgetId = api.render(containerRef.current, {
      sitekey: turnstileSiteKey,
      callback: (token) => {
        onErrorChange("");
        onTokenChange(token);
      },
      "expired-callback": () => {
        onTokenChange("");
        onErrorChange("CAPTCHA expired. Please complete it again.");
      },
      "error-callback": () => {
        onTokenChange("");
        onErrorChange(
          "CAPTCHA could not be verified. Check your Turnstile settings and try again."
        );
      },
    });

    setWidgetId(renderedWidgetId);
  }, [onErrorChange, onTokenChange, scriptReady, widgetId]);

  useEffect(() => {
    if (!turnstileSiteKey || !widgetId) {
      return;
    }

    if (previousResetKey.current === resetKey) {
      return;
    }

    previousResetKey.current = resetKey;
    onTokenChange("");
    onErrorChange("");
    window.turnstile?.reset(widgetId);
  }, [onErrorChange, onTokenChange, resetKey, widgetId]);

  if (!turnstileSiteKey) {
    return null;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => {
          onErrorChange("");
          setScriptReady(true);
        }}
        onError={() => {
          onTokenChange("");
          onErrorChange(
            "CAPTCHA failed to load. Check the Turnstile site key and allowed domains."
          );
        }}
      />

      <div className="space-y-2">
        <div ref={containerRef} />
        <p className="text-xs text-slate-400">
          Protected by Cloudflare Turnstile when CAPTCHA is enabled.
        </p>
      </div>
    </>
  );
}
