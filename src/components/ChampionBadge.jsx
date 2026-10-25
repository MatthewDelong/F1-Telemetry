import React from "react";
import classNames from "classnames";
import { CURRENT_CHAMPION, isChampion } from "../config/champion";
import "./ChampionBadge.css";

/**
 * Gold crown shown on the reigning champion's image.
 * Renders nothing for any other driver. Parent must be position: relative
 * (or pass a className / style to position it).
 *
 * size: "sm" | "md" | "lg"
 */
export const ChampionBadge = ({ code, size = "md", className, style }) => {
  if (!isChampion(code)) return null;
  const label = `${CURRENT_CHAMPION.year} World Champion – ${CURRENT_CHAMPION.name}`;

  return (
    <span
      className={classNames("champion-badge", `champion-badge--${size}`, className)}
      style={style}
      title={label}
      aria-label={label}
      role="img"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="champGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF3B0" />
            <stop offset="50%" stopColor="#F5C542" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
        </defs>
        <path
          d="M3 8l4.5 3.5L12 4l4.5 7.5L21 8l-2 10H5L3 8z"
          fill="url(#champGold)"
          stroke="#7a5a00"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <rect x="5" y="19" width="14" height="2" rx="0.6" fill="url(#champGold)" />
      </svg>
      <span className="champion-badge__label">{CURRENT_CHAMPION.year} Champion</span>
    </span>
  );
};

export default ChampionBadge;
