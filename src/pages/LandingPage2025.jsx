import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import {
  Button,
  TeammateComparisonButton,
  ViewLatestRaceButton,
  Footer2025,
} from "../components";
import { fetchMostRecentRace } from "../utils/api";
import { getCurrentYear } from "../utils/currentYear";
import DatesSection from "../layouts/DatesSection";
import teamColorsData from "../utils/teamColors.json";
import raceDetails from "../config/raceDetails.json";

const currentYear = getCurrentYear();
const HERO_BACKGROUND_IMAGES = [
  "/images/hero2.jpg",
  "/images/hero3.jpg",
  "/images/hero4.jpg",
  "/images/hero5.jpg",
];
const HERO_STATIC_SMALL_SCREEN_INDEX = 3;
const LARGE_BREAKPOINT_PX = 1024;
const HERO_HOLD_MS = 9000;
const HERO_FADE_MS = 1200;

export function LandingPage2025() {
  const [raceData, setRaceData] = useState(null);
  const snapContainerRef = useRef(null);
  const [heroBgIndex, setHeroBgIndex] = useState(0);
  const [isHeroImageVisible, setIsHeroImageVisible] = useState(true);
  const [isBelowLargeBreakpoint, setIsBelowLargeBreakpoint] = useState(
    typeof window !== "undefined"
      ? window.innerWidth < LARGE_BREAKPOINT_PX
      : false,
  );
  const selectedYear = currentYear;

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();

      // Get all past races from raceDetails.json sorted newest first
      const pastRaces = raceDetails
        .filter((r) => new Date(`${r.date}T${r.time}`) < now)
        .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));

      // Try each past race newest first until we find one with podium data
      for (const race of pastRaces) {
        const round = parseInt(race.round, 10);
        const season = parseInt(race.season, 10);
        try {
          const data = await fetchMostRecentRace(season, round);
          // Check if it has podium results (positions 1-3)
          const hasPodium = data?.raceResults?.some(
            (r) => [1, 2, 3].includes(parseInt(r.position, 10))
          );
          if (hasPodium) {
            setRaceData(data);
            return;
          }
        } catch (e) {
          continue;
        }
      }

      // Absolute fallback — just fetch most recent and show whatever we get
      const fallback = await fetchMostRecentRace(currentYear);
      setRaceData(fallback);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsBelowLargeBreakpoint(window.innerWidth < LARGE_BREAKPOINT_PX);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input or textarea
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return;
      }

      if (e.key === "Home" || e.code === "Home") {
        e.preventDefault();
        snapContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      } else if (e.key === "End" || e.code === "End") {
        e.preventDefault();
        if (snapContainerRef.current) {
          snapContainerRef.current.scrollTo({
            top: snapContainerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isBelowLargeBreakpoint) {
      setHeroBgIndex(HERO_STATIC_SMALL_SCREEN_INDEX);
      setIsHeroImageVisible(true);
      return undefined;
    }

    let swapTimeoutId;

    const rotationInterval = window.setInterval(
      () => {
        setIsHeroImageVisible(false);

        swapTimeoutId = window.setTimeout(() => {
          setHeroBgIndex(
            (currentIndex) =>
              (currentIndex + 1) % HERO_BACKGROUND_IMAGES.length,
          );
          window.requestAnimationFrame(() => {
            setIsHeroImageVisible(true);
          });
        }, HERO_FADE_MS);
      },
      HERO_HOLD_MS + HERO_FADE_MS * 2,
    );

    return () => {
      window.clearInterval(rotationInterval);
      if (swapTimeoutId) {
        window.clearTimeout(swapTimeoutId);
      }
    };
  }, [isBelowLargeBreakpoint]);

  let navigate = useNavigate();
  const navigateToRaceResult = (race) => {
    if (race?.meetingKey) {
      navigate(`/race/${race.meetingKey}`);
    } else {
      console.error("Meeting key not found for this race.");
    }
  };

  // Helper: get team colour from teamColors.json
  const getTeamColor = (constructorId) => {
    if (!constructorId) return "#ffffff";
    const yearColors =
      teamColorsData[String(selectedYear)] || teamColorsData["2025"] || {};
    const key = constructorId.toLowerCase().replace(/\s+/g, "_");
    return yearColors[key] ? `#${yearColors[key]}` : "#ffffff";
  };

  // Build top-3 podium data from raceResults
  const podiumDrivers = (raceData?.raceResults || [])
    .filter((r) => [1, 2, 3].includes(parseInt(r.position, 10)))
    .sort((a, b) => parseInt(a.position, 10) - parseInt(b.position, 10))
    .map((r) => {
      const pos = parseInt(r.position, 10);
      const driverCode =
        r.driver?.code ||
        r.driver?.familyName?.substring(0, 3).toUpperCase() ||
        "???";
      // api.js maps result.Constructor → r.constructor (lowercase)
      const constructorId = r.constructor?.constructorId || "";
      const teamName = r.constructor?.name || "";
      // P1 has race time, P2/P3 time is gap string like "+13.722" or null
      const gap =
        pos === 1
          ? r.time || "WINNER"
          : r.time && r.time !== "N/A"
            ? r.time.startsWith("+")
              ? r.time
              : `+${r.time}`
            : r.status && r.status !== "Finished"
              ? r.status
              : "—";
      return {
        position: pos,
        code: driverCode,
        team: teamName,
        constructorId,
        gap,
        fastestLap: r.fastestLap?.rank === "1",
        headshot: `/images/${selectedYear}/drivers/${driverCode}.png`,
      };
    });

  const p1 = podiumDrivers.find((d) => d.position === 1);
  const p2 = podiumDrivers.find((d) => d.position === 2);
  const p3 = podiumDrivers.find((d) => d.position === 3);

  const PodiumBlock = ({ driver, heightClass, posLabel }) => {
    if (!driver) return null;
    const color = getTeamColor(driver.constructorId);
    return (
      <div
        className="flex flex-col items-center"
        style={{ position: "relative" }}
      >
        {/* Headshot */}
        <div
          className="flex justify-center"
          style={{ position: "absolute", bottom: "100%", width: "100%" }}
        >
          <img
            src={driver.headshot}
            alt={driver.code}
            onError={(e) => {
              e.target.src = "/images/wildcardicon.png";
            }}
            style={{
              height: driver.position === 1 ? "170px" : "140px",
              objectFit: "contain",
              objectPosition: "bottom",
              filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.6))",
            }}
          />
        </div>
        {/* Box top (3D effect) */}
        <div
          style={{
            width: "100%",
            height: "20px",
            background: "linear-gradient(180deg, #666 0%, #3a3a3a 100%)",
            transform: "perspective(300px) rotateX(45deg)",
            transformOrigin: "bottom",
            borderTop: "1px solid rgba(255,255,255,0.4)",
          }}
        />
        {/* Box front */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            width: "100%",
            minHeight: driver.position === 1 ? "115px" : "95px",
            background: "linear-gradient(180deg, #2a2a2a 0%, #0a0a0a 100%)",
            boxShadow: "0 15px 30px rgba(0,0,0,0.8)",
            borderLeft: "1px solid rgba(255,255,255,0.05)",
            borderRight: "1px solid rgba(255,255,255,0.05)",
            padding: "8px 4px",
          }}
        >
          {/* Position + Code */}
          <div
            className="flex flex-col items-center"
            style={{ marginBottom: "3px" }}
          >
            <span
              style={{
                fontSize: driver.position === 1 ? "1.3rem" : "1.1rem",
                fontWeight: 800,
                textTransform: "uppercase",
                color: "#777",
              }}
            >
              {posLabel}
            </span>
            <span
              style={{
                fontSize: driver.position === 1 ? "1.4rem" : "1.2rem",
                fontWeight: 800,
                textTransform: "uppercase",
                color: "#fff",
              }}
            >
              {driver.code}
            </span>
          </div>
          {/* Team name */}
          <div
            style={{
              fontSize: driver.position === 1 ? "0.85rem" : "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color,
              marginBottom: "4px",
              opacity: 0.9,
            }}
          >
            {driver.team}
          </div>
          {/* Divider */}
          <div
            style={{
              width: "70%",
              height: "2px",
              background: "rgba(255,255,255,0.15)",
              marginBottom: "6px",
            }}
          />
          {/* Gap / time */}
          <div
            className="flex items-center gap-1"
            style={{
              fontSize: driver.position === 1 ? "1rem" : "0.9rem",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            {driver.gap}
            {driver.fastestLap && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                width="14"
                height="14"
              >
                <circle cx="256" cy="256" r="256" fill="#ffffff" />
                <path
                  fill="#571680"
                  transform="translate(38.4 38.4) scale(0.85)"
                  d="M256 0a256 256 0 1 1 0 512 256 256 0 1 1 0-512zM232 120l0 136c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2 280 120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"
                />
              </svg>
            )}
          </div>
        </div>
      </div>
    );
  };

  const latestResultsLayout = () => {
    return (
      <>
        <div className="flex flex-col items-center z-10 w-full">
          <p className="text-xl tracking-xl uppercase gradient-text-light mb-16">
            Latest F1 Race Results
          </p>
          <p className="heading-2 text-center uppercase">
            {selectedYear} {raceData?.raceName}
          </p>

          {/* Podium */}
          <div
            className="flex items-end justify-center mt-8 w-full"
            style={{ paddingTop: "180px", paddingBottom: "30px", gap: 0 }}
          >
            {/* P2 */}
            <div style={{ width: "120px", zIndex: 1, position: "relative" }}>
              <PodiumBlock driver={p2} posLabel="P2" />
            </div>
            {/* P1 */}
            <div
              style={{
                width: "150px",
                zIndex: 2,
                margin: "0 -5px",
                position: "relative",
              }}
            >
              <PodiumBlock driver={p1} posLabel="P1" />
            </div>
            {/* P3 */}
            <div style={{ width: "120px", zIndex: 1, position: "relative" }}>
              <PodiumBlock driver={p3} posLabel="P3" />
            </div>
          </div>

          <div className="divider-glow-dark mb-16 mt-4" />
          <p className="text-center mb-56 w-2/3">
            Get detailed stats, strategic insights, and experience the
            interactive telemetry map of the race.
          </p>
          <Button
            as="button"
            onClick={() => navigateToRaceResult(raceData)}
            className="mb-48 -mt-24 mx-auto"
            size="md"
          >
            View Full Race Details
          </Button>
        </div>

        <div className="bg-neutral-950/40 absolute w-full h-full overflow-hidden">
          <video
            src={
              raceData && raceData.Circuit && raceData.Circuit.circuitId
                ? `${"/mapsAnimated/" + raceData.Circuit.circuitId + "Animated.mp4"}`
                : null
            }
            loop
            autoPlay
            muted
            playsInline
            className="object-cover opacity-15 h-full w-full"
          />
        </div>
      </>
    );
  };

  const ButtonClasses =
    "bg-glow-dark bg-glow--hover-dark rounded-lg w-full py-2 px-16 group";
  const heroImageSource = HERO_BACKGROUND_IMAGES[heroBgIndex];
  const topThreeDriverCodes = (raceData?.raceResults || [])
    .map((result) => result?.driver?.code)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="snap-container" ref={snapContainerRef}>
      <section className="bg-black relative h-[100dvh] snap-start overflow-hidden flex items-center justify-center">
        <img
          src={heroImageSource}
          alt=""
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
          style={{
            opacity: isHeroImageVisible ? 0.4 : 0,
            filter: "brightness(1.2) contrast(1.0)",
            transitionDuration: `${HERO_FADE_MS}ms`,
          }}
          onError={(event) => {
            event.target.onerror = null;
            event.target.src = "/images/HeroImage.png"; // Fallback to a core static hero if rotation fails
            console.error(
              "Landing hero image failed to load:",
              event.currentTarget.src,
            );
          }}
        />

        <div className="mx-auto text-center px-16 relative z-10">
          <h1 className="heading-1 mb-16 leading-none">
            Go Beyond the Race Results
          </h1>
          <p className="text-neutral-300 text-3xl mb-24 mx-auto leading-none">
            Explore telemetry, compare drivers, and understand every race in
            depth.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-12 mt-48 sm:mt-96">
            <ViewLatestRaceButton
              meetingKey={raceData?.meetingKey}
              driverCodes={topThreeDriverCodes}
              year={selectedYear}
            />
            <TeammateComparisonButton year={2026} />
          </div>
        </div>
      </section>
      <section className="h-[100dvh] snap-start relative flex items-center justify-center bg-neutral-950 bg-glow-dark-bottom overflow-hidden pt-[64px]">
        {latestResultsLayout()}
      </section>

      <DatesSection />

      <section className="snap-start bg-black">
        <Footer2025 />
      </section>
    </div>
  );
}
