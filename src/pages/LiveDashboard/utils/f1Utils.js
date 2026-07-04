/**
 * F1 Team colors and constants
 * Supports API-provided team_colour hex codes and fallback lookups
 */

export const TEAM_COLORS = {
  // 2024-2026 Teams
  'Red Bull Racing': '#3671C6',
  'Red Bull': '#3671C6',
  'Ferrari': '#E8002D',
  'McLaren': '#FF8000',
  'Mercedes': '#27F4D2',
  'Aston Martin': '#229971',
  'Alpine': '#0093CC',
  'Williams': '#64C4FF',
  'RB': '#6692FF',
  'Visa Cash App RB': '#6692FF',
  'Racing Bulls': '#6692FF',
  'Kick Sauber': '#52E252',
  'Sauber': '#52E252',
  'Audi': '#F50537',
  'Haas F1 Team': '#B6BABD',
  'Haas': '#B6BABD',
  'Cadillac': '#1F3D2B',
};

/**
 * Get team color — prefers API-provided hex, falls back to lookup table
 * @param {string} teamName - Team name from the API
 * @param {string} teamColour - Raw hex color from API's team_colour field (no #)
 */
export function getTeamColor(teamName, teamColour) {
  // If the API provides a team_colour hex string, use it directly
  if (teamColour && /^[0-9A-Fa-f]{6}$/.test(teamColour)) {
    return `#${teamColour}`;
  }
  if (!teamName) return '#666';
  for (const [key, color] of Object.entries(TEAM_COLORS)) {
    if (teamName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(teamName.toLowerCase())) {
      return color;
    }
  }
  return '#666';
}

export const TIRE_COMPOUNDS = {
  SOFT: { label: 'S', color: '#ef4444', className: 'tire-soft' },
  MEDIUM: { label: 'M', color: '#eab308', className: 'tire-medium' },
  HARD: { label: 'H', color: '#f0f4f8', className: 'tire-hard' },
  INTERMEDIATE: { label: 'I', color: '#22c55e', className: 'tire-intermediate' },
  WET: { label: 'W', color: '#3b82f6', className: 'tire-wet' },
  UNKNOWN: { label: '?', color: '#666', className: '' },
};

export function getTireInfo(compound) {
  if (!compound) return TIRE_COMPOUNDS.UNKNOWN;
  const upper = compound.toUpperCase();
  return TIRE_COMPOUNDS[upper] || TIRE_COMPOUNDS.UNKNOWN;
}

/**
 * Format lap time from seconds to mm:ss.SSS or +X.XXXs
 */
export function formatLapTime(seconds) {
  if (!seconds && seconds !== 0) return '—';
  if (typeof seconds === 'string') return seconds;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
  }
  return secs.toFixed(3);
}

/**
 * Format gap to leader
 */
export function formatGap(gap) {
  if (!gap && gap !== 0) return '—';
  if (typeof gap === 'string') return gap;
  if (gap === 0) return 'LEADER';
  return `+${gap.toFixed(3)}`;
}

/**
 * Format interval
 */
export function formatInterval(interval) {
  if (!interval && interval !== 0) return '—';
  if (typeof interval === 'string') return interval;
  if (interval === 0) return '—';
  return `+${interval.toFixed(3)}`;
}

/**
 * Format duration in seconds to a human readable form
 */
