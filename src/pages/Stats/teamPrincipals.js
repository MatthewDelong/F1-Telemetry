import { FORMER_TEAM_NAMES } from "./powerUnits";

// Team Principals / CEOs by season (2018–2026), keyed by the API's constructorId.
export const TEAM_PRINCIPALS = {
  2018: {
    mercedes: { name: "Toto Wolff", role: "CEO & Team Principal" },
    ferrari: { name: "Maurizio Arrivabene", role: "Team Principal" },
    red_bull: { name: "Christian Horner", role: "Team Principal" },
    renault: { name: "Cyril Abiteboul", role: "Managing Director" },
    mclaren: {
      name: "Zak Brown / Eric Boullier",
      role: "CEO / Racing Director (until mid-2018)",
    },
    force_india: {
      name: "Otmar Szafnauer",
      role: "Team Principal & CEO (after takeover)",
    },
    williams: { name: "Claire Williams", role: "Deputy Team Principal" },
    haas: { name: "Guenther Steiner", role: "Team Principal" },
    sauber: { name: "Frédéric Vasseur", role: "Team Principal" },
    toro_rosso: { name: "Franz Tost", role: "Team Principal" },
  },
  2019: {
    mercedes: { name: "Toto Wolff", role: "CEO & Team Principal" },
    ferrari: { name: "Mattia Binotto", role: "Team Principal" },
    red_bull: { name: "Christian Horner", role: "Team Principal" },
    renault: { name: "Cyril Abiteboul", role: "Managing Director" },
    mclaren: { name: "Andreas Seidl", role: "Team Principal" },
    racing_point: { name: "Otmar Szafnauer", role: "Team Principal & CEO" },
    williams: { name: "Claire Williams", role: "Deputy Team Principal" },
    haas: { name: "Guenther Steiner", role: "Team Principal" },
    alfa: { name: "Frédéric Vasseur", role: "Team Principal" },
    toro_rosso: { name: "Franz Tost", role: "Team Principal" },
  },
  2020: {
    mercedes: { name: "Toto Wolff", role: "CEO & Team Principal" },
    ferrari: { name: "Mattia Binotto", role: "Team Principal" },
    red_bull: { name: "Christian Horner", role: "Team Principal" },
    renault: { name: "Cyril Abiteboul", role: "Managing Director" },
    mclaren: { name: "Andreas Seidl", role: "Team Principal" },
    racing_point: { name: "Otmar Szafnauer", role: "CEO & Team Principal" },
    williams: { name: "Claire Williams", role: "Deputy Team Principal" },
    haas: { name: "Guenther Steiner", role: "Team Principal" },
    alfa: { name: "Frédéric Vasseur", role: "Team Principal" },
    alphatauri: { name: "Franz Tost", role: "Team Principal" },
  },
  2021: {
    mercedes: { name: "Toto Wolff", role: "CEO & Team Principal" },
    ferrari: { name: "Mattia Binotto", role: "Team Principal" },
    red_bull: { name: "Christian Horner", role: "Team Principal" },
    alpine: {
      name: "Laurent Rossi / Marcin Budkowski",
      role: "CEO / Executive Director",
    },
    mclaren: { name: "Andreas Seidl", role: "Team Principal" },
    aston_martin: { name: "Otmar Szafnauer", role: "Team Principal" },
    williams: { name: "Jost Capito", role: "CEO & Team Principal" },
    haas: { name: "Guenther Steiner", role: "Team Principal" },
    alfa: { name: "Frédéric Vasseur", role: "Team Principal" },
    alphatauri: { name: "Franz Tost", role: "Team Principal" },
  },
  2022: {
    mercedes: { name: "Toto Wolff", role: "CEO & Team Principal" },
    ferrari: { name: "Mattia Binotto", role: "Team Principal" },
    red_bull: { name: "Christian Horner", role: "Team Principal" },
    mclaren: { name: "Andreas Seidl", role: "Team Principal" },
    alpine: { name: "Otmar Szafnauer", role: "Team Principal" },
    aston_martin: { name: "Mike Krack", role: "Team Principal" },
    williams: { name: "Jost Capito", role: "CEO & Team Principal" },
    haas: { name: "Guenther Steiner", role: "Team Principal" },
    alfa: { name: "Frédéric Vasseur", role: "Team Principal" },
    alphatauri: { name: "Franz Tost", role: "Team Principal" },
  },
  2023: {
    mercedes: { name: "Toto Wolff", role: "CEO & Team Principal" },
    ferrari: { name: "Frédéric Vasseur", role: "Team Principal" },
    red_bull: { name: "Christian Horner", role: "Team Principal" },
    mclaren: { name: "Andrea Stella", role: "Team Principal" },
    alpine: {
      name: "Otmar Szafnauer / Bruno Famin",
      role: "Team Principal (until/from mid-2023)",
    },
    aston_martin: { name: "Mike Krack", role: "Team Principal" },
    williams: { name: "James Vowles", role: "Team Principal" },
    haas: { name: "Guenther Steiner", role: "Team Principal" },
    alfa: { name: "Alessandro Alunni Bravi", role: "Team Representative" },
    alphatauri: { name: "Franz Tost", role: "Team Principal" },
  },
  2024: {
    mercedes: { name: "Toto Wolff", role: "CEO & Team Principal" },
    ferrari: { name: "Frédéric Vasseur", role: "Team Principal" },
    red_bull: { name: "Christian Horner", role: "CEO & Team Principal" },
    mclaren: { name: "Andrea Stella", role: "Team Principal" },
    alpine: { name: "Bruno Famin", role: "Team Principal" },
    aston_martin: { name: "Mike Krack", role: "Team Principal" },
    williams: { name: "James Vowles", role: "Team Principal" },
    haas: { name: "Ayao Komatsu", role: "Team Principal" },
    sauber: { name: "Alessandro Alunni Bravi", role: "Team Representative" },
    rb: { name: "Laurent Mekies", role: "Team Principal" },
  },
  2025: {
    mclaren: { name: "Andrea Stella", role: "Team Principal" },
    ferrari: { name: "Frédéric Vasseur", role: "Team Principal" },
    red_bull: {
      name: "Christian Horner / Laurent Mekies",
      role: "CEO & Team Principal (until/from mid-2025)",
    },
    mercedes: { name: "Toto Wolff", role: "CEO & Team Principal" },
    aston_martin: { name: "Andy Cowell", role: "CEO & Team Principal" },
    alpine: { name: "Oliver Oakes", role: "Team Principal" },
    haas: { name: "Ayao Komatsu", role: "Team Principal" },
    rb: { name: "Laurent Mekies", role: "Team Principal (until mid-2025)" },
    williams: { name: "James Vowles", role: "Team Principal" },
    sauber: { name: "Mattia Binotto", role: "CEO & Team Principal" },
  },
  2026: {
    mclaren: { name: "Andrea Stella", role: "Team Principal" },
    mercedes: { name: "Toto Wolff", role: "CEO & Team Principal" },
    red_bull: { name: "Laurent Mekies", role: "CEO & Team Principal" },
    ferrari: { name: "Frédéric Vasseur", role: "Team Principal" },
    williams: { name: "James Vowles", role: "Team Principal" },
    rb: { name: "Alan Permane", role: "Team Principal" },
    aston_martin: { name: "Adrian Newey", role: "Team Principal" },
    haas: { name: "Ayao Komatsu", role: "Team Principal" },
    audi: { name: "Mattia Binotto", role: "CEO & Team Principal" },
    alpine: { name: "Flavio Briatore", role: "Team Principal" },
    cadillac: { name: "Graeme Lowdon", role: "Team Principal" },
  },
};

const LINEAGES = [
  ["renault", "alpine"],
  ["force_india", "racing_point", "aston_martin"],
  ["toro_rosso", "alphatauri", "rb"],
  ["sauber", "alfa", "audi"],
];
const lineageOf = (id) => LINEAGES.find((ids) => ids.includes(id)) ?? [id];

export const teamPrincipalFor = (season, id) =>
  TEAM_PRINCIPALS[season]?.[id] ?? null;

export function teamPrincipalHistory(id) {
  const ids = lineageOf(id);
  return Object.keys(TEAM_PRINCIPALS)
    .map(Number)
    .sort((a, b) => a - b)
    .map((season) => {
      const teamId = ids.find((x) => TEAM_PRINCIPALS[season][x]);
      return teamId
        ? {
            season,
            teamId,
            formerName:
              teamId !== id ? (FORMER_TEAM_NAMES[teamId] ?? teamId) : null,
            ...TEAM_PRINCIPALS[season][teamId],
          }
        : null;
    })
    .filter(Boolean);
}
