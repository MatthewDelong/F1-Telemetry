import React, { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import "./ReloadPrompt.css";

/**
 * With registerType: "autoUpdate", the new service worker automatically
 * calls skipWaiting + clientsClaim and reloads the page.
 *
 * This component still registers the SW and handles:
 * - Periodic update checks (every 60s + on tab focus)
 * - Logging when a new version is detected
 * - Showing a brief "Updating…" toast before automatic reload
 */
function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      console.log("[SW] Registered:", swUrl);

      // Periodic update check — every 60 seconds
      const intervalId = setInterval(() => {
        console.log("[SW] Checking for updates…");
        registration.update().catch((err) => {
          if (err.name !== "InvalidStateError") {
            console.error("[SW] Periodic update error:", err);
          }
        });
      }, 60 * 1000);

      // Also check when the user switches back to this tab
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          registration.update().catch(() => {});
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Cleanup (won't fire unless component unmounts, but good practice)
      return () => {
        clearInterval(intervalId);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      };
    },
    onRegisterError(error) {
      console.error("[SW] Registration error:", error);
    },
  });

  // When needRefresh fires with autoUpdate, the reload will happen
  // automatically. We just log it.
  useEffect(() => {
    if (needRefresh) {
      console.log("[SW] New version available — auto-updating…");
    }
  }, [needRefresh]);

  // Brief offline-ready toast, auto-dismiss after 3 seconds
  useEffect(() => {
    if (offlineReady) {
      const timer = setTimeout(() => setOfflineReady(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [offlineReady, setOfflineReady]);

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="ReloadPrompt-container">
      <div className="ReloadPrompt-toast">
        <div className="ReloadPrompt-message">
          {needRefresh ? (
            <span>Updating to the latest version…</span>
          ) : (
            <span>App is ready to work offline.</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReloadPrompt;
