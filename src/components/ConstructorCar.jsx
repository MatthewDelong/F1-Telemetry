import React, { useRef } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { useInView } from "framer-motion";

import "./ConstructorCar.scss";
import { Button } from "./Button";

export const ConstructorCar = (props) => {
  const {
    championshipLevel,
    color,
    className,
    points,
    image,
    name,
    year,
    drivers,
    index,
  } = props;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const driverUrl = (index) =>
    championshipLevel === "f2"
      ? `${"/images/" + year + "/F2/" + drivers[index] + ".png"}`
      : `${"/images/" + year + "/drivers/" + drivers[index] + ".png"}`;

  const carUrl =
    championshipLevel === "f2"
      ? `${"/images/" + year + "/F2/carSideView/" + image + ".png"}`
      : `${"/images/" + year + "/cars/" + image + ".png"}`;

  const groupHoverClasses =
    "group-hover:scale-[1.05] duration-150 transition-transform ease-in-out";

  return (
    <div className="w-full mb-24 relative group">
      <div
        className={classNames(
          className,
          "constructor-card duration-300 transition-all ease-in-out hover:scale-[.98] hover:cursor-pointer bg-glow-dark border border-white/5 rounded-[2.4rem] shadow-xl hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] overflow-hidden relative pb-8 pt-8",
        )}
        ref={ref}
        style={{ boxShadow: `inset 0 -2px 15px ${color}22` }}
      >
        <div 
          className="absolute inset-0 z-0 opacity-10 transition-opacity duration-300 group-hover:opacity-25"
          style={{ background: `radial-gradient(circle at 50% 50%, ${color} 0%, rgba(0,0,0,0) 70%)` }}
        />
      <div className="flex flex-col items-center pb-40">
        <div div className="flex items-end mb-4">
          <div className="h-1 w-32 border-b-[1px] border-solid border-neutral-500" />
          <div className="font-display text-24 leading-none -mb-4 mx-8 text-neutral-400">
            {index + 1}
          </div>
          <div className="h-1 w-32 border-b-[1px] border-solid border-neutral-500" />
        </div>
        <p className="uppercase tracking-sm text-xl">
          {name.replace("F1 Team", "")}
        </p>
        <div className="h-1 w-[9.6rem] border-b-[1px] border-solid border-neutral-500 mb-4 mt-4" />
        <span className="heading-1 gradient-text-light ">{points}</span>
        <div
          className={classNames(
            groupHoverClasses,
            "flex items-end relative -mt-24 z-10",
          )}
        >
          {drivers[3] && (
            <img
              alt=""
              className="absolute left-[-4rem] z-[1] rounded-t-lg"
              src={driverUrl(3)}
              width={90}
              style={{
                opacity: isInView ? 1 : 0,
                transition: "all 2s cubic-bezier(0.17, 0.55, 0.55, 1) .4s",
              }}
            />
          )}
          <img
            alt=""
            className="-mt-40 -mr-80 sm:-mr-60 z-[1] rounded-t-lg"
            src={driverUrl(0)}
            width={100}
            style={{
              opacity: isInView ? 1 : 0,
              transition: "all 2s cubic-bezier(0.17, 0.55, 0.55, 1) .3s",
            }}
          />

          <img
            alt=""
            className="-mt-16 -mb-[2.2rem] z-10"
            src={carUrl}
            width={264}
            style={{
              transform: isInView
                ? "none"
                : championshipLevel === "f2"
                  ? "translateX(300px)"
                  : "translateX(-300px)",
              opacity: isInView ? 1 : 0,
              transition: "all 1s cubic-bezier(0.17, 0.55, 0.55, 1) .2s",
            }}
          />

          <img
            alt=""
            className="-mt-40 -ml-80 sm:-ml-60 z-[1] rounded-t-lg"
            src={driverUrl(1)}
            width={100}
            style={{
              opacity: isInView ? 1 : 0,
              transition: "all 2s cubic-bezier(0.17, 0.55, 0.55, 1) .3s",
            }}
          />
          {drivers[2] && (
            <img
              alt=""
              className="absolute right-[-4rem] z-[1] rounded-t-lg"
              src={driverUrl(2)}
              width={90}
              style={{
                opacity: isInView ? 1 : 0,
                transition: "all 2s cubic-bezier(0.17, 0.55, 0.55, 1) .4s",
              }}
            />
          )}
        </div>
      </div>
      </div>
      {championshipLevel !== "f2" && (
        <Button
          size="sm"
          disabled
          className="opacity-0 group-hover:opacity-100 absolute -bottom-[1.2rem] left-1/2 -translate-x-1/2 rounded-full px-8 tracking-widest uppercase shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300"
        >
          View Comparison
        </Button>
      )}
    </div>
  );
};

ConstructorCar.propTypes = {
  className: PropTypes.string,
  drivers: PropTypes.array,
  year: PropTypes.number,
  points: PropTypes.string,
  image: PropTypes.string,
  name: PropTypes.string,
};
