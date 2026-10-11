import React, { useMemo, useRef } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import teamColors from "../utils/teamColors.json";

const TEAM_NAMES = {
  // F1
  ferrari: "Ferrari",
  mclaren: "McLaren",
  red_bull: "Red Bull",
  mercedes: "Mercedes",
  aston_martin: "Aston Martin",
  alpine: "Alpine",
  haas: "Haas",
  rb: "RB",
  racing_bulls: "RB",
  williams: "Williams",
  sauber: "Kick Sauber",
  audi: "Audi",
  cadillac: "Cadillac",
  alphatauri: "AlphaTauri",
  alfa: "Alfa Romeo",
  racing_point: "Racing Point",
  renault: "Renault",
  force_india: "Force India",
  toro_rosso: "Toro Rosso",
  // F2 & F1A
  invicta: "Invicta",
  campos: "Campos",
  mp: "MP Motorsport",
  hitech: "Hitech",
  prema: "PREMA",
  dams: "DAMS",
  art: "ART Grand Prix",
  rodin: "Rodin",
  aix: "AIX Racing",
  trident: "Trident",
  van_amersfoort: "Van Amersfoort",
  var: "Van Amersfoort",
};

const formatTeamName = (id, rawName) => {
  if (TEAM_NAMES[id]) return TEAM_NAMES[id];
  if (rawName && rawName.trim().length > 0) return rawName;
  return id
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const TeamLegendFilter = ({
  standings = [],
  selectedTeam = null,
  onSelectTeam,
  year = null,
  className = "",
}) => {
  const scrollRef = useRef(null);

  const teams = useMemo(() => {
    const map = new Map();
    standings.forEach((s) => {
      const id = s.constructorId;
      if (!id || id === "wildcard") return;
      const normalizedId = id.toLowerCase();
      if (!map.has(normalizedId)) {
        const displayName = formatTeamName(normalizedId, s.constructorName);
        let color = s.constructorColor;
        if (!color || color === "#888888" || color === "#ffffff") {
          const yStr = year ? String(year) : "2026";
          const hex =
            teamColors[yStr]?.[normalizedId] ||
            (normalizedId === "var" ? teamColors[yStr]?.["van_amersfoort"] : undefined) ||
            (normalizedId === "van_amersfoort" ? teamColors[yStr]?.["var"] : undefined) ||
            teamColors["2026"]?.[normalizedId] ||
            teamColors["2025"]?.[normalizedId] ||
            teamColors["2024"]?.[normalizedId];
          if (hex) {
            color = hex.startsWith("#") ? hex : `#${hex}`;
          }
        }
        map.set(normalizedId, {
          id: normalizedId,
          name: displayName,
          color: color || "#888888",
        });
      }
    });
    return Array.from(map.values());
  }, [standings, year]);

  const selectedTeamObj = useMemo(() => {
    if (!selectedTeam) return null;
    return teams.find((t) => t.id === selectedTeam.toLowerCase()) || { id: selectedTeam, name: selectedTeam, color: "#ffffff" };
  }, [teams, selectedTeam]);

  const activeDriverCount = useMemo(() => {
    if (!selectedTeam) return 0;
    return standings.filter(
      (s) => s.constructorId?.toLowerCase() === selectedTeam.toLowerCase(),
    ).length;
  }, [standings, selectedTeam]);

  const handleWheel = (e) => {
    if (scrollRef.current && e.deltaY !== 0) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollBy = (offset) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  if (teams.length === 0) return null;

  return (
    <div
      className={classNames(
        "relative overflow-hidden w-full bg-[#0c0d14]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-14 mb-24 shadow-[0_12px_40px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      {/* Background carbon/tech grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      {/* Top ambient highlight line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-10 px-2 text-xs tracking-wider uppercase font-display">
        <div className="flex items-center gap-6">
          <span className="w-6 h-6 rounded-full bg-brand-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)] inline-block" />
          <span className="text-[1.2rem] font-bold text-white tracking-widest whitespace-nowrap">
            Constructors
          </span>
          <span className="px-5 py-1 rounded bg-white/5 border border-white/10 text-[0.95rem] font-mono text-neutral-400 normal-case tracking-normal">
            {teams.length}
          </span>
        </div>

        <div className="flex items-center gap-6">
          {selectedTeam && (
            <button
              type="button"
              onClick={() => onSelectTeam(null)}
              className="text-[1.05rem] text-brand-blue-400 hover:text-white transition-colors normal-case tracking-normal flex items-center gap-3 cursor-pointer font-sans"
            >
              <span>Reset</span>
              <span className="text-[0.9rem] bg-white/10 rounded-full w-12 h-12 flex items-center justify-center">
                ✕
              </span>
            </button>
          )}

          {/* Quick scroll arrows */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => scrollBy(-240)}
              className="w-32 h-32 rounded-lg bg-white/15 hover:bg-brand-blue-500/25 active:bg-brand-blue-500/40 text-neutral-100 hover:text-white border border-white/30 hover:border-brand-blue-400/80 transition-all duration-150 flex items-center justify-center cursor-pointer select-none shadow-[0_2px_10px_rgba(0,0,0,0.5)] hover:shadow-[0_0_12px_rgba(59,130,246,0.4)] active:scale-90"
              title="Scroll constructors left"
              aria-label="Scroll left"
            >
              <svg
                className="w-18 h-18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollBy(240)}
              className="w-32 h-32 rounded-lg bg-white/15 hover:bg-brand-blue-500/25 active:bg-brand-blue-500/40 text-neutral-100 hover:text-white border border-white/30 hover:border-brand-blue-400/80 transition-all duration-150 flex items-center justify-center cursor-pointer select-none shadow-[0_2px_10px_rgba(0,0,0,0.5)] hover:shadow-[0_0_12px_rgba(59,130,246,0.4)] active:scale-90"
              title="Scroll constructors right"
              aria-label="Scroll right"
            >
              <svg
                className="w-18 h-18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Pitwall Scroll Track */}
      <div className="relative">
        {/* Left/Right fade masks to indicate scrollability */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0c0d14]/90 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0c0d14]/90 to-transparent z-10" />

        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="flex items-center gap-6 overflow-x-auto py-2 px-6 no-scrollbar scroll-smooth"
        >
          {/* Master "ALL" Badge */}
          <button
            type="button"
            onClick={() => onSelectTeam(null)}
            className={classNames(
              "group relative flex items-center justify-center px-12 py-5 rounded-lg text-xs font-display font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer select-none whitespace-nowrap border shrink-0",
              !selectedTeam
                ? "bg-white/20 text-white border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.2)] scale-105"
                : "bg-white/[0.04] text-neutral-400 border-white/10 hover:bg-white/[0.08] hover:text-white hover:border-white/20",
            )}
          >
            <span>ALL</span>
          </button>

          {/* Team Pitwall Badges */}
          {teams.map((team) => {
            const isSelected =
              selectedTeam?.toLowerCase() === team.id.toLowerCase();
            const isDimmed = selectedTeam && !isSelected;

            return (
              <button
                type="button"
                key={team.id}
                onClick={() => onSelectTeam(isSelected ? null : team.id)}
                className={classNames(
                  "group relative flex items-center gap-8 pl-8 pr-12 py-5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer select-none whitespace-nowrap border shrink-0 overflow-hidden",
                  isSelected
                    ? "bg-white/15 text-white scale-105"
                    : isDimmed
                      ? "bg-black/35 text-neutral-500 border-white/5 opacity-35 hover:opacity-75"
                      : "bg-white/[0.04] text-neutral-200 border-white/10 hover:bg-white/[0.08] hover:text-white hover:border-white/25 hover:-translate-y-0.5",
                )}
                style={{
                  borderColor: isSelected ? team.color : undefined,
                  boxShadow: isSelected
                    ? `0 0 16px color-mix(in srgb, ${team.color} 45%, transparent), inset 0 0 8px color-mix(in srgb, ${team.color} 20%, transparent)`
                    : undefined,
                }}
                title={`Filter by ${team.name}`}
              >
                {/* Vertical Livery Color Accent Bar */}
                <span
                  className="w-[3.5px] h-[13px] rounded-full flex-shrink-0 transition-transform duration-200 group-hover:scale-y-125"
                  style={{
                    backgroundColor: team.color,
                    boxShadow: `0 0 6px ${team.color}`,
                  }}
                />

                {/* Team Name */}
                <span className="font-display font-semibold tracking-wider uppercase text-[1.05rem]">
                  {team.name}
                </span>

                {/* Subtle Livery Hover Tint Overlay */}
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-200"
                  style={{ backgroundColor: team.color }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Filter Sub-Footer */}
      {selectedTeam && (
        <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400 font-sans px-2">
          <div className="flex items-center gap-6">
            <span
              className="w-7 h-7 rounded-full shadow-sm"
              style={{
                backgroundColor: selectedTeamObj?.color,
                boxShadow: `0 0 6px ${selectedTeamObj?.color}`,
              }}
            />
            <span className="text-[1.1rem]">
              Filtering by{" "}
              <strong className="text-white font-semibold">
                {selectedTeamObj?.name}
              </strong>{" "}
              <span className="text-neutral-500 font-mono text-[1.05rem]">
                ({activeDriverCount}{" "}
                {activeDriverCount === 1 ? "driver" : "drivers"})
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => onSelectTeam(null)}
            className="text-brand-blue-400 hover:text-white transition-colors cursor-pointer text-[1.05rem] font-semibold uppercase tracking-wider"
          >
            Show All
          </button>
        </div>
      )}
    </div>
  );
};

TeamLegendFilter.propTypes = {
  standings: PropTypes.array,
  selectedTeam: PropTypes.string,
  onSelectTeam: PropTypes.func.isRequired,
  year: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
};
