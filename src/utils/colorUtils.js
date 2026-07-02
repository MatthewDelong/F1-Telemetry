const parseHex = (hex) => {
  const color = hex.startsWith('#') ? hex.slice(1) : hex;
  return parseInt(color, 16);
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const adjustColor = (hex, percent, direction) => {
  const num = parseHex(hex);
  const amt = Math.round(2.55 * percent) * direction;
  const R = clamp((num >> 16) + amt, 0, 255);
  const G = clamp(((num >> 8) & 0x00FF) + amt, 0, 255);
  const B = clamp((num & 0x0000FF) + amt, 0, 255);

  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

export const darkenColor = (hex, percent = 20) => adjustColor(hex, percent, -1);

export const lightenColor = (hex, percent = 10) => adjustColor(hex, percent, 1);
