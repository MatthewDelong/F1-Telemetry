import React, { useEffect, useState } from "react";
import classNames from "classnames";
import { teamHistory } from "../utils/teamHistory";
import { getTeamDriversForYear, getConstructorStandings } from "../utils/api";
import { TeamDriverCard } from "../components/team-garages/TeamDriverCard";

const teamPrincipals = {
  alpine: { name: "Flavio Briatore", nat: "Italian", year: "2025 – Present" },
  aston_martin: { name: "Adrian Newey", nat: "British", year: "2026 – Present" },
  audi: { name: "Mattia Binotto / Allan McNish", nat: "Italian", year: "2026 – Present" },
  ferrari: { name: "Fred Vasseur", nat: "French", year: "2023 – Present" },
  haas: { name: "Ayao Komatsu", nat: "Japanese", year: "2024 – Present" },
  mclaren: { name: "Andrea Stella", nat: "Italian", year: "2022 (Dec) – Present" },
  mercedes: { name: "Toto Wolff", nat: "Austrian", year: "2013 – Present" },
  rb: { name: "Alan Permane", nat: "British", year: "2025 (July) – Present" },
  red_bull: { name: "Laurent Mekies", nat: "French", year: "2025 (July) – Present" },
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
    <div className="flex flex-col items-center justify-center pt-32 pb-64 px-16 max-w-[1400px] mx-auto w-full">
      <h1 className="tracking-sm uppercase gradient-text-light text-center mb-64 text-4xl font-display">
        2026 Team Garages
      </h1>

      <div className="flex flex-col gap-64 w-full">
        {teamsData.map((team, idx) => {
          const principal = teamPrincipals[team.name];
          const activeThemeColor = team.color;
          const constructorTitlesCount = team?.constructorTitles?.length || 0;
          const driversChampionshipsCount =
            team?.driversChampionships?.length || 0;

          return (
            <div key={team.name} className="flex flex-col gap-32">
              <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-16 border-b border-neutral-800 pb-16">
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
                  <h2
                    className="text-3xl font-display uppercase tracking-widest text-white m-0"
                    style={{ color: activeThemeColor }}
                  >
                    {team.name === "rb" ? "Racing Bulls" : team.name.replace(/_/g, " ")}
                  </h2>
                </div>

                <div className="flex gap-32 text-right">
                  <div>
                    <div className="text-[10px] sm:text-[11px] font-bold uppercase font-display leading-[1.1] opacity-60">
                      Constructor
                      <br />
                      Titles
                    </div>
                    <div
                      className="font-display font-bold leading-[1] text-[32px] sm:text-[42px] mt-8"
                      style={{ color: activeThemeColor }}
                    >
                      {constructorTitlesCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] font-bold uppercase font-display leading-[1.1] opacity-60">
                      Drivers'
                      <br />
                      Championships
                    </div>
                    <div
                      className="font-display font-bold leading-[1] text-[32px] sm:text-[42px] mt-8"
                      style={{ color: activeThemeColor }}
                    >
                      {driversChampionshipsCount}
                    </div>
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
                    firstName={principal?.name.includes("/") ? principal.name.split("/")[0].trim() : principal?.name.split(" ")[0]}
                    lastName={principal?.name.includes("/") ? `/ ${principal.name.split("/")[1].trim()}` : principal?.name.split(" ").slice(1).join(" ")}
                    nationality={principal?.nat}
                    points={team.constructorPoints || "0"}
                    position={"TP"}
                    wins={"-"}
                    teamLabel={team.name === "rb" ? "Racing Bulls" : team.name.replace(/_/g, " ")}
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
