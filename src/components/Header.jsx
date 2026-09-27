import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { F1TelemetryLogo as Logo } from "./F1TelemetryLogo";
import { ReactSelectComponent } from "./Select";
import { RaceSelector } from "./RaceSelector";
import { fetchRacesAndSessions } from "../utils/api";
import { Modal } from "./Modal";
import { getCurrentYear } from "../utils/currentYear";
import { F1ALinks, F1Links, F2Links } from "./Links";

export const Header = () => {
  const [races, setRaces] = useState([]);
  const [selectedYear, setSelectedYear] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [resultsDropdownOpen, setResultsDropdownOpen] = useState(false);
  const [comparisonsDropdownOpen, setComparisonsDropdownOpen] = useState(false);
  const [raceViewerDropdownOpen, setRaceViewerDropdownOpen] = useState(false);

  const resultsRef = useRef(null);
  const comparisonsRef = useRef(null);
  const raceViewerRef = useRef(null);
  const headerRef = useRef(null);

  const location = useLocation().pathname;
  const collapsible = location.startsWith("/race/");

  useEffect(() => {
    const handleResize = () => {
      setHeaderOpen(window.innerWidth > 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedYear.length > 0) {
      const fetchData = async () => {
        const data = await fetchRacesAndSessions(selectedYear);
        setRaces(data);
      };

      fetchData();
    }
  }, [selectedYear]);

  const handleClickOutside = (event) => {
    if (
      raceViewerRef.current &&
      !raceViewerRef.current.contains(event.target)
    ) {
      setRaceViewerDropdownOpen(false);
    }
    if (resultsRef.current && !resultsRef.current.contains(event.target)) {
      setResultsDropdownOpen(false);
    }
    if (
      comparisonsRef.current &&
      !comparisonsRef.current.contains(event.target)
    ) {
      setComparisonsDropdownOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const generateYears = (startYear) => {
    const years = [];
    const currentYear = getCurrentYear();
    for (let year = currentYear; year >= startYear; year--) {
      years.push({ value: year.toString(), label: year.toString() });
    }
    return years;
  };

  const yearOptions = generateYears(2023);

  const handleYearChange = (selectedOption) => {
    setSelectedYear(selectedOption.value);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const raceSelectorContent = (
    <>
      <ReactSelectComponent
        placeholder="Select Year"
        options={yearOptions}
        onChange={handleYearChange}
        value={yearOptions.find((option) => option.value === selectedYear)}
        className="w-full mb-8"
        isSearchable={false}
      />
      <RaceSelector
        races={races}
        selectedYear={selectedYear}
        onChange={() => {
          setRaceViewerDropdownOpen(false);
          setIsOpen(false);
        }}
      />
    </>
  );

  return (
    <>
      <header
        className={classNames("global-header max-md:transition-all", {
          "!top-[-58px]": !headerOpen && collapsible,
          "!absolute": location === "/" || location === "/features",
        })}
        ref={headerRef}
      >
        <div
          className={classNames(
            "global-header__main-nav bg-neutral-900/60 backdrop-blur-md border-none shadow-none",
            {
              "shadow-lg": location !== "/",
            },
          )}
        >
          <div className="global-header__main-nav__left flex items-center gap-32">
            <Link to="/">
              <Logo height={48} />
            </Link>
          </div>

          {/* Mobile */}
          <button className="md:hidden p-8" onClick={toggleOpen}>
            <FontAwesomeIcon icon="bars" className="fa-2x" />
          </button>

          {collapsible && (
            <button
              className="absolute top-full right-20 bg-glow-large py-2 px-10 rounded-b-sm md:hidden"
              onClick={() => setHeaderOpen(!headerOpen)}
            >
              <FontAwesomeIcon
                icon="chevron-down"
                className={classNames("fa-1x transition-all", {
                  "transform rotate-180": headerOpen,
                })}
              />
            </button>
          )}

          {/* Desktop */}
          <div className="flex items-center gap-16 max-md:hidden">
            <div className="relative w-max uppercase text-lg ">
              <Link
                to="/live"
                className="global-header__main-nav__button py-12 px-24 rounded-[.8rem] uppercase tracking-xs flex items-center gap-8 text-red-500 hover:text-red-400 transition-colors"
              >
                <span className="w-8 h-8 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]"></span>
                Live Timings
              </Link>
            </div>
            <div className="relative w-max uppercase text-lg ">
              <Link
                to="/features"
                className="global-header__main-nav__button py-12 px-24 rounded-[.8rem] uppercase tracking-xs"
              >
                Features
              </Link>
            </div>
            <div className="relative w-max text-lg" ref={resultsRef}>
              <button
                className="global-header__main-nav__button py-12 px-24 rounded-[.8rem] uppercase tracking-xs"
                onClick={() => {
                  setResultsDropdownOpen(!resultsDropdownOpen);
                  setComparisonsDropdownOpen(false);
                  setRaceViewerDropdownOpen(false);
                }}
              >
                Results
                <FontAwesomeIcon
                  icon="chevron-down"
                  className={classNames(
                    "global-header__main-nav__button__icon opacity-0",
                    { "opacity-100": resultsDropdownOpen },
                  )}
                />
              </button>
              <div
                className={classNames(
                  "absolute right-1 -mt-2 pt-12 w-max animate-fade-in-down",
                  resultsDropdownOpen ? "block" : "hidden",
                )}
              >
                <div className="flex flex-row gap-16 p-16 rounded-xl glass shadow-2xl">
                  <div className="flex flex-col gap-4 p-16 rounded-lg glass-dark min-w-[240px]">
                    <F1Links
                      onClick={() => {
                        setResultsDropdownOpen(false);
                        setIsOpen(false);
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-4 p-16 rounded-lg glass-dark min-w-[240px]">
                    <F2Links
                      onClick={() => {
                        setResultsDropdownOpen(false);
                        setIsOpen(false);
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-4 p-16 rounded-lg glass-dark min-w-[240px]">
                    <F1ALinks
                      onClick={() => {
                        setResultsDropdownOpen(false);
                        setIsOpen(false);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="relative w-max text-lg" ref={comparisonsRef}>
              <button
                className="global-header__main-nav__button py-12 px-24 rounded-[.8rem] uppercase tracking-xs"
                onClick={() => {
                  setComparisonsDropdownOpen(!comparisonsDropdownOpen);
                  setResultsDropdownOpen(false);
                  setRaceViewerDropdownOpen(false);
                }}
              >
                Comparisons
                <FontAwesomeIcon
                  icon="chevron-down"
                  className={classNames(
                    "global-header__main-nav__button__icon opacity-0",
                    { "opacity-100": comparisonsDropdownOpen },
                  )}
                />
              </button>
              <div
                className={classNames(
                  "absolute right-1 -mt-2 pt-12 w-max animate-fade-in-down",
                  comparisonsDropdownOpen ? "block" : "hidden",
                )}
              >
                <div className="flex flex-col gap-12 p-16 rounded-xl glass shadow-2xl">
                  <div className="w-[320px] glass-dark border border-white/5 py-16 px-20 rounded-lg">
                    <p className="uppercase tracking-xs gradient-text-electric-blue text-lg font-bold">
                      Teammate Comparisons
                    </p>
                    <div className="divider-glow-dark mt-8 mb-12 border-t border-neutral-700/50" />
                    <NavLink
                      to="/teammates-comparison"
                      className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
                      onClick={() => {
                        setComparisonsDropdownOpen(false);
                        isOpen && setIsOpen(false);
                      }}
                    >
                      Compare teammates directly, evaluating their performances
                      in the same car during specific seasons.
                    </NavLink>
                  </div>
                  <div className="w-[320px] glass-dark border border-white/5 py-16 px-20 rounded-lg">
                    <p className="uppercase tracking-xs gradient-text-electric-blue text-lg font-bold">
                      Driver Comparisons
                    </p>
                    <div className="divider-glow-dark mt-8 mb-12 border-t border-neutral-700/50" />
                    <NavLink
                      to="/driver-comparison"
                      className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
                      onClick={() => {
                        setComparisonsDropdownOpen(false);
                        isOpen && setIsOpen(false);
                      }}
                    >
                      Any driver from any team throughout F1's illustrious
                      history. This feature empowers you to examine a vast array
                      of performance metrics, such as the number of race wins,
                      pole positions, and qualifying statistics.
                    </NavLink>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative w-max" ref={raceViewerRef}>
              <button
                className="global-header__main-nav__button py-12 px-24 rounded-[.8rem] uppercase tracking-xs text-lg "
                onClick={() => {
                  setRaceViewerDropdownOpen(!raceViewerDropdownOpen);
                  setResultsDropdownOpen(false);
                  setComparisonsDropdownOpen(false);
                }}
              >
                Race Viewer
                <FontAwesomeIcon
                  icon="chevron-down"
                  className={classNames(
                    "global-header__main-nav__button__icon opacity-0",
                    {
                      "opacity-100": raceViewerDropdownOpen,
                    },
                  )}
                />
              </button>
              <div
                className={classNames(
                  "absolute right-1 -mt-2 pt-12 w-max animate-fade-in-down",
                  raceViewerDropdownOpen ? "block" : "hidden",
                )}
              >
                <div className="flex flex-col p-16 rounded-xl glass shadow-2xl min-w-[300px]">
                  <div className="glass-dark border border-white/5 p-20 rounded-lg">
                    <p className="uppercase tracking-xs gradient-text-electric-blue text-lg font-bold mb-12">
                      Session Selection
                    </p>
                    <div className="divider-glow-dark mb-16 border-t border-neutral-700/50" />
                    {raceSelectorContent}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {location !== "/" && <div className="divider-glow-dark" />}
      </header>

      {/* Mobile */}
      <Modal isOpen={isOpen} onClose={toggleOpen}>
        <div className="flex flex-col pb-8 px-4">
          <div className="pt-2 pb-6 flex justify-center mb-4 relative">
            <Link to="/" onClick={toggleOpen}>
              <Logo height={48} className="drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]" />
            </Link>
            <div className="absolute bottom-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-brand-blue-500/50 to-transparent"></div>
          </div>
          <div className="flex flex-col gap-12 px-8">
            <Link
              to="/live"
              className="relative overflow-hidden glass-dark border border-white/10 rounded-2xl p-16 flex items-center justify-between group shadow-[0_4px_20px_rgba(220,38,38,0.15)]"
              onClick={toggleOpen}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="flex items-center gap-16 relative z-10">
                <div className="relative flex items-center justify-center">
                  <span className="w-12 h-12 bg-red-600/20 rounded-full absolute animate-ping"></span>
                  <span className="w-10 h-10 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)]"></span>
                </div>
                <span className="tracking-md uppercase text-xl font-bold text-red-500 group-hover:text-red-400 transition-colors">
                  Live Timings
                </span>
              </div>
              <FontAwesomeIcon icon="chevron-right" className="text-red-500/50 group-hover:text-red-400 group-hover:translate-x-2 transition-all" />
            </Link>

            <Link
              to="/features"
              className="relative overflow-hidden glass-dark border border-white/10 rounded-2xl p-16 flex items-center justify-between group hover:border-brand-blue-500/50 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
              onClick={toggleOpen}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="tracking-sm uppercase text-lg font-bold text-neutral-200 group-hover:text-brand-blue-400 transition-colors relative z-10 ml-4">
                Features
              </span>
              <FontAwesomeIcon icon="chevron-right" className="text-neutral-600 group-hover:text-brand-blue-400 group-hover:translate-x-2 transition-all" />
            </Link>

            <div className="glass-dark border border-white/10 rounded-2xl p-16 mt-8 flex flex-col relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
              
              <div className="pb-8 pl-4">
                <h3 className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-bold flex items-center gap-4">
                  <FontAwesomeIcon icon="flag-checkered" className="text-brand-blue-500/50" />
                  Series
                </h3>
              </div>
              
              <div className="flex flex-col relative z-10 mt-4 gap-2">
                <F1Links accordion onClick={toggleOpen} />
                <F2Links accordion onClick={toggleOpen} />
                <F1ALinks accordion onClick={toggleOpen} />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

Header.propTypes = {
  setResultPage: PropTypes.func.isRequired,
  setResultPagePath: PropTypes.func.isRequired,
};
