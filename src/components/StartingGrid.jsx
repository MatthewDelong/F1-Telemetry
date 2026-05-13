import classNames from "classnames";
import React from "react";
import { wildCardDrivers } from "../utils/wildCards";

export const StartingGrid = (props) => {
  const {
    raceResults,
    startingGrid,
    year,
    driverCode,
    driverNumber,
    driversDetails,
    driversColor,
    className,
    driverTeamMap,
  } = props;

  return (
    <div
      className={classNames(
        className,
        "bg-glow-large py-32 px-20 sm:px-0 h-fit rounded-md sm:rounded-xlarge",
      )}
    >
      <ul className="flex flex-col w-fit m-auto">
        {startingGrid
          .sort((a, b) => {
            const posA =
              a.position === "PL" ? 100 : parseInt(a.position, 10) || 99;
            const posB =
              b.position === "PL" ? 100 : parseInt(b.position, 10) || 99;
            return posA - posB;
          })
          .map((gridPosition, index) => {
            const currentDriverAcronym = driversDetails[gridPosition.driver_number] || gridPosition.driver_acronym || "";
            const isSelected = String(driverNumber) === String(gridPosition.driver_number);
            const currentDriverColor = driversColor[currentDriverAcronym];

            // Create a lookup map for the constructors
            const constructorMap =
              raceResults && raceResults.length > 0
                ? raceResults.reduce((acc, result) => {
                    if (result.Driver && result.Constructor) {
                      acc[result.Driver.code] = result.Constructor.constructorId;
                    }
                    return acc;
                  }, {})
                : driverTeamMap || {};

            const getConstructorIdFromTeam = (teamName) => {
              if (!teamName) return "f1";
              const name = teamName.toLowerCase();
              if (name.includes("red bull")) return "red_bull";
              if (name.includes("mercedes")) return "mercedes";
              if (name.includes("ferrari")) return "ferrari";
              if (name.includes("mclaren")) return "mclaren";
              if (name.includes("aston martin")) return "aston_martin";
              if (name.includes("alpine")) return "alpine";
              if (name.includes("williams")) return "williams";
              if (name.includes("rb") || name.includes("visa cash"))
                return "rb";
              if (name.includes("sauber") || name.includes("kick"))
                return "sauber";
              if (name.includes("haas")) return "haas";
              return "f1";
            };

            const getCarTopView = (driver, driverNumber) => {
              let constructorOrTeam =
                constructorMap[driver] || constructorMap[driverNumber];

              if (!constructorOrTeam) {
                const result = raceResults?.find(
                  (r) =>
                    r.Driver?.code === driver ||
                    r.Driver?.driverId === driver ||
                    r.number === driverNumber,
                );
                constructorOrTeam =
                  result?.Constructor?.constructorId ||
                  result?.Constructor?.name;
              }

              if (!constructorOrTeam) return "f1";

              // Map 2023 team IDs to 2024 asset names
              if (parseInt(year, 10) === 2023) {
                const teamMap2023to2024 = {
                  "alfa": "sauber",
                  "alphatauri": "rb",
                  "alfa_romeo": "sauber",
                  "alpha_tauri": "rb"
                };
                if (teamMap2023to2024[constructorOrTeam]) {
                  return teamMap2023to2024[constructorOrTeam];
                }
              }

              if (constructorOrTeam.includes(" ")) {
                return getConstructorIdFromTeam(constructorOrTeam);
              }
              return constructorOrTeam;
            };

            return (
              <li
                key={index}
                className="text-center w-fit even:-mt-[8rem] even:ml-[8rem] even:mb-12 relative group min-h-[100px] sm:min-h-[120px]"
              >
                <div
                  className={classNames(
                    "border-x-2 border-t-2 border-solid w-48 font-display h-32 ml-4 transition-colors",
                    isSelected ? "border-white" : "border-neutral-700",
                  )}
                  style={{
                    borderColor: isSelected && currentDriverColor ? `#${currentDriverColor}` : undefined
                  }}
                />

                <img
                  alt=""
                  className="-mt-32 drop-shadow-[0_0_14px_rgba(0,0,0,0.75)]"
                  src={
                    parseInt(year, 10) >= 2023
                      ? `/images/${parseInt(year, 10) === 2023 ? "2024" : year}/carTopView/${getCarTopView(currentDriverAcronym, gridPosition.driver_number)}.png`
                      : "/images/f1nsight-topview.png"
                  }
                  onError={(e) => {
                    // Final fallback if the specific car image is missing
                    if (e.target.src.indexOf('f1nsight-topview.png') === -1) {
                        e.target.src = "/images/2024/carTopView/VER.png";
                    }
                  }}
                  width={56}
                />

                <div
                  className={classNames(
                    "font-display leading-none text-14 sm:text-18",
                    "absolute top-1/2 -translate-y-1/2",
                    "flex flex-col",
                    "group-odd:right-[90%] group-even:left-[90%]",
                    "group-odd:items-end group-even:items-start",
                  )}
                >
                  <p className="text-neutral-500">
                    {gridPosition.position === "PL"
                      ? "PL"
                      : `P${gridPosition.position}`}
                  </p>
                  <p
                    className="transition-colors"
                    style={{
                      color: isSelected && currentDriverColor
                        ? `#${currentDriverColor}`
                        : driverCode
                          ? "#737373" // neutral-400
                          : "#f1f1f1",
                    }}
                  >
                    {currentDriverAcronym}
                  </p>
                </div>
              </li>
            );
          })}
      </ul>
      <p className="text-[8px] text-white-500 mt-8 text-center uppercase tracking-wider">
        PL denotes Starting from pitlane
      </p>
    </div>
  );
};

