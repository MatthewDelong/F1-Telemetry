import React, { useEffect, useState, useRef } from "react";
import "@google/model-viewer/";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { darkenColor } from "../utils/darkenColor";
import { HistoryBar } from "../components/HistoryBar";
import { teamHistory } from "../utils/teamHistory";
import teamColors from "../utils/teamColors.json";

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
  const modelViewerRef = useRef(null);
  const showTeamSelectionDrawer = true;

  const teamList = Object.values(teamHistory);
  const getModelTeamNameForYear = (teamNameValue, yearValue) => {
    if (teamNameValue === "audi") {
      return Number(yearValue) < 2026 ? "sauber" : "audi";
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
  const isGarageCollectionCar =
    team?.name === "F1Nsight" || team?.name === "apx";

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

    const imageTeamName = (teamNameValue === "audi" && (targetYear === "2024" || targetYear === "2025")) 
      ? "sauber" 
      : teamNameValue;

    setTeam(nextTeam);
    setSelectedModelYear(targetYear);
    setGlbLink(
      `${"/ArFiles/glbs/" + targetYear + "/" + modelTeamName + ".glb?v=optimized"}`,
    );
    setPosterUrl(
      `${"/images/" + targetYear + "/cars/" + imageTeamName + ".png?v=optimized"}`,
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
      glbPath: "/ArFiles/glbs/2024/apx.glb",
      imagePath: "/images/2024/cars/apx.png",
      team: { name: "apx", color: "#AE7D0E" },
      trackingId: "team-viewer-apx",
    },
    {
      id: "f1nsight2024",
      label: "F1NSIGHT 2024",
      color: "#7500AD",
      glbPath: "/ArFiles/glbs/2024/f1nsight2024.glb",
      imagePath: "/images/2024/cars/F1Nsight.png",
      team: { name: "F1Nsight", color: "#7500AD" },
      trackingId: "team-viewer-f1nsight2024",
    },
    {
      id: "f1nsight2025",
      label: "F1NSIGHT 2025",
      color: "#7500AD",
      glbPath: "/ArFiles/glbs/2025/f1nsight2025.glb",
      imagePath: "/images/2025/cars/F1Nsight.png",
      team: { name: "F1Nsight", color: "#7500AD" },
      trackingId: "team-viewer-f1nsight2025",
    },
    {
      id: "f1nsight2026",
      label: "F1NSIGHT 2026",
      color: "#7500AD",
      glbPath: "/ArFiles/glbs/2026/f1nsight2026.glb",
      imagePath: "/images/2026/cars/F1Nsight.png",
      team: { name: "F1Nsight", color: "#7500AD" },
      trackingId: "team-viewer-f1nsight2026",
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
    const glbUrl = `/ArFiles/glbs/${latestYear}/${modelTeamName}.glb?v=optimized`;
    
    // Create a hidden link to prefetch the GLB
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = glbUrl;
    link.as = 'fetch';
    document.head.appendChild(link);
  };

  const CarSelectionButton = ({
    backgroundColor,
    onClick,
    imageSrc,
    imageAlt,
    label,
  }) => (
    <button
      style={{ backgroundColor }}
      className={classNames(
        "text-white p-2 rounded inline-flex flex-col items-center text-center bg-glow-dark mt-16 max-md:w-[45%] group transition-transform duration-300 hover:scale-95",
      )}
      onClick={onClick}
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        className="w-[16rem] -mt-32 transition-transform duration-300 group-hover:scale-110"
      />
      <p className="font-display text-24 transition-transform duration-300 group-hover:scale-95">
        {label}
      </p>
    </button>
  );

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
          <div className="model-viewer-text-large pointer-events-none">
            {teamName}
          </div>
          <model-viewer
            key={`${selectedTeamName}`}
            ref={modelViewerRef}
            draco-decoder-path="/decoders/draco/"
            meshopt-decoder-path="/decoders/meshopt/meshopt_decoder.js"
            loading="lazy"
            poster={posterUrl}
            src={glbLink}
            ar-modes={ARViewer.defaultProps.arModes}
            ar={ARViewer.defaultProps.ar}
            ar-scale={ARViewer.defaultProps.arScale}
            camera-controls={ARViewer.defaultProps.cameraControls}
            exposure={ARViewer.defaultProps.exposure}
            shadow-intensity={ARViewer.defaultProps.shadowIntensity}
            shadow-softness={ARViewer.defaultProps.shadowSoftness}
            alt={ARViewer.defaultProps.alt}
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            <div className="progress-bar" slot="progress-bar">
              <div className="update-bar" />
            </div>
            <button
              slot="ar-button"
              className="ar-button shadow-md absolute left-1/2 translate-x-[-50%] w-[90%] flex justify-center items-center rounded-b-lg"
              style={{
                borderBottom: `1px solid ${activeThemeColor}`,
                backgroundColor: activeThemeColor,
                zIndex: 100,
              }}
            >
              <img src={"/APX/3diconWhite.png"} alt="AR icon" />
              Launch AR
            </button>
          </model-viewer>

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
                        onMouseEnter={() => preloadTeamModel(teamItem.name)}
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
          <div className="flex flex-row justify-center gap-24 px-12 pb-32 flex-wrap">
            {availableTeamYears.map((modelYear, index) => {
              const modelTeamName = getModelTeamNameForYear(
                selectedTeamName,
                modelYear,
              );
              const yearButtonColor = teamColors[modelYear]?.[modelTeamName]
                ? `#${teamColors[modelYear][modelTeamName]}`
                : activeThemeColor;
              return (
                <CarSelectionButton
                  key={index}
                  backgroundColor={yearButtonColor}
                  onMouseEnter={() => {
                    const mName = getModelTeamNameForYear(selectedTeamName, modelYear);
                    const gUrl = `/ArFiles/glbs/${modelYear}/${mName}.glb?v=optimized`;
                    const l = document.createElement('link');
                    l.rel = 'prefetch';
                    l.href = gUrl;
                    l.as = 'fetch';
                    document.head.appendChild(l);
                  }}
                  onClick={() => {
                    setTeamModelByYear(selectedTeamName, modelYear);
                  }}
                  imageSrc={`${
                    "/images/" +
                    modelYear +
                    "/cars/" +
                    ((selectedTeamName === "audi" && (modelYear === "2024" || modelYear === "2025")) ? "sauber" : selectedTeamName) +
                    ".png"
                  }`}
                  imageAlt={`${selectedTeamName}-${modelYear}`}
                  label={modelYear}
                />
              );
            })}
          </div>

          <h2 className="tracking-sm uppercase gradient-text-light text-center mb-32">
            History
          </h2>
          <div className="px-32">
            <HistoryBar history={teamHistoryData} color={activeThemeColor} />
          </div>

          <h2 className="tracking-sm uppercase gradient-text-light text-center mt-24 mb-16">
            Titles & Championships
          </h2>
          <div
            className="model-viewer-text-medium-wrapper flex flex-row justify-center gap-32 mx-32 mb-64 font-display leading-none"
            style={{ color: activeThemeColor }}
          >
            <div className="model-viewer-text-medium flex flex-col items-end">
              <div className="text-[1.4rem] uppercase font-display">
                Constructor Titles
              </div>
              <div className="text-[3.5rem] font-bold">
                {constructorTitlesCount}
              </div>
            </div>
            <div className="model-viewer-text-medium flex flex-col items-start border-l border-white/10 pl-32">
              <div className="text-[1.4rem] uppercase font-display">
                Drivers Championships
              </div>
              <div className="text-[3.5rem] font-bold">
                {driversChampionshipsCount}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col justify-center pb-80 bg-gradient-to-b from-black/20 to-transparent">
        <div className="divider-glow-dark mb-48 mx-auto w-[80%]" />

        <h2 className="tracking-widest uppercase gradient-text-light text-center text-sm mb-32">
          F1NSIGHT Collection
        </h2>

        <div className="flex flex-row justify-center flex-wrap gap-12 p-32">
          {specialEditionModels.map((specialModel) => (
            <CarSelectionButton
              key={specialModel.id}
              backgroundColor={specialModel.color}
              onClick={() => handleSpecialEditionSelect(specialModel)}
              imageSrc={`${specialModel.imagePath}`}
              imageAlt={specialModel.label}
              label={specialModel.label}
            />
          ))}
        </div>
        <p className="tracking-widest text-neutral-500 text-[10px] text-center mt-32">
          ©2024 F1-Telemetry
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
