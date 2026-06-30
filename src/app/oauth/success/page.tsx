"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OAuthSuccessInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const success = searchParams.get("success") === "true";
    const error = searchParams.get("error");
    const provider = searchParams.get("provider") || "";
    const name = searchParams.get("name") || "";
    const email = searchParams.get("email") || "";
    const avatar = searchParams.get("avatar") || "";

    if (success) {
      setStatus("success");
      setMessage(`${provider} connected successfully!`);
    } else {
      setStatus("error");
      setMessage(error || "Authentication failed");
    }

    // Communicate with parent window and close popup
    if (typeof window !== "undefined" && window.opener) {
      window.opener.postMessage(
        {
          type: success ? "OAUTH_SUCCESS" : "OAUTH_ERROR",
          provider,
          name,
          email,
          avatar,
          error: success ? undefined : (error || "Authentication failed"),
        },
        window.location.origin
      );
      // Small delay so user sees the status
      setTimeout(() => window.close(), 800);
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {status === "loading" && (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Completing authentication...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">{message}</p>
            <p className="text-xs text-muted-foreground">Closing window...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Connection failed</p>
            <p className="text-xs text-muted-foreground">{message}</p>
            <button onClick={() => window.close()} className="text-xs underline text-muted-foreground">
              Close window
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function OAuthSuccessPage() {
  return (
    <Suspense>
      <OAuthSuccessInner />
    </Suspense>
  );
}
