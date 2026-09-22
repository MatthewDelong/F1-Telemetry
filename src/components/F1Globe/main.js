import * as THREE from "three";
import "./style.css";
import { buildGlobe, getSunPosition, latLngToVector3 } from "./globe.js";
import { OrbitalControls } from "./controls.js";
import { Tooltip } from "./ui/tooltip.js";
import { Sidebar } from "./ui/sidebar.js";

/* ------------------------------------------------------------------ */
/*  Scene setup                                                       */
/* ------------------------------------------------------------------ */
// Encapsulated setup for React integration
export function mountF1Globe(container, races) {
  const canvas = container.querySelector("#globe-canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030305);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, 14);

  function updateCameraOffset() {
    if (container.clientWidth > 768) {
      // Shift the frustum right by 170px (half of 340px sidebar) so the globe visually shifts left
      camera.setViewOffset(
        container.clientWidth,
        container.clientHeight,
        170,
        0,
        container.clientWidth,
        container.clientHeight,
      );
    } else {
      camera.clearViewOffset();
    }
  }
  updateCameraOffset();

  /* ------------------------------------------------------------------ */
  /*  Build globe & get references                                      */
  /* ------------------------------------------------------------------ */
  const { globeGroup, markers, racePath, sunLight } = buildGlobe(scene, races);

  /* ------------------------------------------------------------------ */
  /*  Controls                                                          */
  /* ------------------------------------------------------------------ */
  const controls = new OrbitalControls(camera, canvas, globeGroup);

  /* ------------------------------------------------------------------ */
  /*  UI                                                                */
  /* ------------------------------------------------------------------ */
  const tooltip = new Tooltip(container, camera, canvas, markers, races);
  const sidebar = new Sidebar(container, controls, tooltip, races);

  /* ------------------------------------------------------------------ */
  /*  Animation loop                                                    */
  /* ------------------------------------------------------------------ */
  let animTime = 0;
  let animId = null;

  function animate() {
    animId = requestAnimationFrame(animate);
    animTime += 0.005;

    // Update controls
    controls.update();

    // Update tooltip
    tooltip.update();

    // Update sun based on browser time
    const now = new Date();
    const sunPos = getSunPosition(now);
    const sunVec = latLngToVector3(sunPos.lat, sunPos.lng, 100);
    sunLight.position.copy(sunVec);

    // Calculate combined tracing timeline for race paths
    let pastTotal = 0;
    let futureTotal = 0;
    racePath.traverse((child) => {
      if (child.userData && child.userData.isPastPath)
        pastTotal = child.userData.totalLength || 0;
      if (child.userData && child.userData.isFuturePath)
        futureTotal = child.userData.totalLength || 0;
    });

    const globalTotal = pastTotal + futureTotal;
    const drawSpeed = 7.0;
    const pauseTime = 1.0;

    // If globalTotal is 0 (shouldn't realistically happen), prevent division by zero
    if (globalTotal > 0) {
      const drawTime = globalTotal / drawSpeed;
      const cycleTime = drawTime + pauseTime;

      const t = animTime % cycleTime;
      const currentDist = t * drawSpeed;

      racePath.traverse((child) => {
        if (child.userData && child.userData.isPastPath) {
          child.material.dashSize = Math.max(
            Math.min(currentDist, pastTotal),
            0.001,
          );
          child.material.gapSize = pastTotal;
        }
        if (child.userData && child.userData.isFuturePath) {
          // Only start drawing red once we've covered the blue distance
          const redDist = currentDist - pastTotal;
          child.material.dashSize = Math.max(
            Math.min(redDist, futureTotal),
            0.001,
          );
          child.material.gapSize = futureTotal;
        }
      });
    }

    // Fade markers near the globe horizon to prevent depth-clip visual drift
    const camDir = camera.position.clone().normalize();
    let idx = 0;
    markers.children.forEach((child) => {
      if (child.userData.race) {
        idx++;
        // Fade the core marker near the edge
        const markerDir = child.position.clone().normalize();
        const facing = markerDir.dot(camDir);
        // Smooth fade: fully visible when facing > 0.2, hidden at facing < 0.05
        const fade = THREE.MathUtils.smoothstep(facing, 0.05, 0.2);
        child.material.opacity = 0.95 * fade;
        child.visible = facing > 0.0;
      } else {
        // Ring: fade near edge
        const markerDir = child.position.clone().normalize();
        const facing = markerDir.dot(camDir);
        const fade = THREE.MathUtils.smoothstep(facing, 0.05, 0.2);
        child.visible = facing > 0.0;
        if (child.material) {
          child.material.opacity = 0.25 * fade;
        }
      }
    });

    renderer.render(scene, camera);
  }

  animate();

  /* ------------------------------------------------------------------ */
  /*  Resize                                                            */
  /* ------------------------------------------------------------------ */
  const onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    controls.defaultRadius = container.clientWidth <= 768 ? 24 : 14;
    updateCameraOffset();
  };
  window.addEventListener("resize", onResize);

  return () => {
    // Cleanup function
    cancelAnimationFrame(animId);
    window.removeEventListener("resize", onResize);
    controls.dispose();
    tooltip.dispose();
    sidebar.dispose();
    renderer.dispose();
  };
}
