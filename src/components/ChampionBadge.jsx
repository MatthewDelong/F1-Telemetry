import React, { useId } from "react";
import classNames from "classnames";
import { getChampion, getConstructorChampion } from "../config/champion";
import { getCurrentYear } from "../utils/currentYear";
import "./ChampionBadge.css";

/**
 * Crown shown on a champion's or reigning champion's image.
 * Renders nothing for any other driver/team. Parent must be position: relative
 * (or pass a className / style to position it).
 *
 * size: "sm" | "md" | "lg"
 * variant: "default" | "compact" (used on tight cards like Team Principal)
 */
export const ChampionBadge = ({
  code,
  teamId,
  size = "md",
  variant = "default",
  className,
  style,
  showLabel,
  labelText,
  year, // season being viewed – shows "{year} Champion" or "Reigning Champion"
}) => {
  // Hooks must run before any early return
  const gradientId = `champGold-${useId().replace(/:/g, "")}`;
  const season = year ?? getCurrentYear();

  let label;
  let short;
  let theme;
  if (teamId) {
    const constructorChamp = getConstructorChampion(teamId, season);
    if (!constructorChamp) return null;
    if (constructorChamp.isReigning) {
      label = `Reigning Constructors' Champion (${constructorChamp.year}) – ${constructorChamp.name}`;
      short =
        variant === "compact"
          ? "Reigning Champions"
          : "Reigning Constructors' Champions";
    } else {
      label = `${constructorChamp.year} Constructors' Champion – ${constructorChamp.name}`;
      short =
        variant === "compact"
          ? `${constructorChamp.year} Champions`
          : `${constructorChamp.year} Constructors' Champions`;
    }
    theme = constructorChamp.theme;
  } else {
    const champion = getChampion(code, season);
    if (!champion) return null;
    if (champion.isReigning) {
      label = `Reigning World Champion (${champion.year}) – ${champion.name}`;
      short = "Reigning Champion";
    } else {
      label = `${champion.year} World Champion – ${champion.name}`;
      short = `${champion.year} Champion`;
    }
    theme = champion.theme;
  }

  return (
    <span
      className={classNames(
        "champion-badge",
        `champion-badge--${size}`,
        { "champion-badge--labelled": showLabel },
        theme && `champion-badge--${theme}`,
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
            <stop offset="0%" style={{ stopColor: "var(--champ-light)" }} />
            <stop offset="50%" style={{ stopColor: "var(--champ-mid)" }} />
            <stop offset="100%" style={{ stopColor: "var(--champ-dark)" }} />
          </linearGradient>
        </defs>
        <path
          d="M3 8l4.5 3.5L12 4l4.5 7.5L21 8l-2 10H5L3 8z"
          fill={`url(#${gradientId})`}
          style={{ stroke: "var(--champ-stroke)" }}
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