export function formatDuration(seconds) {
  if (!seconds) return '—';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date string
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format time from date string
 */
export function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Determine sector color class based on comparison
 * purple = overall best, green = personal best, yellow = worse
 */
export function getSectorColorClass(value, personalBest, overallBest) {
  if (!value) return '';
  if (overallBest && value <= overallBest) return 'time-purple';
  if (personalBest && value <= personalBest) return 'time-green';
  return 'time-yellow';
}

/**
 * Process raw positions data to get latest positions per driver
 */
export function getLatestPositionPerDriver(positions) {
  const latest = {};
  if (!positions) return latest;

  for (const pos of positions) {
    const dn = pos.driver_number;
    if (!latest[dn] || new Date(pos.date) > new Date(latest[dn].date)) {
      latest[dn] = pos;
    }
  }
  return latest;
}

/**
 * Process raw laps data to get latest lap per driver
 */
export function getLatestLapPerDriver(laps) {
  const latest = {};
  if (!laps) return latest;

  for (const lap of laps) {
    const dn = lap.driver_number;
    if (!latest[dn] || lap.lap_number > latest[dn].lap_number) {
      latest[dn] = lap;
    }
  }
  return latest;
}

/**
 * Get best lap times per driver
 */
export function getBestLapPerDriver(laps) {
  const best = {};
  if (!laps) return best;

  for (const lap of laps) {
    const dn = lap.driver_number;
    if (lap.lap_duration && (!best[dn] || lap.lap_duration < best[dn].lap_duration)) {
      best[dn] = lap;
    }
  }
  return best;
}

/**
 * Get overall best sector times
 */
export function getOverallBestSectors(laps) {
  let s1 = Infinity, s2 = Infinity, s3 = Infinity;

  if (!laps) return { s1: null, s2: null, s3: null };

  for (const lap of laps) {
    if (lap.duration_sector_1 && lap.duration_sector_1 < s1) s1 = lap.duration_sector_1;
    if (lap.duration_sector_2 && lap.duration_sector_2 < s2) s2 = lap.duration_sector_2;
    if (lap.duration_sector_3 && lap.duration_sector_3 < s3) s3 = lap.duration_sector_3;
  }

  return {
    s1: s1 === Infinity ? null : s1,
    s2: s2 === Infinity ? null : s2,
    s3: s3 === Infinity ? null : s3,
  };
}

/**
 * Get latest stint per driver
 */
export function getLatestStintPerDriver(stints) {
  const latest = {};
  if (!stints) return latest;

  for (const stint of stints) {
    const dn = stint.driver_number;
    if (!latest[dn] || stint.stint_number > latest[dn].stint_number) {
      latest[dn] = stint;
    }
  }
  return latest;
}

/**
 * Get latest interval per driver
 */
export function getLatestIntervalPerDriver(intervals) {
  const latest = {};
  if (!intervals) return latest;

  for (const interval of intervals) {
    const dn = interval.driver_number;
    if (!latest[dn] || new Date(interval.date) > new Date(latest[dn].date)) {
      latest[dn] = interval;
    }
  }
  return latest;
}

/**
 * Get all laps for a specific driver
 */
export function getDriverLaps(laps, driverNumber) {
  if (!laps) return [];
  return laps
    .filter(l => l.driver_number === driverNumber)
    .sort((a, b) => a.lap_number - b.lap_number);
}

/**
 * Get personal best sectors for a driver
 */
export function getPersonalBestSectors(laps, driverNumber) {
  const driverLaps = getDriverLaps(laps, driverNumber);
  let s1 = Infinity, s2 = Infinity, s3 = Infinity;

  for (const lap of driverLaps) {
    if (lap.duration_sector_1 && lap.duration_sector_1 < s1) s1 = lap.duration_sector_1;
    if (lap.duration_sector_2 && lap.duration_sector_2 < s2) s2 = lap.duration_sector_2;
    if (lap.duration_sector_3 && lap.duration_sector_3 < s3) s3 = lap.duration_sector_3;
  }

  return {
    s1: s1 === Infinity ? null : s1,
    s2: s2 === Infinity ? null : s2,
    s3: s3 === Infinity ? null : s3,
  };
}

/**
 * Calculate session type display name
 */
export function getSessionTypeName(sessionType) {
  const types = {
    'Practice 1': 'FP1',
    'Practice 2': 'FP2',
    'Practice 3': 'FP3',
    'Sprint Shootout': 'Sprint SQ',
    'Sprint Qualifying': 'Sprint Q',
    'Sprint': 'Sprint',
    'Qualifying': 'Qualifying',
    'Race': 'Race',
  };
  return types[sessionType] || sessionType || 'Session';
}

/**
 * Session years available
 */
export function getAvailableYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 2023; y--) {
    years.push(y);
  }
  return years;
}
