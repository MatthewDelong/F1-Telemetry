import React, { useRef } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Popover } from "flowbite-react";
import { useInView } from "framer-motion";

export const DriverCard = (props) => {
  const {
    championshipLevel,
    className,
    driver,
    driverColor,
    stint,
    fastestLap,
    status,
    startPosition,
    endPosition,
    isActive,
    layoutSmall,
    time,
    year,
    hasHover,
    index,
    mobileSmall,
    isRace,
    darkBG,
    hidePositionMovement,
  } = props;

  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true });

  const getTireCompound = (driverCode, lap) => {
    const driverStint = stint?.find((item) => item.acronym === driverCode);
    if (driverStint && driverStint.tires) {
      for (const tire of driverStint.tires) {
        if (lap <= tire.lap_end) {
          return tire.compound;
        }
      }
    }
    return "?";
  };

  const positionMovement = () => {
    if (!Number.isNaN(startPosition) && startPosition !== endPosition) {
      return (
        <Popover
          aria-labelledby="default-popover"
          className="bg-glow border-neutral-400 border-[.1rem] p-4 bg-neutral-950 rounded-md z-[10]"
          trigger="hover"
          placement="top"
          arrow={false}
          content={
            <div className="p-4">
              <div>
                <span className="text-sm mr-4">Started</span>
                <span className="font-display">P{startPosition}</span>
              </div>
              <div>
                <span className="text-sm mr-4">Ended</span>
                <span className="font-display">P{endPosition}</span>
              </div>
            </div>
          }
        >
          <FontAwesomeIcon
            icon={startPosition > endPosition ? "circle-up" : "circle-down"}
            className={classNames(
              "fa-xs",
              startPosition > endPosition ? "text-emerald-500" : "text-rose-500",
            )}
          />
        </Popover>
      );
    }
    return null;
  };

  const driverImage = (
    <img
      alt=""
      src={
        championshipLevel
          ? `${"/images/" + year + "/" + championshipLevel + "/" + driver.code?.trim() + ".png"}`
          : `${"/images/" + year + "/drivers/" + driver.code?.trim() + ".png"}`
      }
      width={72}
      height={72}
      className={classNames("absolute block bottom-[0px] left-[28px] z-20 object-contain")}
      style={{ opacity: 1 }}
    />
  );

  const isFastestLapDriver = String(fastestLap?.rank) === "1";
  const fastestLapTime =
    fastestLap?.Time?.time ||
    fastestLap?.time?.time ||
    fastestLap?.Time ||
    fastestLap?.time ||
    "";
  const isMph = props.speedUnit === "mph";
  const displayUnit = isMph ? "mph" : "kph";
  
  const rawAverageSpeed = fastestLap?.AverageSpeed || fastestLap?.averageSpeed;
  const fastestLapAverageSpeed = React.useMemo(() => {
    if (!rawAverageSpeed?.speed) return null;
    const baseSpeed = parseFloat(rawAverageSpeed.speed);
    const baseUnits = (rawAverageSpeed.units || "").toLowerCase();
    
    let convertedSpeed = baseSpeed;
    if (isMph && (baseUnits === "kph" || baseUnits === "km/h" || !baseUnits)) {
      convertedSpeed = baseSpeed * 0.621371;
    } else if (!isMph && baseUnits === "mph") {
      convertedSpeed = baseSpeed / 0.621371;
    }
    
    return {
      speed: convertedSpeed.toFixed(3),
      units: displayUnit
    };
  }, [rawAverageSpeed, isMph, displayUnit]);

  return (
    <div
      ref={cardRef}
      className={classNames(
        className,
        "driver-card-glass",
        {
          "driver-card-glass--canvas": mobileSmall,
          hidden: status === "cancelled",
          "active": isActive,
        }
      )}
      style={{ borderLeftColor: isActive ? `#${driverColor}` : undefined }}
    >
      {/* Layout for List Items (P4+) */}
      <div
        className={classNames(
          "flex items-center justify-between w-full font-display",
          {
            "max-md:hidden": mobileSmall,
            hidden: !layoutSmall,
          },
        )}
      >
        <div className="flex items-center leading-none text-sm font-bold">
          <p
            className={classNames(
              "w-48 bg-neutral-700/80 py-[1px] text-center rounded-l-sm text-[10px] shadow-inner",
            )}
          >
            P{isRace ? endPosition : index + 1}
          </p>
          <span className="pl-12 mr-6 text-[13px] text-white brightness-125 uppercase tracking-wider">
            {driver.code}
          </span>
        </div>
        <div className="flex items-center max-sm:pr-4 sm:pr-12 max-sm:gap-4 sm:gap-8 h-full">
          <p className="text-[12px] sm:text-[13px] text-white font-medium opacity-90">
            {time}
          </p>
          <div className="status-icons-wrapper flex flex-col items-center justify-center gap-[1px] min-w-[20px]">
            {isFastestLapDriver && (
              <Popover
                aria-labelledby="default-popover"
                className="bg-glow border-fastest-lap-plum border-[.1rem] rounded-md p-4 bg-neutral-950 z-[10]"
                trigger="hover"
                placement="top"
                arrow={false}
                content={
                  <div className="p-4">
                    <div className="bg-fastest-lap-plum text-center font-display rounded px-8 text-white">
                      {fastestLapTime}
                    </div>
                    <div className="flex align-start justify-around mt-4">
                      <div className="flex flex-col items-center px-4 text-center">
                        <span className="text-[10px] uppercase opacity-70">
                          Lap
                        </span>
                        <span className="font-display text-sm leading-tight text-white">
                          {fastestLap?.lap || "-"}
                        </span>
                      </div>
                      <div className="flex flex-col items-center px-4 text-center border-l border-white/10">
                        <span className="text-[10px] uppercase opacity-70">
                          Tyre
                        </span>
                        <span className="font-display text-sm leading-tight uppercase text-white">
                          {getTireCompound(driver.code, fastestLap?.lap).charAt(
                            0,
                          )}
                        </span>
                      </div>
                    </div>

                    {fastestLapAverageSpeed && (
                      <div className="flex flex-col items-center mt-8 pt-6 border-t border-white/5">
                        <span className="text-[10px] uppercase opacity-70 underline underline-offset-2">
                          Avg Speed
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="font-display text-sm text-white">
                            {fastestLapAverageSpeed?.speed}
                          </span>
                          <span className="text-[10px] opacity-60 uppercase">
                            {fastestLapAverageSpeed?.units}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                }
              >
                <span className="fa-layers fa-fw fa-xs scale-90 cursor-help">
                  <FontAwesomeIcon icon="circle" className="text-white" />
                  <FontAwesomeIcon
                    icon="clock"
                    className={classNames(isFastestLapDriver ? "text-fastest-lap-plum" : "text-neutral-500")}
                    transform="shrink-2"
                  />
                </span>
              </Popover>
            )}
            {isRace && !hidePositionMovement && positionMovement()}
          </div>
        </div>
      </div>

      {/* Layout for Hero Cards (P1-P3) */}
      <div
        className={classNames("flex items-center w-full relative", {
          "max-md:hidden": mobileSmall,
          hidden: layoutSmall,
        })}
      >
        <div
          className={classNames(
            "driver-card-position text-[18px] font-display px-6 py-1 bg-neutral-700/80 rounded-l-md flex items-center h-full min-h-[44px]",
          )}
        >
          P{isRace ? endPosition : index + 1}
        </div>
        {driverImage}
        <div className="grow py-1 pl-[10px] pr-12 text-right flex flex-col justify-center relative">
          <div className="flex items-center justify-end gap-12 relative z-10">
            <span className="heading-4 max-sm:pl-32 sm:pl-32 uppercase font-black italic tracking-tighter text-[18px] drop-shadow-md">
              {driver.code}
            </span>
            <div className="status-icons-wrapper flex flex-col items-center justify-center gap-[1px] min-w-[20px]">
              {isFastestLapDriver && (
                <Popover
                  aria-labelledby="hero-popover"
                  className="bg-glow border-fastest-lap-plum border-[.1rem] rounded-md p-4 bg-neutral-950 z-[10]"
                  trigger="hover"
                  placement="top"
                  arrow={false}
                  content={
                    <div className="p-4 text-center">
                      <div className="bg-fastest-lap-plum text-[12px] font-display rounded px-8 inline-block text-white">
                        {fastestLapTime}
                      </div>
                    </div>
                  }
                >
                  <span className="fa-layers fa-fw fa-xs scale-110 cursor-help">
                    <FontAwesomeIcon icon="circle" className="text-white" />
                    <FontAwesomeIcon
                      icon="clock"
                      className="text-fastest-lap-plum"
                      transform="shrink-2"
                    />
                  </span>
                </Popover>
              )}
              {isRace && !hidePositionMovement && positionMovement()}
            </div>
          </div>
          <div className="divider-glow w-full my-4" />
          <p className={classNames("text-base font-bold text-white/90")}>
            {time}
          </p>
        </div>
      </div>

      {/* Mobile Small Layout */}
      {mobileSmall && (
        <div className="md:hidden">
          <div className="flex items-center text-xs font-display">
            <p className="w-24 bg-neutral-600 py-1 text-center rounded-tl-[.4rem]">
              P{isRace ? endPosition : index + 1}
            </p>
            <p className="pl-8 pr-8 font-bold text-white">{driver.code}</p>
          </div>
          <div>
            <p className="text-sm pl-8 font-medium text-white">{time}</p>
          </div>
        </div>
      )}
    </div>
  );
};

DriverCard.propTypes = {
  isActive: PropTypes.bool,
  index: PropTypes.number,
  hasHover: PropTypes.bool,
  className: PropTypes.string,
  carNumber: PropTypes.string, // Max has a different permanentNumber than his actual car number
  driverColor: PropTypes.string,
  driver: PropTypes.shape({
    driverId: PropTypes.string,
    permanentNumber: PropTypes.string,
    code: PropTypes.string,
    url: PropTypes.string,
    givenName: PropTypes.string,
    familyName: PropTypes.string,
    dateOfBirth: PropTypes.string,
    nationality: PropTypes.string,
  }),
  fastestLap: PropTypes.shape({
    rank: PropTypes.string,
    lap: PropTypes.string,
    time: PropTypes.shape({
      time: PropTypes.string,
    }),
    averageSpeed: PropTypes.shape({
      units: PropTypes.string,
      speed: PropTypes.string,
    }),
  }),
  grid: PropTypes.string,
  startPosition: PropTypes.number,
  endPosition: PropTypes.number,
  status: PropTypes.string,
  time: PropTypes.string,
  year: PropTypes.number,
  layoutSmall: PropTypes.bool,
  mobileSmall: PropTypes.bool,
  championshipLevel: PropTypes.string,
};
