import React, { useId } from "react";
import classNames from "classnames";
import {
  getChampion,
  CURRENT_CONSTRUCTOR_CHAMPION,
  isConstructorChampion,
} from "../config/champion";
import "./ChampionBadge.css";

/**
 * Gold crown shown on a reigning champion's image.
 * Renders nothing for any other driver. Parent must be position: relative
 * (or pass a className / style to position it).
 *
 * size: "sm" | "md" | "lg"
 */
export const ChampionBadge = ({
  code,
  teamId,
  size = "md",
  className,
  style,
  showLabel,
  labelText,
}) => {
  // Hooks must run before any early return
  const gradientId = `champGold-${useId().replace(/:/g, "")}`;

  let label;
  let short;
  if (teamId) {
    if (!isConstructorChampion(teamId)) return null;
    label = `${CURRENT_CONSTRUCTOR_CHAMPION.year} Constructors' Champion – ${CURRENT_CONSTRUCTOR_CHAMPION.name}`;
    short = `${CURRENT_CONSTRUCTOR_CHAMPION.year} Constructors' Champion`;
  } else {
    const champion = getChampion(code);
    if (!champion) return null;
    label = `${champion.year} World Champion – ${champion.name}`;
    short = `${champion.year} Champion`;
  }

  return (
    <span
      className={classNames(
        "champion-badge",
        `champion-badge--${size}`,
        { "champion-badge--labelled": showLabel },
        className,
      )}
      style={style}
      title={label}
      aria-label={label}
      role="img"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF3B0" />
            <stop offset="50%" stopColor="#F5C542" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
        </defs>
        <path
          d="M3 8l4.5 3.5L12 4l4.5 7.5L21 8l-2 10H5L3 8z"
          fill={`url(#${gradientId})`}
          stroke="#7a5a00"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <rect
          x="5"
          y="19"
          width="14"
          height="2"
          rx="0.6"
          fill={`url(#${gradientId})`}
        />
      </svg>
      <span className="champion-badge__label">{labelText || short}</span>
    </span>
  );
};

export default ChampionBadge;
