import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Button, DriverCard, Footer } from "../components";
import { fetchMostRecentRace } from "../utils/api";
import { fetchMostRecentRaceWeekend } from "../utils/apiF1a";
import { F1ALogo } from "../components/F1ALogo";
import { F2Logo } from "../components/F2Logo";
import HeroSection from "../layouts/HeroSection";
import ComparisonsSection from "../layouts/ComparisonsSection";
import ArSection from "../layouts/ArSection";
import TelemetrySection from "../layouts/TelemetrySection";
import { getCurrentYear } from "../utils/currentYear";

const currentYear = getCurrentYear();

export function FeaturesPage() {
  const [raceData, setRaceData] = useState(null);
  const snapContainerRef = useRef(null);
  const [layoutSmall, setLayoutSmall] = useState();
  const [layoutMobile, setLayoutMobile] = useState();
  const selectedYear = currentYear;

  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
    container: snapContainerRef,
  });
  const yDecoration2 = useTransform(scrollYProgress, [0, 1], [150, -50]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const mostRecentRace = await fetchMostRecentRace(currentYear);
      setRaceData(mostRecentRace);
    };

    fetchData();

    const handleLayout = () => {
      setLayoutSmall(window.innerWidth > 767 && window.innerWidth < 1024);
      setLayoutMobile(window.innerWidth < 1024);
    };
    handleLayout();

    window.addEventListener("resize", handleLayout);
    return () => window.removeEventListener("resize", handleLayout);
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

  const navigateToRaceResult = (race) => {
    if (race?.meetingKey) {
      navigate(`/race/${race.meetingKey}`);
    } else {
      console.error("Meeting key not found for this race.");
    }
  };

  return (
    <div className="snap-container" ref={snapContainerRef}>
      <HeroSection layoutMobile={layoutMobile} container={snapContainerRef} />
      <TelemetrySection
        layoutMobile={layoutMobile}
        onClick={() => navigateToRaceResult(raceData)}
        container={snapContainerRef}
      />
      <ComparisonsSection
        layoutMobile={layoutMobile}
        container={snapContainerRef}
      />
      <ArSection layoutMobile={layoutMobile} container={snapContainerRef} />
      <section
        className="snap-start bg-black"
        style={{ scrollSnapAlign: "start" }}
      >
        <Footer />
      </section>
    </div>
  );
}
