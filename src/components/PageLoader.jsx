import React from "react";

/**
 * Shimmer skeleton fallback displayed while lazy-loaded route chunks stream in.
 */
export function PageLoader() {
  return (
    <div className="page-loader" aria-busy="true" aria-label="Loading page">
      <div className="page-loader__header shimmer-skeleton" />
      <div className="page-loader__hero shimmer-skeleton" />
      <div className="page-loader__grid">
        <div className="page-loader__card shimmer-skeleton" />
        <div className="page-loader__card shimmer-skeleton" />
        <div className="page-loader__card shimmer-skeleton" />
      </div>
    </div>
  );
}

