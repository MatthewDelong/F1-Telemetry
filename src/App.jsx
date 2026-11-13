import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import classNames from "classnames";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faBars,
  faBell,
  faCarSide,
  faChartLine,
  faChevronDown,
  faChevronRight,
  faCircle,
  faCircleDown,
  faCircleInfo,
  faCircleUp,
  faClock,
  faCode,
  faFileContract,
  faFlag,
  faFlagCheckered,
  faRobot,
  faTowerBroadcast,
  faTriangleExclamation,
  faUser,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import {
  Header,
  Footer,
  ResultsSelector,
  ReloadPrompt,
  CookieBanner,
  NewsTicker,
} from "./components";
import { PageLoader } from "./components/PageLoader";
import { F1ALogo } from "./components/F1ALogo";
import { F2Logo } from "./components/F2Logo";
import { LandingPage } from "./pages/LandingPage";
import { ScrollToTop } from "./utils/ScrollToTop";
import { getCurrentYear } from "./utils/currentYear";

import "./App.scss";

const lazyNamed = (loader, name) =>
  lazy(() => loader().then((m) => ({ default: m[name] })));

const RaceResultsPage = lazyNamed(() => import("./pages/RaceResultsPage"), "RaceResultsPage");
const DriverStandings = lazyNamed(() => import("./pages/DriverStandings"), "DriverStandings");
const ConstructorStandings = lazyNamed(() => import("./pages/ConstructorStandings"), "ConstructorStandings");
const RaceResultsPageF1a = lazyNamed(() => import("./pages/f1a/RaceResultsPageF1a"), "RaceResultsPageF1a");
const DriverStandingsF1a = lazyNamed(() => import("./pages/f1a/DriverStandingsF1a"), "DriverStandingsF1a");
const ConstructorStandingsF1a = lazyNamed(() => import("./pages/f1a/ConstructorStandingsF1a"), "ConstructorStandingsF1a");
const RaceResultsPageF2 = lazyNamed(() => import("./pages/f2/RaceResultsPageF2"), "RaceResultsPageF2");
const DriverStandingsF2 = lazyNamed(() => import("./pages/f2/DriverStandingsF2"), "DriverStandingsF2");
const ConstructorStandingsF2 = lazyNamed(() => import("./pages/f2/ConstructorStandingsF2"), "ConstructorStandingsF2");

const FeaturesPage = lazyNamed(() => import("./pages/FeaturesPage"), "FeaturesPage");
const DriverComparison = lazyNamed(() => import("./pages/DriverComparison"), "DriverComparison");
const TeammatesComparison = lazyNamed(() => import("./pages/TeammatesComparison"), "TeammatesComparison");
const RacePage = lazyNamed(() => import("./pages/RacePage"), "RacePage");
const RacePageF1a = lazyNamed(() => import("./pages/f1a/RacePageF1a"), "RacePageF1a");
const RacePageF2 = lazyNamed(() => import("./pages/f2/RacePageF2"), "RacePageF2");
const TeamCards = lazyNamed(() => import("./pages/TeamCards"), "TeamCards");
const StatsPage = lazyNamed(() => import("./pages/Stats/StatsPage"), "StatsPage");
const LiveDashboard = lazy(() => import("./pages/LiveDashboard/LiveDashboard"));
const SocialMedia = lazy(() => import("./pages/Socialmedia/SocialMedia"));
const PrivacyPolicy = lazyNamed(() => import("./pages/PrivacyPolicy"), "PrivacyPolicy");
const Trademarks = lazyNamed(() => import("./pages/Trademarks"), "Trademarks");
const BehindTheCode = lazyNamed(() => import("./pages/BehindTheCode"), "BehindTheCode");
const AdminPage = lazyNamed(() => import("./pages/Admin"), "AdminPage");

library.add(
  faBars,
  faBell,
  faCarSide,
  faChartLine,
  faChevronDown,
  faChevronRight,
  faCircle,
  faCircleDown,
  faCircleInfo,
  faCircleUp,
  faClock,
  faCode,
  faFileContract,
  faFlag,
  faFlagCheckered,
  faRobot,
  faTowerBroadcast,
  faTriangleExclamation,
  faUser,
  faXmark,
);

const currentYear = getCurrentYear();

function App() {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [resultPage, setResultPage] = useState("");
  const [resultPagePath, setResultPagePath] = useState("");

  useEffect(() => {
    // Update title for PWA standalone window to show full tagline
    if (window.matchMedia("(display-mode: standalone)").matches) {
      document.title =
        "F1 TELEMETRY - In-depth Formula One Telemetry and Analysis";
    } else {
      document.title = "F1 TELEMETRY";
    }
  }, []);

  return (
    <div className="app-container flex flex-col min-h-screen">
      <Router>
        <ScrollToTop />
        <Header
          setResultPage={setResultPage}
          setResultPagePath={setResultPagePath}
        />
        <TickerWrapper />
        <MainContent
          setSelectedYear={setSelectedYear}
          selectedYear={selectedYear}
          resultPage={resultPage}
          resultPagePath={resultPagePath}
          setResultPagePath={setResultPagePath}
        />
        <ReloadPrompt />
        <CookieBanner />
      </Router>
    </div>
  );
}

/** Render the news ticker only on the landing page, as a fixed overlay. */
function TickerWrapper() {
  const routerLocation = useLocation();
  const location = routerLocation.pathname;
  if (location !== "/") return null;
  return <NewsTicker />;
}

