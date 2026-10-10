import React, { useEffect, useState } from "react";
import classNames from "classnames";
import { teamHistory } from "../utils/teamHistory";
import { nationalityToFlag } from "../utils/nationalityToFlag";
import { getTeamDriversForYear, getConstructorStandings } from "../utils/api";
import { TeamDriverCard } from "../components/team-garages/TeamDriverCard";

const teamPrincipals = {
  alpine: { name: "Flavio Briatore", nat: "Italian", year: "2025 – Present" },
  aston_martin: {
    name: "Adrian Newey",
    nat: "British",
    year: "2026 – Present",
  },
  audi: {
    name: "Mattia Binotto / Allan McNish",
    nat: "Italian",
    year: "2026 – Present",
  },
  ferrari: { name: "Fred Vasseur", nat: "French", year: "2023 – Present" },
  haas: { name: "Ayao Komatsu", nat: "Japanese", year: "2024 – Present" },
  mclaren: {
    name: "Andrea Stella",
    nat: "Italian",
    year: "2022 (Dec) – Present",
  },
  mercedes: { name: "Toto Wolff", nat: "Austrian", year: "2013 – Present" },
  rb: { name: "Alan Permane", nat: "British", year: "2025 (July) – Present" },
  red_bull: {
    name: "Laurent Mekies",
    nat: "French",
    year: "2025 (July) – Present",
  },
  williams: { name: "James Vowles", nat: "British", year: "2023 – Present" },
  cadillac: { name: "Marcin Budkowski", nat: "Polish", year: "2026 – Present" },
};

const powerUnits = {
  mercedes: "Mercedes",
  mclaren: "Mercedes",
  williams: "Mercedes",
  alpine: "Mercedes",
  ferrari: "Ferrari",
  haas: "Ferrari",
  cadillac: "Ferrari (shifting to GM/Cadillac power in 2029)",
  red_bull: "Red Bull-Ford (Red Bull Powertrains)",
  rb: "Red Bull-Ford (Red Bull Powertrains)",
  aston_martin: "Honda",
  audi: "Audi",
};

