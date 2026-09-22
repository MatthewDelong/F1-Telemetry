import * as THREE from "three";
import { continents, GRATICULE_STEP } from "./data/continents.js";

// Helper to determine if a race is strictly in the past
function isPassed(race) {
  if (race.countDownDate) {
    return new Date() > new Date(race.countDownDate);
  }
  if (!race.date || !race.ukTime) return false;
  // Fallback to manual UTC string
  const raceTimeString = `${race.date}T${race.ukTime}:00Z`;
  return new Date() > new Date(raceTimeString);
}
const GLOBE_RADIUS = 5;
const MARKER_SIZE = 0.07;

/* ------------------------------------------------------------------ */
/*  Helper: lat/lng → 3D position on sphere                          */
/* ------------------------------------------------------------------ */
export function latLngToVector3(lat, lng, radius = GLOBE_RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: sun position from date                                    */
/* ------------------------------------------------------------------ */
export function getSunPosition(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const declination =
    23.44 * Math.sin(((360 / 365.24) * (dayOfYear - 81) * Math.PI) / 180);

  const hoursUTC =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  let sunLng = 180 - hoursUTC * 15;
  if (sunLng > 180) sunLng -= 360;
  if (sunLng < -180) sunLng += 360;

  return { lat: declination, lng: sunLng };
}

/* ------------------------------------------------------------------ */
/*  Create the dark globe sphere                                      */
/* ------------------------------------------------------------------ */
function createGlobe() {
  const geo = new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96);
  // MeshStandardMaterial gives a softer, more realistic day/night transition
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a2b5a, // Lighter blue for daylight water
    emissive: 0x000000, // No inner glow, purely lit by the sun
    roughness: 0.6, // Spreads the light softly across the terminator
    metalness: 0.1, // Slight water-like specularity
  });
  return new THREE.Mesh(geo, mat);
}

/* ------------------------------------------------------------------ */
/*  Atmospheric glow halo (back-face edge glow)                       */
/* ------------------------------------------------------------------ */
function createAtmosphere() {
  const geo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.12, 96, 96);
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
        gl_FragColor = vec4(0.15, 0.35, 0.8, 1.0) * intensity;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

/* ------------------------------------------------------------------ */
/*  Inner glow (subtle front-face edge glow for depth)                */
/* ------------------------------------------------------------------ */
function createInnerGlow() {
  const geo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.01, 96, 96);
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.55 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
        gl_FragColor = vec4(0.2, 0.5, 1.0, 0.35) * intensity;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

/* ------------------------------------------------------------------ */
/*  Graticule grid lines                                              */
/* ------------------------------------------------------------------ */
function createGraticule() {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    color: 0x1a2a4a,
    transparent: true,
    opacity: 0.2,
    depthWrite: false, // Prevents z-fighting against the globe surface
  });

  // Latitude lines
  for (let lat = -80; lat <= 80; lat += GRATICULE_STEP) {
    const points = [];
    for (let lng = -180; lng <= 180; lng += 2) {
      points.push(latLngToVector3(lat, lng, GLOBE_RADIUS + 0.015));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Line(geo, material));
  }

  // Longitude lines
  for (let lng = -180; lng < 180; lng += GRATICULE_STEP) {
    const points = [];
    for (let lat = -90; lat <= 90; lat += 2) {
      points.push(latLngToVector3(lat, lng, GLOBE_RADIUS + 0.015));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Line(geo, material));
  }

  return group;
}

/* ------------------------------------------------------------------ */
/*  Continent outlines + filled landmasses                            */
/* ------------------------------------------------------------------ */
function createLandmasses() {
  const group = new THREE.Group();

  // Outline material
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x2255aa,
    transparent: true,
    opacity: 0.45,
  });

  // Fill material (dots)
  const dotMat = new THREE.PointsMaterial({
    color: 0x1a3366,
    size: 0.035,
    transparent: true,
    opacity: 0.35,
    sizeAttenuation: true,
  });

  for (const coords of continents.shapes) {
    if (coords.length < 3) continue;

    // Coastline outline
    const linePoints = coords.map(([lat, lng]) =>
      latLngToVector3(lat, lng, GLOBE_RADIUS + 0.015),
    );
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    group.add(new THREE.Line(lineGeo, lineMat));

    // Fill dots along the coastline (sparse interior fill)
    const dotPoints = [];
    for (let i = 0; i < coords.length - 1; i += 2) {
      // Skip some points for performance
      const [lat1, lng1] = coords[i];
      const [lat2, lng2] = coords[i + 1];
      const steps = 1;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const lat = lat1 + (lat2 - lat1) * t;
        const lng = lng1 + (lng2 - lng1) * t;
        dotPoints.push(latLngToVector3(lat, lng, GLOBE_RADIUS + 0.015));
      }
    }
    const dotGeo = new THREE.BufferGeometry().setFromPoints(dotPoints);
    group.add(new THREE.Points(dotGeo, dotMat));
  }

  return group;
}

