import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { initializeGoogleAnalytics } from "../utils/analytics";
import "./CookieBanner.css";

const GA_ID = "G-3XMEQDGZ8D";

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setIsVisible(true);
    } else if (consent === "accepted") {
      initializeGoogleAnalytics(GA_ID);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setIsVisible(false);
    initializeGoogleAnalytics(GA_ID);
  };

  const handleReject = () => {
    localStorage.setItem("cookieConsent", "rejected");
    setIsVisible(false);
  };

  if (!mounted || !isVisible) return null;

  return createPortal(
    <div className="privacy-notice-banner">
      <div className="privacy-top-row">
        <div className="privacy-content">
          <h3>We use cookies</h3>
          <p>
            This website uses cookies to ensure you get the best experience on
            our website.
          </p>
          <p className="privacy-analytics-note">
            We use Google Analytics to analyze traffic.
          </p>
        </div>
        <div className="privacy-actions">
          <button onClick={handleReject} className="privacy-btn reject">
            Reject
          </button>
          <button onClick={handleAccept} className="privacy-btn accept">
            Accept
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CookieBanner;