function MainContent({
  setSelectedYear,
  selectedYear,
  resultPage,
  resultPagePath,
  setResultPagePath,
}) {
  const routerLocation = useLocation();
  const location = routerLocation.pathname;
  const validPaths = [
    "/race-results",
    "/constructor-standings",
    "/driver-standings",
  ];
  const validF1APaths = useMemo(
    () => [
      "/f1a/race-results",
      "/f1a/constructor-standings",
      "/f1a/driver-standings",
      "/race-f1a/",
    ],
    [],
  );
  const validF2Paths = useMemo(
    () => [
      "/f2/race-results",
      "/f2/constructor-standings",
      "/f2/driver-standings",
      "/race-f2/",
    ],
    [],
  );

  const isF1a =
    validF1APaths.includes(location) || location.startsWith("/race-f1a/");
  const isF2 =
    validF2Paths.includes(location) || location.startsWith("/race-f2/");

  const currentSeries = isF1a ? "F1A" : isF2 ? "F2" : "F1";

  useEffect(() => {
    // Automatically default to current year when changing between series
    // (e.g. preventing F2 from trying to load 2024 data if it doesn't exist)
    setSelectedYear(currentYear);
  }, [currentSeries, setSelectedYear]);

  useEffect(() => {
    // Always clean up first
    document.body.classList.remove(
      "bg-gradient-f1a",
      "bg-gradient-f2",
      "bg-gradient",
    );

    if (isF1a) {
      document.body.classList.add("bg-gradient-f1a");
    } else if (isF2) {
      document.body.classList.add("bg-gradient-f2");
    } else {
      document.body.classList.add("bg-gradient");
    }

    return () => {
      document.body.classList.remove(
        "bg-gradient-f1a",
        "bg-gradient-f2",
        "bg-gradient",
      );
    };
  }, [location]);

  return (
    <>
      <div
        className={classNames("grow", {
          "pt-[64px]": location !== "/" && location !== "/features",
        })}
      >
        {validPaths.includes(location) && (
          <ResultsSelector
            className={classNames(
              "mt-32 relative z-[100]",
              location === "/driver-standings" ? "mb-14" : "mb-24",
            )}
            setSelectedYear={setSelectedYear}
            selectedYear={selectedYear}
            resultPage={resultPage}
            resultPagePath={resultPagePath}
            championshipLevel={isF1a ? "F1A" : isF2 ? "F2" : undefined}
          />
        )}
        {(isF1a || isF2) && (
          <div className="mt-32 mb-16 relative z-[100]">
            {isF1a && <F1ALogo height={48} className="mx-auto mb-16" />}
            {isF2 && <F2Logo height={48} className="mx-auto mb-16" />}
            <ResultsSelector
              setSelectedYear={setSelectedYear}
              selectedYear={selectedYear}
              resultPage={resultPage}
              resultPagePath={resultPagePath}
              championshipLevel={isF1a ? "F1A" : "F2"}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <Suspense fallback={<PageLoader />}>
              <Routes location={routerLocation}>
                <Route
                  path="/"
                  element={<LandingPage setResultPagePath={setResultPagePath} />}
                />
          <Route path="/features" element={<FeaturesPage />} />
          <Route
            path="/race-results"
            element={<RaceResultsPage selectedYear={selectedYear} />}
          />
          <Route
            path="/constructor-standings"
            element={<ConstructorStandings selectedYear={selectedYear} />}
          />
          <Route
            path="/driver-standings"
            element={<DriverStandings selectedYear={selectedYear} />}
          />
          <Route
            path="/teammates-comparison/:urlYear?/:urlTeam?"
            element={<TeammatesComparison />}
          />
          <Route
            path="/driver-comparison/:urlDriver1?/:urlDriver2?"
            element={<DriverComparison selectedYear={selectedYear} />}
          />
          <Route path="/race/:raceId" element={<RacePage />} />
          <Route
            path="/team-garages"
            element={<TeamCards selectedYear={selectedYear} />}
          />
          <Route path="/stats" element={<StatsPage />} />
          {/* F1A Routes */}
          <Route
            path="/f1a/race-results"
            element={
              <RaceResultsPageF1a
                selectedYear={selectedYear}
                championshipLevel="F1A"
              />
            }
          />
          <Route
            path="/race-f1a/:raceId"
            element={<RacePageF1a championshipLevel="F1A" />}
          />
          <Route
            path="/f1a/driver-standings"
            element={
              <DriverStandingsF1a
                selectedYear={selectedYear}
                championshipLevel="F1A"
              />
            }
          />
          <Route
            path="/f1a/constructor-standings"
            element={
              <ConstructorStandingsF1a
                selectedYear={selectedYear}
                championshipLevel="F1A"
              />
            }
          />
          {/* F2 Routes */}
          <Route
            path="/f2/race-results"
            element={
              <RaceResultsPageF2
                selectedYear={selectedYear}
                championshipLevel="F2"
              />
            }
          />
          <Route
            path="/race-f2/:raceId"
            element={<RacePageF2 championshipLevel="F2" />}
          />
          <Route
            path="/f2/driver-standings"
            element={
              <DriverStandingsF2
                selectedYear={selectedYear}
                championshipLevel="F2"
              />
            }
          />
          <Route
            path="/f2/constructor-standings"
            element={
              <ConstructorStandingsF2
                selectedYear={selectedYear}
                championshipLevel="F2"
              />
            }
          />
          {/* Live Timings Route */}
          <Route path="/live" element={<LiveDashboard />} />
          {/* Social Media Routes - not publicly available */}
          <Route path="/social-media" element={<SocialMedia />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/trademarks" element={<Trademarks />} />
                <Route path="/behind-the-code" element={<BehindTheCode />} />
                <Route path="/admin" element={<AdminPage />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
      {location !== "/" && location !== "/features" && <Footer />}
    </>
  );
}

export default App;