export const StartingGridF1A = (props) => {
  const { raceResults, year } = props;

  // Function to create an array of driver codes in the order of grid positions 1-16
  const getDriverCodesByGridPosition = (results) => {
    // Sort a copy of the results by grid position
    const sortedResults = [...results].sort(
      (a, b) => (parseInt(a.grid) || 99) - (parseInt(b.grid) || 99),
    );
    // Initialize an array to store driver codes
    const driverCodes = [];
    // Iterate over sorted results and extract driver code
    for (let i = 0; i < sortedResults.length; i++) {
      if (sortedResults[i]) {
        // Check if result exists for this grid position
        driverCodes.push(sortedResults[i].Driver.code);
      } else {
        driverCodes.push(""); // Push empty string if no driver for this position
      }
    }
    return driverCodes;
  };
  const sortedStartingGrid = getDriverCodesByGridPosition(raceResults);

  return (
    <>
      <h3 className="heading-4 mb-16 text-neutral-400 ml-24">Starting Grid</h3>
      <div className="bg-glow-large p-32 h-fit rounded-xlarge min-w-[22.4rem]">
        <ul className="flex flex-col w-fit m-auto">
          {sortedStartingGrid.map((driverCode, index) => (
            <li className="text-center w-fit even:-mt-[8rem] even:ml-[6rem] even:mb-8 relative group">
              <div
                className={classNames(
                  "border-x-2 border-t-2 border-solid border-neutral-700 w-48 font-display h-32 ml-4",
                )}
              />

              <img
                alt=""
                className="-mt-32 drop-shadow-[0_0_14px_rgba(0,0,0,0.75)]"
                src={
                  wildCardDrivers[year].includes(driverCode)
                    ? `${"/images/2024/F1A/carTopView/wildcard-top.png"}`
                    : `${"/images/" + year + "/F1A/carTopView/" + driverCode + "-top.png"}`
                }
                width={56}
              />

              <div
                className={classNames(
                  "font-display leading-none text-14 sm:text-18",
                  "absolute top-1/2 -translate-y-1/2",
                  "flex flex-col",
                  "group-odd:right-[80%] group-even:left-[80%] sm:group-odd:right-[90%] sm:group-even:left-[90%]",
                  "group-odd:items-end group-even:items-start",
                )}
              >
                <p className="text-neutral-500">P{index + 1}</p>
                <p>{driverCode}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};
