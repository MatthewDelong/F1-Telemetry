import React, { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import "./RaceHud.scss";

const SEGMENTS = 40;
const RPM_MAX = 15000;

/* ─── Segmented bar (RPM / Throttle / Brake) ─── */
const SegmentBar = ({ percent, variant = "green" }) => {
  const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * SEGMENTS);
  return (
    <div className="race-hud__segments">
      {Array.from({ length: SEGMENTS }).map((_, i) => (
        <span
          key={i}
          className={classNames("race-hud__segment", {
            [`race-hud__segment--${variant}`]: i < filled,
          })}
        />
      ))}
    </div>
  );
};

/* ─── Upward-opening dropdown ─── */
const HudDropdown = ({ id, label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) || options[0];

  return (
    <div className="race-hud__dropdown" ref={ref}>
      <button
        id={id}
        type="button"
        className={classNames("race-hud__dropdown-btn", {
          "race-hud__dropdown-btn--open": open,
        })}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="race-hud__dropdown-text">
          <span className="race-hud__label">{label}</span>
          <span className="race-hud__dropdown-value">{current.label}</span>
        </span>
        <span className="race-hud__caret" />
      </button>
      {open && (
        <ul className="race-hud__menu" role="listbox">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={classNames("race-hud__menu-item", {
                  "race-hud__menu-item--active": o.value === value,
                })}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ─── Labelled slider ─── */
const HudSlider = ({ id, label, display, disabled, ...inputProps }) => (
  <div
    className={classNames("race-hud__slider", {
      "race-hud__slider--disabled": disabled,
    })}
  >
    <label htmlFor={id} className="race-hud__label">
      {label} ({display})
    </label>
    <input
      id={id}
      type="range"
      className="race-hud__range"
      disabled={disabled}
      {...inputProps}
    />
  </div>
);

/**
 * RaceHud — docked telemetry + playback/camera controls for the Race Viewer.
 */
export const RaceHud = ({
  driverDetails,
  year,
  speedUnit,
  onSpeedUnitChange,
  isPaused,
  onPausedChange,
  speedFactor,
  onSpeedFactorChange,
  cameraView,
  onCameraViewChange,
  theta,
  onThetaChange,
  cameraHeight,
  onCameraHeightChange,
  radius,
  onRadiusChange,
}) => {
  const isMph = speedUnit === "mph";
  const gear = driverDetails?.n_gear ?? 0;
  const rawSpeed = driverDetails?.speed ?? 0;
  const speed = isMph ? Math.round(rawSpeed * 0.621371) : rawSpeed;
  const rpm = driverDetails?.rpm ?? 0;
  const throttle = Math.max(0, Math.min(100, driverDetails?.throttle ?? 0));
  const brake = Math.max(0, Math.min(100, driverDetails?.brake ?? 0));

  const speedOptions = [
    { value: 4, label: "Normal" },
    { value: 1.5, label: "Push Push" },
    { value: 0.2, label: parseInt(year) >= 2026 ? "ERS Boost" : "DRS" },
  ];
  const cameraOptions = [
    { value: "sky", label: "Sky View" },
    { value: "halo", label: "Halo View" },
    { value: "top", label: "Top Follow" },
  ];
  const orbitDisabled = cameraView !== "sky";
  const rotationDeg = Math.round((theta * 180) / Math.PI);

  return (
    <div className="race-hud" id="race-hud" style={{ width: "fit-content", margin: "0 auto" }}>
      {/* ─── Telemetry Row ─── */}
      <div className="race-hud__telemetry">
        <div className="race-hud__tile race-hud__tile--gear">
          <span className="race-hud__label">Gear</span>
          <div className="race-hud__gear">
            <span className="race-hud__big">{gear || "N"}</span>
            <div className="race-hud__gear-scale">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div
                  key={n}
                  className={classNames("race-hud__gear-step", {
                    "race-hud__gear-step--active": gear === n,
                  })}
                >
                  <span className="race-hud__gear-tick" />
                  <span className="race-hud__gear-num">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="race-hud__tile race-hud__tile--speed">
          <span className="race-hud__label">Speed</span>
          <div className="race-hud__speed">
            <span className="race-hud__big">{speed}</span>
            <div className="race-hud__units">
              <button
                id="race-hud-unit-kph"
                type="button"
                className={classNames("race-hud__unit", {
                  "race-hud__unit--active": !isMph,
                })}
                onClick={() => onSpeedUnitChange("kph")}
              >
                km/h
              </button>
              <button
                id="race-hud-unit-mph"
                type="button"
                className={classNames("race-hud__unit", {
                  "race-hud__unit--active": isMph,
                })}
                onClick={() => onSpeedUnitChange("mph")}
              >
                mph
              </button>
            </div>
          </div>
        </div>

        <div className="race-hud__tile race-hud__tile--bar race-hud__tile--rpm">
          <div className="race-hud__bar-head">
            <span className="race-hud__label">RPM</span>
            <span className="race-hud__value">{rpm}</span>
          </div>
          <SegmentBar percent={(rpm / RPM_MAX) * 100} />
        </div>

        <div className="race-hud__tile race-hud__tile--bar">
          <div className="race-hud__bar-head">
            <span className="race-hud__label">Throttle</span>
            <span className="race-hud__value">{Math.round(throttle)}%</span>
          </div>
          <SegmentBar percent={throttle} />
        </div>

        <div className="race-hud__tile race-hud__tile--bar">
          <div className="race-hud__bar-head">
            <span className="race-hud__label">Brake</span>
            <span className="race-hud__value">{Math.round(brake)}%</span>
          </div>
          <SegmentBar percent={brake} variant="red" />
        </div>
      </div>

      {/* ─── Controls Row ─── */}
      <div className="race-hud__controls">
        <div className="race-hud__transport">
          <button
            id="race-hud-play"
            type="button"
            aria-label="Play"
            className={classNames("race-hud__icon-btn", {
              "race-hud__icon-btn--active": !isPaused,
            })}
            onClick={() => onPausedChange(false)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
            </svg>
          </button>
          <button
            id="race-hud-pause"
            type="button"
            aria-label="Pause"
            className={classNames("race-hud__icon-btn", {
              "race-hud__icon-btn--active": isPaused,
            })}
            onClick={() => onPausedChange(true)}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <rect x="5" y="4" width="5" height="16" rx="1.2" />
              <rect x="14" y="4" width="5" height="16" rx="1.2" />
            </svg>
          </button>
        </div>

        <HudDropdown
          id="race-hud-speed"
          label="Speed"
          value={speedFactor}
          options={speedOptions}
          onChange={onSpeedFactorChange}
        />
        <HudDropdown
          id="race-hud-camera"
          label="Camera"
          value={cameraView}
          options={cameraOptions}
          onChange={onCameraViewChange}
        />

        <div className="race-hud__sliders">
          <HudSlider
            id="race-hud-rotation"
            label="Rotation"
            display={`${rotationDeg}°`}
            disabled={orbitDisabled}
            min={-180}
            max={180}
            value={rotationDeg}
            onChange={(e) => onThetaChange((e.target.value * Math.PI) / 180)}
          />
          <HudSlider
            id="race-hud-height"
            label="Height"
            display={cameraHeight.toFixed(1)}
            disabled={orbitDisabled}
            min={5}
            max={50}
            step={0.5}
            value={cameraHeight}
            onChange={(e) => onCameraHeightChange(parseFloat(e.target.value))}
          />
          <HudSlider
            id="race-hud-zoom"
            label="Zoom"
            display={(radius / 2.5).toFixed(1)}
            disabled={orbitDisabled}
            min={5}
            max={100}
            step={1}
            value={radius}
            onChange={(e) => onRadiusChange(parseFloat(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
};

export default RaceHud;
