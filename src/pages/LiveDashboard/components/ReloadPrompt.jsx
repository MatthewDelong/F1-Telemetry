import React, { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import "./ReloadPrompt.css";

/**
 * LiveDashboard-specific ReloadPrompt — autoUpdate mode.
 * The new SW will skipWaiting + clientsClaim automatically.
 */
function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      console.log("[SW] LiveDashboard Registered:", swUrl);

      // Check for updates every 60 seconds
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 1000);
    },
    onRegisterError(error) {
      console.error("[SW] Registration error:", error);
    },
  });

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
            <span>App ready to work offline</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReloadPrompt;
