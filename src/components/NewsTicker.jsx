import React, { useState, useEffect, useRef, useMemo } from "react";
import "./NewsTicker.css";

const GPFANS_NEWS_URL = "https://www.gpfans.com/en/f1-news/";
const GPFANS_RSS_URL = "https://www.gpfans.com/en/rss.xml";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch news items. Tries the backend proxy first (local dev),
 * then falls back to allorigins API (production / static hosting).
 */
async function fetchNewsItems() {
  // Strategy 1: Backend proxy (works in local dev)
  try {
    const res = await fetch("/api/news-ticker", { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const xmlText = await res.text();
      const items = parseRSSXml(xmlText);
      if (items.length > 0) return items;
    }
  } catch {
    // Backend not available — expected on production
  }

  // Strategy 2: PHP API proxy (works on production IONOS server, bypasses CORS and 3rd party caches)
  try {
    // Append timestamp to ensure we get a fresh result if cache is flushed
    const res = await fetch(`/api.php?source=gpfans&path=rss.xml&cb=${Date.now()}`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const xmlText = await res.text();
      const items = parseRSSXml(xmlText);
      if (items.length > 0) return items;
    }
  } catch {
    // PHP proxy failed
  }

  return [];
}

/**
 * Parse RSS XML string into an array of news items.
 */
function parseRSSXml(xmlString) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");
    const itemNodes = doc.querySelectorAll("item");
    let items = Array.from(itemNodes).map((item) => ({
      title: item.querySelector("title")?.textContent?.replace(/^F1 News Today:\s*/i, "") || "",
      link: item.querySelector("link")?.textContent || "",
      pubDate: item.querySelector("pubDate")?.textContent || "",
    }));

    if (items.length > 0) {
      items[0].title = `F1 News Today: ${items[0].title}`;
    }

    return items;
  } catch {
    return [];
  }
}

/**
 * Format a date string into a relative time (e.g. "2h ago").
 */
function timeAgo(dateStr) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "";
  }
}

export const NewsTicker = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      const fetched = await fetchNewsItems();
      if (!cancelled && fetched.length > 0) {
        setItems(fetched);
      }
      if (!cancelled) setLoading(false);
    };

    doFetch();
    const interval = setInterval(doFetch, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Duplicate items for seamless infinite scroll
  const duplicatedItems = useMemo(() => [...items, ...items], [items]);

  // Dynamically set scroll duration based on number of items
  const tickerDuration = useMemo(() => {
    const basePerItem = 5; // seconds per item
    return `${Math.max(30, items.length * basePerItem)}s`;
  }, [items]);

  if (loading) {
    return (
      <div className="news-ticker" id="news-ticker">
        <a
          href={GPFANS_NEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="news-ticker__badge"
        >
          <span className="news-ticker__badge-dot" />
          F1 News
        </a>
        <div className="news-ticker__track-wrapper">
          <div className="news-ticker__loading">
            Loading latest F1 news
            <span className="news-ticker__loading-dots">
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="news-ticker" id="news-ticker">
      <a
        href={GPFANS_NEWS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="news-ticker__badge"
      >
        <span className="news-ticker__badge-dot" />
        F1 News
      </a>
      <div className="news-ticker__track-wrapper">
        <div
          className="news-ticker__track"
          ref={trackRef}
          style={{ "--ticker-duration": tickerDuration }}
        >
          {duplicatedItems.map((item, i) => (
            <React.Fragment key={`${item.link}-${i}`}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="news-ticker__item"
                title={item.title}
              >
                <span className="news-ticker__item-title">{item.title}</span>
                {item.pubDate && (
                  <span className="news-ticker__item-time">
                    {timeAgo(item.pubDate)}
                  </span>
                )}
              </a>
              {i < duplicatedItems.length - 1 && (
                <span className="news-ticker__separator">●</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;
