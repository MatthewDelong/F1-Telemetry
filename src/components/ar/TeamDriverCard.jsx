import React, { useRef, useState } from "react";
import classNames from "classnames";
import "./TeamDriverCard.scss";

import { nationalityToFlag } from "../../utils/nationalityToFlag";
import { darkenColor } from "../../utils/colorUtils";

const FALLBACK_PHOTO = "/images/2024/drivers/default_driver.png";

/**
 * "Livery" driver card – carbon-fibre base, team-colour speed stripes,
 * outlined race number watermark, and a cursor-tracked 3D tilt + sheen.
 */
export const TeamDriverCard = ({
  year,
  code,
  number,
  firstName,
  lastName,
  nationality,
  points,
  position,
  wins,
  teamLabel,
  color = "#7500AD",
  index = 0,
}) => {
  const cardRef = useRef(null);
  const [photoSrc, setPhotoSrc] = useState(`/images/${year}/drivers/${code}.png`);
  const [prevKey, setPrevKey] = useState(`${year}-${code}`);

  // Reset the photo when the card is reused for a different driver/season.
  if (prevKey !== `${year}-${code}`) {
    setPrevKey(`${year}-${code}`);
    setPhotoSrc(`/images/${year}/drivers/${code}.png`);
  }

  const handleMove = (event) => {
    const card = cardRef.current;
    if (!card || event.pointerType === "touch") return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    card.style.setProperty("--ry", `${(px - 0.5) * 14}deg`);
    card.style.setProperty("--rx", `${(0.5 - py) * 12}deg`);
    card.style.setProperty("--mx", `${px * 100}%`);
    card.style.setProperty("--my", `${py * 100}%`);
  };

  const handleLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--rx", "0deg");
  };

  const flag = nationality ? nationalityToFlag(nationality) : null;

  return (
    <article
      ref={cardRef}
      id={`team-driver-card-${code}`}
      className="team-driver-card"
      style={{
        "--team": color,
        "--team-dark": darkenColor(color, 45),
        animationDelay: `${index * 90}ms`,
      }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <div className="team-driver-card__livery" aria-hidden="true" />
      <div className="team-driver-card__grid" aria-hidden="true" />
      {number && (
        <span className="team-driver-card__number" aria-hidden="true">
          {number}
        </span>
      )}

      <img
        className="team-driver-card__photo"
        src={photoSrc}
        alt={`${firstName} ${lastName}`}
        loading="lazy"
        onError={() => {
          if (photoSrc !== FALLBACK_PHOTO) setPhotoSrc(FALLBACK_PHOTO);
        }}
      />

      <div className="team-driver-card__top">
        <span className="team-driver-card__code">{code}</span>
        {teamLabel && <span className="team-driver-card__team">{teamLabel}</span>}
      </div>

      <div className="team-driver-card__info">
        <div className="team-driver-card__name">
          <span className="team-driver-card__first">{firstName}</span>
          <span className="team-driver-card__last">{lastName}</span>
        </div>
        <div className="team-driver-card__stats">
          {flag && <img className="team-driver-card__flag" src={flag} alt={nationality} />}
          <div className={classNames("team-driver-card__stat")}>
            <span>Pos</span>
            <strong>{position ? `P${position}` : "–"}</strong>
          </div>
          <div className="team-driver-card__stat">
            <span>Pts</span>
            <strong>{points}</strong>
          </div>
          <div className="team-driver-card__stat">
            <span>Wins</span>
            <strong>{wins}</strong>
          </div>
        </div>
      </div>

      <div className="team-driver-card__sheen" aria-hidden="true" />
    </article>
  );
};

export default TeamDriverCard;
