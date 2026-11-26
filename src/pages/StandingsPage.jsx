import React from "react";
import { useSearchParams } from "react-router-dom";
import classNames from "classnames";
import { getCurrentYear } from "../utils/currentYear";
import "./StandingsPage.scss";

const START_YEAR = { F1: 2023, F2: 2025, F1A: 2024 };

const TABS = {
  drivers: "Drivers",
  constructors: "Constructors",
};

/**
 * Shared standings page for F1 / F2 / F1 Academy.
 * Renders the Stats-style Drivers / Constructors switch and a season
 * selector, then the matching standings component for the series.
 * The active view is kept in the URL (?view=constructors) so it can be linked.
 */
export const StandingsPage = ({
  series = "F1",
  selectedYear,
  setSelectedYear,
  DriversComponent,
  ConstructorsComponent,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const view =
    searchParams.get("view") === "constructors" ? "constructors" : "drivers";

  const years = [];
  for (let y = getCurrentYear(); y >= START_YEAR[series]; y--) years.push(y);

  const setView = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === "drivers") next.delete("view");
    else next.set("view", id);
    setSearchParams(next, { replace: true });
  };

  const Component =
    view === "drivers" ? DriversComponent : ConstructorsComponent;
  const championshipLevel = series === "F1" ? undefined : series;

  return (
    <>
      <div
        className={classNames(
          "standings-controls relative z-[100]",
          // F1: 6px + RangeSelector's 12px top padding = 18px, matching the
          // gap between the switch and the season selector.
          series === "F1"
            ? "mt-32 mb-[-25px]"
            : view === "drivers"
              ? "mb-14"
              : "mb-24",
        )}
      >
        <nav className="standings-tab-nav" aria-label="Standings view selector">
          {Object.entries(TABS).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={classNames("standings-tab-btn", {
                active: view === id,
              })}
              aria-current={view === id ? "page" : undefined}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <label className="standings-select-pill">
          <span className="standings-select-tag">Season</span>
          <select
            aria-label="Season"
            value={selectedYear}
            onChange={(e) => setSelectedYear(+e.target.value)}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      {series === "F1" ? (
        <Component
          selectedYear={selectedYear}
          championshipLevel={championshipLevel}
        />
      ) : (
        <div className="standings-body--tight">
          <Component
            selectedYear={selectedYear}
            championshipLevel={championshipLevel}
          />
        </div>
      )}
    </>
  );
};

export default StandingsPage;