/* ------------------------------------------------------------------ */
/*  Race markers — glowing red/blue spheres                           */
/* ------------------------------------------------------------------ */
function createMarkers(races) {
  const group = new THREE.Group();
  const markerGeo = new THREE.SphereGeometry(MARKER_SIZE, 16, 16);

  races.forEach((race) => {
    const pos = latLngToVector3(race.lat, race.lng, GLOBE_RADIUS + 0.03);
    const passed = isPassed(race);

    // Colors: Blue if passed, Red if upcoming
    const coreColor = passed ? 0x0088ff : 0xe10600;
    const ringColor = passed ? 0x33aaff : 0xff3030;

    // Core marker
    const coreMat = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.95,
    });
    const core = new THREE.Mesh(markerGeo, coreMat);
    core.position.copy(pos);
    core.userData = { race };
    group.add(core);

    // Bright ring
    const ringGeo = new THREE.RingGeometry(
      MARKER_SIZE * 1.5,
      MARKER_SIZE * 2.0,
      32,
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    group.add(ring);
  });

  return group;
}

/* ------------------------------------------------------------------ */
/*  Race path — animated line tracing the season route                */
/* ------------------------------------------------------------------ */
function createRacePath(races) {
  const group = new THREE.Group();

  // Great-circle interpolation between two points on the sphere
  function interpolateGreatCircle(p1, p2, segments = 30) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const lat = p1[0] + (p2[0] - p1[0]) * t;
      const lng = p1[1] + (p2[1] - p1[1]) * t;
      // Slight arc lift for visual depth
      const lift = Math.sin(t * Math.PI) * 0.15;
      points.push(latLngToVector3(lat, lng, GLOBE_RADIUS + 0.025 + lift));
    }
    return points;
  }

  const pastPoints = [];
  const futurePoints = [];

  for (let i = 0; i < races.length - 1; i++) {
    const from = races[i];
    const to = races[i + 1];
    const segPoints = interpolateGreatCircle(
      [from.lat, from.lng],
      [to.lat, to.lng],
      40,
    );

    const passed = isPassed(to);

    if (passed) {
      if (pastPoints.length === 0) {
        pastPoints.push(...segPoints);
      } else {
        pastPoints.push(...segPoints.slice(1));
      }
    } else {
      if (futurePoints.length === 0) {
        futurePoints.push(...segPoints);
      } else {
        futurePoints.push(...segPoints.slice(1));
      }
    }
  }

  if (pastPoints.length > 0) {
    const pastGeo = new THREE.BufferGeometry().setFromPoints(pastPoints);

    // Static faint blue path underneath
    const staticMat = new THREE.LineBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    });
    group.add(new THREE.Line(pastGeo, staticMat));

    // Animated bright blue path on top
    let totalLength = 0;
    for (let j = 1; j < pastPoints.length; j++) {
      totalLength += pastPoints[j].distanceTo(pastPoints[j - 1]);
    }

    const animatedMat = new THREE.LineDashedMaterial({
      color: 0x33aaff,
      transparent: true,
      opacity: 0.7,
      dashSize: totalLength,
      gapSize: totalLength,
      linewidth: 1,
      depthWrite: false,
    });

    const animatedLine = new THREE.Line(pastGeo, animatedMat);
    animatedLine.computeLineDistances();
    animatedLine.userData.totalLength = totalLength;
    animatedLine.userData.isAnimatedPath = true; // Signals main loop to animate this
    animatedLine.userData.isPastPath = true;
    group.add(animatedLine);
  }

  if (futurePoints.length > 0) {
    const futureGeo = new THREE.BufferGeometry().setFromPoints(futurePoints);

    // Static faint red path underneath
    const staticMat = new THREE.LineBasicMaterial({
      color: 0xe10600,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    });
    group.add(new THREE.Line(futureGeo, staticMat));

    // Animated bright red path on top
    let totalLength = 0;
    for (let j = 1; j < futurePoints.length; j++) {
      totalLength += futurePoints[j].distanceTo(futurePoints[j - 1]);
    }

    const animatedMat = new THREE.LineDashedMaterial({
      color: 0xff2020,
      transparent: true,
      opacity: 0.7,
      dashSize: totalLength,
      gapSize: totalLength,
      linewidth: 1,
      depthWrite: false,
    });

    const animatedLine = new THREE.Line(futureGeo, animatedMat);
    animatedLine.computeLineDistances();
    animatedLine.userData.totalLength = totalLength;
    animatedLine.userData.isAnimatedPath = true;
    animatedLine.userData.isFuturePath = true;
    group.add(animatedLine);
  }

  return group;
}

