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
          "!absolute": location === "/" || location === "/about-us",
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
                to="/about-us"
                className="global-header__main-nav__button py-12 px-24 rounded-[.8rem] uppercase tracking-xs"
              >
                About
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
                    <p className="uppercase tracking-xs gradient-text-light text-lg font-bold">
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
                    <p className="uppercase tracking-xs gradient-text-light text-lg font-bold">
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
                    <p className="uppercase tracking-xs gradient-text-light text-lg font-bold mb-12">
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
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar pb-120">
          <div className="pt-4 px-16 flex justify-center mb-8">
            <Link to="/" onClick={toggleOpen}>
              <Logo height={32} />
            </Link>
          </div>
          <div className="px-0">
            <Link
              to="/about-us"
              className="w-full flex justify-between items-center py-4 px-8 tracking-sm uppercase text-lg hover:text-brand-blue-400 transition-colors"
              onClick={toggleOpen}
            >
              About
            </Link>
            <div className="divider-glow-dark mt-4 border-t border-neutral-700" />
            <div className="flex flex-col">
              <F1Links accordion onClick={toggleOpen} />
            </div>
            <div className="flex flex-col">
              <F1ALinks accordion onClick={toggleOpen} />
            </div>
            <div className="flex flex-col">
              <F2Links accordion onClick={toggleOpen} />
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
