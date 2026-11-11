export const TEAM_CHAMPIONSHIPS = {
  alpine: {
    constructorTitles: ['1995', '2005', '2006'],
    driversChampionships: ['1994', '1995', '2005', '2006'],
  },
  astonmartin: {
    constructorTitles: [],
    driversChampionships: [],
  },
  audi: {
    constructorTitles: [],
    driversChampionships: [],
  },
  cadillac: {
    constructorTitles: [],
    driversChampionships: [],
  },
  ferrari: {
    constructorTitles: [
      '1961', '1964', '1975', '1976', '1977', '1979', '1982', '1983',
      '1999', '2000', '2001', '2002', '2003', '2004', '2007', '2008',
    ],
    driversChampionships: [
      '1952', '1953', '1956', '1958', '1961', '1964', '1975', '1977',
      '1979', '2000', '2001', '2002', '2003', '2004', '2007',
    ],
  },
  haas: {
    constructorTitles: [],
    driversChampionships: [],
  },
  mclaren: {
    constructorTitles: ['1974', '1984', '1985', '1988', '1989', '1990', '1991', '1998', '2024', '2025'],
    driversChampionships: [
      '1974', '1976', '1984', '1985', '1986', '1988', '1989', '1990',
      '1991', '1998', '1999', '2008', '2025',
    ],
  },
  mercedes: {
    constructorTitles: ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2026'],
    driversChampionships: [
      '1954', '1955', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2026',
    ],
  },
  rb: {
    constructorTitles: [],
    driversChampionships: [],
  },
  redbull: {
    constructorTitles: ['2010', '2011', '2012', '2013', '2022', '2023'],
    driversChampionships: ['2010', '2011', '2012', '2013', '2021', '2022', '2023', '2024'],
  },
  williams: {
    constructorTitles: ['1980', '1981', '1986', '1987', '1992', '1993', '1994', '1996', '1997'],
    driversChampionships: ['1980', '1982', '1987', '1992', '1993', '1996', '1997'],
  },
};

const TEAM_HISTORY_KEYS = {
  aston_martin: 'astonmartin',
  red_bull: 'redbull',
};

export function getTeamChampionships(constructorId) {
  return TEAM_CHAMPIONSHIPS[TEAM_HISTORY_KEYS[constructorId] ?? constructorId]
    ?? { constructorTitles: [], driversChampionships: [] };
}

