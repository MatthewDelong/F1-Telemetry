import React from "react";
import PropTypes from "prop-types";

export const F1TelemetryLogo = ({ height = 48, className = "", textImageSrc = null }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logos/header.png"
        alt="F1 Telemetry Logo"
        style={{
          height: `${height}px`,
        }}
        className="drop-shadow-md object-contain"
      />
      {textImageSrc ? (
        <img
          src={textImageSrc}
          alt="F1 Telemetry"
          style={{
            height: `${height * 1.4}px`,
            margin: `-${height * 0.2}px 0 -${height * 0.2}px -4px`,
            transform: "scaleX(1.15)",
            transformOrigin: "left center",
          }}
          className="object-contain"
        />
      ) : (
        <span
          className="font-display text-[1.8rem] sm:text-[2.2rem] font-bold uppercase tracking-widest gradient-text-electric-blue italic pr-6 text-nowrap"
          style={{ WebkitTextStroke: "0.1px white" }}
        >
          F1 TELEMETRY
        </span>
      )}
    </div>
  );
};

F1TelemetryLogo.propTypes = {
  height: PropTypes.number,
  className: PropTypes.string,
  textImageSrc: PropTypes.string,
};