/* ------------------------------------------------------------------ */
/*  Lighting                                                          */
/* ------------------------------------------------------------------ */
function createLighting() {
  const group = new THREE.Group();

  // The Sun - highly intense directional light
  const sunLight = new THREE.DirectionalLight(0xffffff, 3.5);
  sunLight.position.set(10, 0, 0); // Will be updated dynamically
  group.add(sunLight);
  group.userData.sunLight = sunLight;

  // Dim ambient light for the night side
  const ambient = new THREE.AmbientLight(0x050510, 0.4);
  group.add(ambient);

  // Extremely subtle rim lights so the dark side isn't a pure black void
  const rim1 = new THREE.DirectionalLight(0x1a2a4a, 0.15);
  rim1.position.set(0, 10, 0);
  group.add(rim1);

  const rim2 = new THREE.DirectionalLight(0x1a2a4a, 0.15);
  rim2.position.set(0, -10, 0);
  group.add(rim2);

  return group;
}

/* ------------------------------------------------------------------ */
/*  Starfield Background                                              */
/* ------------------------------------------------------------------ */
function createStarTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.2, "rgba(255,255,255,0.8)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.2)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);

  return new THREE.CanvasTexture(canvas);
}

function createStarfield() {
  const group = new THREE.Group();
  const starTexture = createStarTexture();

  // Create two layers of stars: many faint ones, and fewer bright/larger ones
  const createLayer = (count, baseSize, maxOpacity) => {
    const geo = new THREE.BufferGeometry();
    const posArray = new Float32Array(count * 3);
    const colorArray = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      // Random position in a large sphere (radius 80 to 120)
      const r = 80 + Math.random() * 40;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      posArray[i] = r * Math.sin(phi) * Math.cos(theta);
      posArray[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      posArray[i + 2] = r * Math.cos(phi);

      // Random brightness varying wildly
      const brightness = 0.3 + Math.random() * 0.7; // 0.3 to 1.0
      colorArray[i] = brightness;
      colorArray[i + 1] = brightness;
      colorArray[i + 2] = brightness + Math.random() * 0.2; // slight blue tint
    }

    geo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));

    const mat = new THREE.PointsMaterial({
      size: baseSize,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: maxOpacity,
      sizeAttenuation: true, // Keep true, but we will pass much larger sizes
      depthWrite: false, // Fixes sorting transparency issues
    });

    return new THREE.Points(geo, mat);
  };

  // On mobile (high pixel density), Three.js POINTS shrink drastically if not sized up.
  // We use a large multiplier here to ensure they still draw with volume.
  const isMobile = window.innerWidth <= 768;
  const sizeMult = isMobile ? 3.0 : 1.0;

  // Layer 1: Background dust (faint, small, numerous)
  group.add(createLayer(3500, 0.2 * sizeMult, 0.85));

  // Layer 2: Bright hero stars (larger, bright, sparse)
  group.add(createLayer(300, 0.55 * sizeMult, 1.0));

  return group;
}

/* ------------------------------------------------------------------ */
/*  Build full scene                                                  */
/* ------------------------------------------------------------------ */
export function buildGlobe(scene, races) {
  const globeGroup = new THREE.Group();

  const globe = createGlobe();
  globeGroup.add(globe);
  globeGroup.add(createAtmosphere());
  globeGroup.add(createInnerGlow());
  // globeGroup.add(createGraticule()); // Removed per user request
  globeGroup.add(createLandmasses());

  const markers = createMarkers(races);
  globeGroup.add(markers);

  const racePath = createRacePath(races);
  globeGroup.add(racePath);

  const lightingGroup = createLighting();
  globeGroup.add(lightingGroup);

  scene.add(globeGroup);

  const starfield = createStarfield();
  scene.add(starfield);

  return {
    globeGroup,
    markers,
    racePath,
    sunLight: lightingGroup.userData.sunLight,
  };
}

export { GLOBE_RADIUS };
