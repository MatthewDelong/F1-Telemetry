import React from "react";
import classNames from "classnames";
import "./Loading.scss";

export const Loading = ({ className, message }) => {
  return (
    <div className={classNames("loading-screen-overlay", className)}>
      <div className="f1-dash-container">
        <div className="shift-lights">
          <div className="led green"></div>
          <div className="led green"></div>
          <div className="led red"></div>
          <div className="led red"></div>
          <div className="led red"></div>
          <div className="led blue"></div>
          <div className="led blue"></div>
        </div>

        <div className="main-display">
          <div className="side-metrics">
            <div className="metric">
              <span>ERS</span>
              <div className="bar-fill ers-bar"></div>
            </div>
            <div className="metric">
              <span>FUEL</span>
              <div className="bar-fill fuel-bar"></div>
            </div>
          </div>

          <div className="center-gear">
            <div className="gear-box"></div>
            <div className="dash-title">
              {message ? message.toUpperCase() : "F1-TELEMETRY"}
            </div>
          </div>

          <div className="side-metrics">
            <div className="metric">
              <span>LAP</span>
              <strong>24</strong>
            </div>
            <div className="metric">
              <span>INT</span>
              <strong>+1.2</strong>
            </div>
          </div>
        </div>

        <div className="data-stream">
          <span className="stream-text">DOWNLOADING DATA PACKETS...</span>
        </div>
      </div>
    </div>
  );
};