export const TeamCards = ({ selectedYear }) => {
  const [teamsData, setTeamsData] = useState([]);
  const year = selectedYear || "2026";

  useEffect(() => {
    let mounted = true;

    const fetchAllTeams = async () => {
      const cStandings = await getConstructorStandings(year);
      const teamList = Object.values(teamHistory);
      const dataPromises = teamList.map(async (team) => {
        // Fetch drivers for this team
        let drivers = await getTeamDriversForYear(year, team.name);

        // If no drivers exist (like for 2026/2027), provide placeholders
        if (!drivers || drivers.length === 0) {
          drivers = [
            {
              code: "TBA1",
              number: "",
              firstName: "Driver",
              lastName: "1",
              nationality: "",
              points: "0",
              position: "-",
              wins: "0",
            },
            {
              code: "TBA2",
              number: "",
              firstName: "Driver",
              lastName: "2",
              nationality: "",
              points: "0",
              position: "-",
              wins: "0",
            },
          ];
        }

        let cPts = "0";
        if (cStandings && cStandings.length > 0) {
          const matched = cStandings.find((s) => s.constructorId === team.name);
          if (matched) {
            cPts = matched.points;
          }
        }

        return {
          ...team,
          drivers: drivers,
          constructorPoints: cPts,
        };
      });

      const results = await Promise.all(dataPromises);
      if (mounted) {
        setTeamsData(results);
      }
    };

    fetchAllTeams();

    return () => {
      mounted = false;
    };
  }, [year]);

  return (
    <div className="flex flex-col items-center justify-center pb-64 max-w-[1400px] mx-auto w-full">
      {/* Hero Banner Section */}
      <div className="relative w-full h-[180px] sm:h-[220px] md:h-[280px] flex items-center justify-center mb-16 sm:mb-20 overflow-hidden rounded-b-[2rem] shadow-2xl border-b border-white/10">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src="/images/Team-Garage.png"
            alt="Team Garages Banner"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-black/50 to-transparent" />
        </div>
        <h1 className="relative z-10 tracking-sm uppercase gradient-text-light text-center text-4xl sm:text-5xl md:text-6xl font-display drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] px-16 mt-8">
          2026 Team Garages
        </h1>
      </div>

      <div className="flex flex-col gap-48 w-full px-16">
        {teamsData.map((team, idx) => {
          const principal = teamPrincipals[team.name];
          const activeThemeColor = team.color;
          const constructorTitlesCount = team?.constructorTitles?.length || 0;
          const driversChampionshipsCount =
            team?.driversChampionships?.length || 0;

          return (
            <div key={team.name} className="flex flex-col gap-20">
              <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-12 border-b border-neutral-800 pb-12">
                <div className="flex items-center gap-16">
                  {/* Team Logo (using car image as fallback F1 logo styling) */}
                  <img
                    src={`/images/${year}/cars/${team.name}.png`}
                    alt={`${team.name} Logo`}
                    className="h-[60px] object-contain"
                    onError={(e) => {
                      // fallback logic or simply hide if missing
                      e.target.style.display = "none";
                    }}
                  />
                  <div className="flex flex-col">
                    <h2
                      className="text-3xl font-display uppercase tracking-widest text-white m-0"
                      style={{ color: activeThemeColor }}
                    >
                      {team.name === "rb"
                        ? "Racing Bulls"
                        : team.name.replace(/_/g, " ")}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      {team.teamExistedSince && (
                        <span className="text-[10px] uppercase tracking-widest opacity-60">
                          {team.teamExistedSince} – Present
                        </span>
                      )}
                      {team.baseNationality &&
                        nationalityToFlag(team.baseNationality) && (
                          <img
                            src={nationalityToFlag(team.baseNationality)}
                            alt={`${team.baseNationality} flag`}
                            className="w-14 h-9 object-cover rounded-[4px] opacity-80"
                          />
                        )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-12 w-full sm:w-auto mt-16 sm:mt-0 text-left sm:text-right">
                  {/* Constructor Titles Card */}
                  <div className="flex-1 sm:flex-none relative overflow-hidden rounded-xl border border-white/5 p-12 min-w-[140px] bg-gradient-to-br from-[#1a1a1f] to-[#0f0f13] shadow-lg">
                    <div
                      className="absolute inset-0 opacity-15 pointer-events-none transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(circle at top right, ${activeThemeColor}, transparent 80%)`,
                      }}
                    />
                    <div
                      className="absolute top-0 left-0 w-full h-[3px]"
                      style={{
                        backgroundColor: activeThemeColor,
                        opacity: 0.6,
                      }}
                    />
                    <div className="relative z-10 text-[10px] sm:text-[11px] font-bold uppercase font-display leading-[1.1] opacity-60">
                      Constructor
                      <br />
                      Titles
                    </div>
                    <div
                      className="relative z-10 font-display font-bold leading-[1] text-[32px] sm:text-[42px] mt-8"
                      style={{ color: activeThemeColor }}
                    >
                      {constructorTitlesCount}
                    </div>
                    {constructorTitlesCount > 0 && (
                      <div className="relative z-10 flex flex-wrap justify-start sm:justify-end gap-x-2 gap-y-1 mt-6 max-w-[140px] sm:ml-auto">
                        {team.constructorTitles.map((year) => (
                          <span
                            key={year}
                            className="text-[9px] font-mono opacity-50 leading-none"
                          >
                            {year}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Drivers' Championships Card */}
                  <div className="flex-1 sm:flex-none relative overflow-hidden rounded-xl border border-white/5 p-12 min-w-[140px] bg-gradient-to-br from-[#1a1a1f] to-[#0f0f13] shadow-lg">
                    <div
                      className="absolute inset-0 opacity-15 pointer-events-none transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(circle at top right, ${activeThemeColor}, transparent 80%)`,
                      }}
                    />
                    <div
                      className="absolute top-0 left-0 w-full h-[3px]"
                      style={{
                        backgroundColor: activeThemeColor,
                        opacity: 0.6,
                      }}
                    />
                    <div className="relative z-10 text-[10px] sm:text-[11px] font-bold uppercase font-display leading-[1.1] opacity-60">
                      Drivers'
                      <br />
                      Championships
                    </div>
                    <div
                      className="relative z-10 font-display font-bold leading-[1] text-[32px] sm:text-[42px] mt-8"
                      style={{ color: activeThemeColor }}
                    >
                      {driversChampionshipsCount}
                    </div>
                    {driversChampionshipsCount > 0 && (
                      <div className="relative z-10 flex flex-wrap justify-start sm:justify-end gap-x-2 gap-y-1 mt-6 max-w-[140px] sm:ml-auto">
                        {team.driversChampionships.map((year) => (
                          <span
                            key={year}
                            className="text-[9px] font-mono opacity-50 leading-none"
                          >
                            {year}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-row flex-wrap justify-center sm:justify-start gap-16 w-full">
                {/* Driver 1 */}
                {team.drivers[0] && (
                  <div className="w-full md:w-[calc(33%-12px)] max-w-[400px]">
                    <TeamDriverCard
                      year={year}
                      code={team.drivers[0].code}
                      number={team.drivers[0].number}
                      firstName={team.drivers[0].firstName}
                      lastName={team.drivers[0].lastName}
                      nationality={team.drivers[0].nationality}
                      points={team.drivers[0].points}
                      position={team.drivers[0].position}
                      wins={team.drivers[0].wins}
                      teamLabel={team.name.replace(/_/g, " ")}
                      color={activeThemeColor}
                      index={idx * 3}
                    />
                  </div>
                )}

                {/* Driver 2 */}
                {team.drivers[1] && (
                  <div className="w-full md:w-[calc(33%-12px)] max-w-[400px]">
                    <TeamDriverCard
                      year={year}
                      code={team.drivers[1].code}
                      number={team.drivers[1].number}
                      firstName={team.drivers[1].firstName}
                      lastName={team.drivers[1].lastName}
                      nationality={team.drivers[1].nationality}
                      points={team.drivers[1].points}
                      position={team.drivers[1].position}
                      wins={team.drivers[1].wins}
                      teamLabel={team.name.replace(/_/g, " ")}
                      color={activeThemeColor}
                      index={idx * 3 + 1}
                    />
                  </div>
                )}

                {/* Team Principal Card */}
                <div className="w-full md:w-[calc(33%-12px)] max-w-[400px]">
                  <TeamDriverCard
                    year={year}
                    code={"TP"}
                    number={""}
                    firstName={
                      principal?.name.includes("/")
                        ? principal.name.split("/")[0].trim()
                        : principal?.name.split(" ")[0]
                    }
                    lastName={
                      principal?.name.includes("/")
                        ? `/ ${principal.name.split("/")[1].trim()}`
                        : principal?.name.split(" ").slice(1).join(" ")
                    }
                    nationality={principal?.nat}
                    points={team.constructorPoints || "0"}
                    position={"TP"}
                    wins={"-"}
                    teamLabel={
                      team.name === "rb"
                        ? "Racing Bulls"
                        : team.name.replace(/_/g, " ")
                    }
                    color={activeThemeColor}
                    index={idx * 3 + 2}
                    isPrincipal={true}
                    teamId={team.name}
                    roleYear={principal?.year}
                    powerUnit={powerUnits[team.name]}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamCards;
