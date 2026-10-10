import React, { useRef } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { useInView } from "framer-motion";

import { wildCardDrivers } from "../utils/wildCards";
import { nationalityToFlag } from "../utils/nationalityToFlag";
import { darkenColor } from "../utils/colorUtils";
import "./team-garages/TeamDriverCard.scss";

export const ConstructorDriver = (props) => {
  const {
    className,
    points,
    image,
    car,
    firstName,
    lastName,
    year,
    index,
    showStanding,
    championshipLevel,
    nationality,
    color,
  } = props;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const F2F1A = championshipLevel === "F1A" || championshipLevel === "F2";

  const f2ImageSrc = `${"/images/" + year + "/F2/carSideView/" + car + ".png"}`;
  const wildcardDriversForYear = wildCardDrivers[year] || [];
  const isWildcardDriver = wildcardDriversForYear.includes(image);
  const f1aImageSrc = isWildcardDriver
    ? "/images/2024/F1A/carSideView/wildcard-side.png"
    : `${"/images/" + year + "/F1A/carSideView/" + image + "-side.png"}`;
  const imageSrc = `${"/images/" + year + "/cars/" + car + ".png"}`;

  const handleMove = (e) => {
    if (!ref.current) return;
    const card = ref.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mx = (x / rect.width) * 100;
    const my = (y / rect.height) * 100;
    const rx = ((y / rect.height - 0.5) * -15).toFixed(2) + "deg";
    const ry = ((x / rect.width - 0.5) * 15).toFixed(2) + "deg";
    card.style.setProperty("--rx", rx);
    card.style.setProperty("--ry", ry);
    card.style.setProperty("--mx", `${mx}%`);
    card.style.setProperty("--my", `${my}%`);
  };

  const handleLeave = () => {
    if (!ref.current) return;
    const card = ref.current;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--mx", "50%");
    card.style.setProperty("--my", "50%");
  };

  const teamColor = color || "#7500AD";

  return (
    <div className="mb-24 w-full" style={{ perspective: "900px" }}>
      <div
        className={classNames(
          className,
          "team-driver-card flex justify-center items-end group px-8 pt-24 pb-8",
        )}
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        style={{
          "--team": teamColor,
          "--team-dark": darkenColor(teamColor, 45),
          "--rx": "0deg",
          "--ry": "0deg",
          "--mx": "50%",
          "--my": "50%",
          height: "auto",
          aspectRatio: "auto"
        }}
      >
        <div className="team-driver-card__livery" aria-hidden="true" />
        <div className="team-driver-card__grid" aria-hidden="true" />
        
        {/* This gradient overlay matches the team-driver-card__info background to provide the correct opacity/darkening over the livery */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ zIndex: 2, background: 'linear-gradient(90deg, rgba(8, 8, 10, 0.95) 0%, rgba(8, 8, 10, 0.8) 45%, transparent 100%)', borderRadius: 'inherit' }} 
        />
        
        <img
          alt=""
          className="constructor-driver-card__person -mr-28 w-[12rem] z-10 relative rounded-t-lg"
          src={
            F2F1A
              ? `${"/images/" + year + "/" + championshipLevel + "/" + image + ".png"}`
              : `${"/images/" + year + "/drivers/" + image + ".png"}`
          }
          style={{
            opacity: isInView ? 1 : 0,
            transition: "all 2s cubic-bezier(0.17, 0.55, 0.55, 1)",
          }}
        />
        {championshipLevel === "F1A" && isWildcardDriver && (
          <img
            alt=""
            className="absolute left-[4rem] md:left-[6.4rem] bottom-[-1rem] w-64"
            src="/images/wildcardicon.png"
          />
        )}
        <div className="-mb-10 relative z-10">
          {/* position / firstname */}
          <div className="w-fit mb-4">
            {showStanding && (
              <div className="flex items-end mb-4">
                <div className="font-display text-24 leading-none -mb-4 mr-8 text-neutral-400">
                  {index + 1}
                </div>
                <div className="h-1 w-full border-b-[1px] border-solid border-neutral-600 mr-8" />
              </div>
            )}
            <p className="gradient-text-light uppercase text-xl tracking-wide -mb-8">
              {firstName}
            </p>
          </div>
          {/* last name */}
          <div className="flex justify-between items-end mb-6">
            <p className="heading-2">{lastName}</p>
            {(nationality || image) && (
              <img
                src={nationalityToFlag(nationality || image)}
                alt="flag"
                className="h-20 mb-4 rounded-sm shadow-sm opacity-80 hover:opacity-100 transition-opacity"
              />
            )}
          </div>
          <div className="h-1 w-full border-b-[1px] border-solid border-neutral-600" />
          {/* car / points */}
          <div className="flex items-end">
            <img
              alt=""
              className="constructor-driver-card__car -mb-8 z-10 -ml-32 w-[20rem]"
              src={
                championshipLevel === "F1A"
                  ? f1aImageSrc
                  : championshipLevel === "F2"
                    ? f2ImageSrc
                    : imageSrc
              }
              width={200}
              style={{
                transform: isInView
                  ? "none"
                  : championshipLevel === "F2"
                    ? "translateX(50px)"
                    : "translateX(-50px)",
                opacity: isInView ? 1 : 0,
                transition: "all 1s cubic-bezier(0.17, 0.55, 0.55, 1)",
              }}
            />
            <div className="flex flex-col items-end z-10">
              <span className="font-display text-[4.8rem] leading-none gradient-text-light">
                {points}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ConstructorDriver.propTypes = {
  className: PropTypes.string,
  year: PropTypes.number,
  points: PropTypes.object || PropTypes.element,
  image: PropTypes.string,
  car: PropTypes.string,
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  type: PropTypes.string,
  showDivider: PropTypes.bool,
};
