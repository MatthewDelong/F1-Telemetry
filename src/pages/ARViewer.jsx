import React, { useEffect, useState, useRef } from "react";
import "@google/model-viewer/";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { darkenColor } from "../utils/colorUtils";
import { HistoryBar } from "../components/HistoryBar";
import { teamHistory } from "../utils/teamHistory";
import teamColors from "../utils/teamColors.json";
import { getTeamDriversForYear } from "../utils/api";
import { CarTurntable } from "../components/ar/CarTurntable";
import { SeasonTimeline } from "../components/ar/SeasonTimeline";
import { TeamDriverCard } from "../components/ar/TeamDriverCard";

import "./ARViewer.scss";

export const ARViewer = () => {
  const [glbLink, setGlbLink] = useState(ARViewer.defaultProps.glbLink);
  const [team, setTeam] = useState(ARViewer.defaultProps.team);
  const [selectedModelYear, setSelectedModelYear] = useState("2024");
  const [selectedTeamName, setSelectedTeamName] = useState(
    ARViewer.defaultProps.team.name,
  );
  const [teamSelectionOpen, setTeamSelectionOpen] = useState(false);
  const [posterUrl, setPosterUrl] = useState(
    `/images/${ARViewer.defaultProps.team.year || "2024"}/cars/${
      ARViewer.defaultProps.team.name
    }.png`,
  );
  const [teamDrivers, setTeamDrivers] = useState([]);
  const modelViewerRef = useRef(null);
  const showTeamSelectionDrawer = true;

  const teamList = Object.values(teamHistory);
  const getModelTeamNameForYear = (teamNameValue, yearValue) => {
    if (teamNameValue === "audi") {
      return Number(yearValue) < 2026 ? "sauber" : "audi";
    }
    if (teamNameValue === "red_bull_racing") {
      return "rb";
    }
    return teamNameValue;
  };

  const getAvailableYearsForTeam = (teamNameValue) =>
    Object.keys(teamColors)
      .filter(
        (yearValue) =>
          Number(yearValue) >= 2024 &&
          Boolean(
            teamColors[yearValue]?.[
              getModelTeamNameForYear(teamNameValue, yearValue)
            ],
          ),
      )
      .sort((a, b) => Number(a) - Number(b));

  const availableTeamYears = getAvailableYearsForTeam(selectedTeamName);
  const teamName = team.name.replace(/_/g, " ");
  const activeModelTeamName = selectedModelYear
    ? getModelTeamNameForYear(selectedTeamName, selectedModelYear)
    : selectedTeamName;
  const activeTeamColorHex = selectedModelYear
    ? teamColors[selectedModelYear]?.[activeModelTeamName]
    : null;
  const activeThemeColor = activeTeamColorHex
    ? `#${activeTeamColorHex}`
    : team.color;
  const teamHistoryData = team?.teamHistory || [];
  const constructorTitlesCount = team?.constructorTitles?.length || 0;
  const driversChampionshipsCount = team?.driversChampionships?.length || 0;
  const raceVictories = team?.raceVictories || "-";
  const podiums = team?.podiums || "-";
  const polePositions = team?.polePositions || "-";
  const fastestLaps = team?.fastestLaps || "-";
  const isGarageCollectionCar = team?.name === "apx";

  const setTeamModelByYear = (teamNameValue, modelYear) => {
    const validYears = getAvailableYearsForTeam(teamNameValue);
    const targetYear = validYears.includes(String(modelYear))
      ? String(modelYear)
      : validYears[validYears.length - 1];

    if (!targetYear) return;
    const modelTeamName = getModelTeamNameForYear(teamNameValue, targetYear);

    const nextTeam =
      teamList.find((teamItem) => teamItem.name === teamNameValue) ||
      ARViewer.defaultProps.team;

    const imageTeamName = getModelTeamNameForYear(teamNameValue, targetYear);

    setTeam(nextTeam);
    setSelectedModelYear(targetYear);
    setGlbLink(
      `${"/ArFiles/glbs/" + targetYear + "/" + modelTeamName + ".glb?v=v2_ultra"}`,
    );
    setPosterUrl(
      `${"/images/" + targetYear + "/cars/" + imageTeamName + ".png?v=v2_ultra"}`,
    );
    if (typeof trackButtonClick === "function") {
      trackButtonClick(`team-viewer-${teamNameValue}-${targetYear}`);
    }
  };

  const specialEditionModels = [
    {
      id: "apx",
      label: "APX",
      color: "#AE7D0E",
      glbPath: "/ArFiles/glbs/2024/apx.glb?v=v2_ultra",
      imagePath: "/images/2024/cars/apx.png",
      team: { name: "apx", color: "#AE7D0E" },
      trackingId: "team-viewer-apx",
    },
  ];

  const handleSpecialEditionSelect = (specialModel) => {
    setSelectedModelYear(null);
    setGlbLink(`${specialModel.glbPath}`);
    setPosterUrl(`${specialModel.imagePath}`);
    setTeam(specialModel.team);
    if (typeof trackButtonClick === "function") {
      trackButtonClick(specialModel.trackingId);
    }
  };

  const handleTeamSelection = (teamNameValue) => {
    if (!teamNameValue) return;
    const availableYears = getAvailableYearsForTeam(teamNameValue);
    const latestYear = availableYears[availableYears.length - 1] || "2026";
    setSelectedTeamName(teamNameValue);
    setTeamModelByYear(teamNameValue, latestYear);
    setTeamSelectionOpen(false);
  };

  const preloadTeamModel = (teamNameValue) => {
    if (!teamNameValue) return;
    const availableYears = getAvailableYearsForTeam(teamNameValue);
    const latestYear = availableYears[availableYears.length - 1] || "2026";
    const modelTeamName = getModelTeamNameForYear(teamNameValue, latestYear);
    const glbUrl = `/ArFiles/glbs/${latestYear}/${modelTeamName}.glb`;

    // Create a hidden link to prefetch the GLB
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = glbUrl;
    link.as = "fetch";
    document.head.appendChild(link);
  };

  useEffect(() => {
    let mounted = true;
    if (!selectedModelYear || !activeModelTeamName) {
      setTeamDrivers([]);
      return;
    }
    getTeamDriversForYear(selectedModelYear, activeModelTeamName).then(
      (drivers) => {
        console.log("Fetched drivers for", selectedModelYear, activeModelTeamName, drivers);
        if (mounted) setTeamDrivers(drivers || []);
      }
    ).catch(err => console.error("Error fetching drivers:", err));
    return () => {
      mounted = false;
    };
  }, [selectedModelYear, activeModelTeamName]);

  useEffect(() => {
    const modelViewer = modelViewerRef.current;

    const onProgress = (event) => {
      const progressBar = event.target.querySelector(".progress-bar");
      const updatingBar = event.target.querySelector(".update-bar");
      if (updatingBar)
        updatingBar.style.width = `${event.detail.totalProgress * 100}%`;
      if (event.detail.totalProgress === 1 && progressBar) {
        progressBar.classList.add("hide");
      }
    };

    const onLoad = (event) => {
      const progressBar = event.target.querySelector(".progress-bar");
      if (progressBar) progressBar.classList.add("hide");
    };

    if (modelViewer) {
      // Programmatically set decoder paths to ensure they are available before loading starts
      modelViewer.dracoDecoderPath = "/decoders/draco/";
      modelViewer.meshoptDecoderPath = "/decoders/meshopt/meshopt_decoder.js";

      modelViewer.addEventListener("progress", onProgress);
      modelViewer.addEventListener("load", onLoad);
    }

    return () => {
      if (modelViewer) {
        modelViewer.removeEventListener("progress", onProgress);
        modelViewer.removeEventListener("load", onLoad);
      }
    };
  }, [team, glbLink]); // Depend on team and glbLink to re-run the effect when it changes

  return (
    <>
      <div className="ar-container mb-64">
        <div className="model-viewer-wrapper relative">

          <div className="absolute inset-0">
            <CarTurntable
              src={glbLink}
              color={activeThemeColor}
              edgeColor={darkenColor(activeThemeColor, 60)}
              className="w-full h-full"
            />
          </div>

          <div className="ar-badge leading-none text-sm">
            <div>AR Enabled</div>
            <div>Mobile Devices</div>
          </div>

          {/* Team Selection */}
          {showTeamSelectionDrawer && (
            <div
              className={classNames(
                "ar-history shadow-md pt-8 px-8 sm:px-32 rounded-t-lg w-[90%]",
                "transition-all ease-in-out duration-500",
                "absolute bottom-0",
              )}
              style={{
                borderTop: `1px solid ${activeThemeColor}`,
                left: "50%",
                transform: `translate(-50%, ${
                  teamSelectionOpen ? "0%" : "calc(100% - 42px)"
                })`,
                zIndex: 50,
              }}
            >
              <button
                className="w-full flex justify-center items-center py-8 mb-8 group"
                onClick={() => {
                  setTeamSelectionOpen(!teamSelectionOpen);
                  if (typeof trackButtonClick === "function") {
                    trackButtonClick(`team-selection-${team.name}`);
                  }
                }}
              >
                <FontAwesomeIcon
                  icon="chevron-down"
                  className={classNames(
                    "mr-16 transition-transform duration-500",
                    { "rotate-180": !teamSelectionOpen },
                  )}
                />
                <span className="font-display">Select Team</span>
                <FontAwesomeIcon
                  icon="chevron-down"
                  className={classNames(
                    "ml-16 transition-transform duration-500",
                    { "rotate-180": !teamSelectionOpen },
                  )}
                />
              </button>

              <div className="team-stats flex flex-col gap-8 text-left pb-16">
                <div className="divider-glow-dark w-full mb-8" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pb-8 overflow-y-auto max-h-[40vh] custom-scrollbar">
                  {teamList.map((teamItem) => {
                    const availableYears = getAvailableYearsForTeam(
                      teamItem.name,
                    );
                    const latestTeamYear =
                      availableYears[availableYears.length - 1];
                    const modelTeamName = getModelTeamNameForYear(
                      teamItem.name,
                      latestTeamYear,
                    );
                    const teamButtonColor = latestTeamYear
                      ? `#${
                          teamColors[latestTeamYear]?.[modelTeamName] ||
                          "5F0B84"
                        }`
                      : "#5F0B84";
                    const isSelected = selectedTeamName === teamItem.name;

                    return (
                      <button
                        key={teamItem.name}
                        type="button"
                        onClick={() => handleTeamSelection(teamItem.name)}
                        className={classNames(
                          "text-white text-xs uppercase tracking-widest rounded px-8 py-10 transition-all",
                          isSelected
                            ? "ring-1 ring-white/50"
                            : "opacity-80 hover:opacity-100",
                        )}
                        style={{ backgroundColor: teamButtonColor }}
                      >
                        {teamItem.name.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <style jsx="true">{`
          .model-viewer-wrapper {
            background-color: ${activeThemeColor};
            background: radial-gradient(
              circle,
              ${activeThemeColor} 0%,
              ${darkenColor(activeThemeColor, 40)} 80%
            );
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: ${activeThemeColor};
            border-radius: 2px;
          }
        `}</style>
      </div>

      {!isGarageCollectionCar && (
        <div className="flex flex-col justify-center pt-0">
          {/* Team Buttons */}
          <h2 className="tracking-sm uppercase gradient-text-light text-center mb-32">
            Team Garage
          </h2>
          <div className="px-12 pb-32 pt-12">
            <SeasonTimeline
              entries={availableTeamYears.map((modelYear) => ({
                key: modelYear,
                label: modelYear,
                image: `/images/${modelYear}/cars/${getModelTeamNameForYear(selectedTeamName, modelYear)}.png`
              }))}
              selectedKey={selectedModelYear}
              onSelect={(year) => setTeamModelByYear(selectedTeamName, year)}
              color={activeThemeColor}
            />
          </div>


          <div className="px-32">
            <HistoryBar history={teamHistoryData} color={activeThemeColor} />
          </div>

          {teamDrivers.length > 0 && (
            <div className="flex flex-row flex-wrap justify-center gap-16 px-16 mb-48 max-w-[1200px] mx-auto w-full">
              {teamDrivers.map((driver, idx) => (
                <div key={driver.driverId} className="w-full md:w-[calc(50%-12px)] max-w-[500px]">
                  <TeamDriverCard
                    year={selectedModelYear}
                    code={driver.code}
                    number={driver.number}
                    firstName={driver.firstName}
                    lastName={driver.lastName}
                    nationality={driver.nationality}
                    points={driver.points}
                    position={driver.position}
                    wins={driver.wins}
                    teamLabel={teamName}
                    color={activeThemeColor}
                    index={idx}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center px-16 mb-16">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-16 max-w-[1200px] w-full">
              {/* Box 1 */}
              <div className="f1nsight-stat-card">
                <div className="text-[10px] sm:text-[11px] font-bold uppercase font-display leading-[1.1] opacity-80">
                  Constructor<br />Titles
                </div>
                <div className="font-display font-bold leading-[0.85] text-[42px] sm:text-[54px] my-4" style={{ color: activeThemeColor }}>
                  {constructorTitlesCount}
                </div>
                <div className="mt-auto text-[9px] sm:text-[10px] font-display leading-[1.25] opacity-60 tracking-widest break-words">
                  {team?.constructorTitles?.join(" ")}
                </div>
              </div>
              {/* Box 2 */}
              <div className="f1nsight-stat-card">
                <div className="text-[10px] sm:text-[11px] font-bold uppercase font-display leading-[1.1] opacity-80">
                  Drivers'<br />Championships
                </div>
                <div className="font-display font-bold leading-[0.85] text-[42px] sm:text-[54px] my-4" style={{ color: activeThemeColor }}>
                  {driversChampionshipsCount}
                </div>
                <div className="mt-auto text-[9px] sm:text-[10px] font-display leading-[1.25] opacity-60 tracking-widest break-words">
                  {team?.driversChampionships?.join(" ")}
                </div>
              </div>
              {/* Box 3 */}
              <div className="f1nsight-stat-card">
                <div className="text-[10px] sm:text-[11px] font-bold uppercase font-display leading-[1.1] opacity-80">
                  Race<br />Victories
                </div>
                <div className="font-display font-bold leading-[0.85] text-[42px] sm:text-[54px] my-4" style={{ color: activeThemeColor }}>
                  {raceVictories}
                </div>
              </div>
              {/* Box 4 */}
              <div className="f1nsight-stat-card">
                <div className="text-[10px] sm:text-[11px] font-bold uppercase font-display leading-[1.1] opacity-80">
                  Podiums<br />&nbsp;
                </div>
                <div className="font-display font-bold leading-[0.85] text-[42px] sm:text-[54px] my-4" style={{ color: activeThemeColor }}>
                  {podiums}
                </div>
              </div>
              {/* Box 5 */}
              <div className="f1nsight-stat-card">
                <div className="text-[10px] sm:text-[11px] font-bold uppercase font-display leading-[1.1] opacity-80">
                  Pole<br />Positions
                </div>
                <div className="font-display font-bold leading-[0.85] text-[42px] sm:text-[54px] my-4" style={{ color: activeThemeColor }}>
                  {polePositions}
                </div>
              </div>
              {/* Box 6 */}
              <div className="f1nsight-stat-card">
                <div className="text-[10px] sm:text-[11px] font-bold uppercase font-display leading-[1.1] opacity-80">
                  Fastest<br />Laps
                </div>
                <div className="font-display font-bold leading-[0.85] text-[42px] sm:text-[54px] my-4" style={{ color: activeThemeColor }}>
                  {fastestLaps}
                </div>
              </div>
            </div>
          </div>
          <div className="text-center text-[9px] uppercase tracking-widest opacity-40 mb-64 px-16 max-w-[1200px] mx-auto leading-relaxed">
            Poles use qualifying data from 2010, Ergast qualifying for 2003-2009, and grid position 1 for 1950-2002. - Fastest-lap data is only available from 2004.
          </div>
        </div>
      )}

      <div className="flex flex-col justify-center pb-80 bg-gradient-to-b from-black/20 to-transparent">
        <div className="divider-glow-dark mb-48 mx-auto w-[80%]" />

        <h2 className="tracking-wide uppercase  gradient-text-light text-center text-12 mb-32 opacity-80">
          Special Editions
        </h2>

        <div className="px-12 pb-32 max-w-[800px] mx-auto w-full">
          <SeasonTimeline
            entries={specialEditionModels.map((model) => ({
              key: model.id,
              label: model.label,
              image: model.imagePath
            }))}
            selectedKey={team.name === "apx" ? "apx" : null}
            onSelect={(key) => {
              const model = specialEditionModels.find(m => m.id === key);
              if (model) handleSpecialEditionSelect(model);
            }}
            color="#AE7D0E"
          />
        </div>
        <p className="tracking-widest text-neutral-500 text-xs text-center mt-32">
          ©2026 F1-Telemetry
        </p>
      </div>
    </>
  );
};

export default ARViewer;

ARViewer.defaultProps = {
  glbLink: `/ArFiles/glbs/2024/mclaren.glb`,
  team: { ...teamHistory.mclaren, year: "2024" },
  buttonIcon: `/APX/3diconWhite.png`,
  loading: "auto",
  reveal: "auto",
  autoRotate: true,
  cameraControls: true,
  shadowIntensity: "1",
  shadowSoftness: "1",
  environmentImage: "neutral",
  skyboxImage: null,
  exposure: "1",
  ar: true,
  arModes: "scene-viewer webxr quick-look",
  arScale: "auto",
  arPlacement: "floor",
  alt: "APX GP Model",
};
