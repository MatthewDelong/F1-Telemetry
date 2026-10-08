import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import classNames from "classnames";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import TWEEN from "@tweenjs/tween.js";

import {
  buildTrackFromGPS,
  telemetryToScene,
  updateTrackColors,
} from "../utils/TrackBuilder";
import sectorBoundaries from "../config/f1/sectorBoundaries.json";
import { locationMaps } from "../utils/locationMaps";
import RaceHud from "./RaceHud";

/**
 * ThreeCanvas: Self-Calibrating 3D Race Viewer
 *
 * Features:
 * - Ref-Based Synchronization: Thread-safe data management for 3D loops.
 * - Dynamic Framing: Automatic viewport fitting for any circuit.
 * - Procedural Track: Built from GPS data via TrackBuilder (no Blender required).
 */
export const ThreeCanvas = ({
  trackReferenceData,
  circuitId,
  locData,
  driverColor,
  driverSelected,
  isPaused,
  haloView,
  topFollowView,
  speedFactor,
  className,
  constructorId,
  year,
  speedUnit,
  onSpeedUnitChange,
  onPausedChange,
  onSpeedFactorChange,
  onCameraViewChange,
  hudContainer,
}) => {
  // 1. Initial Refs for Scene
  const mountRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const haloCameraRef = useRef(null);
  const topFollowCameraRef = useRef(null);
  const carModelRef = useRef(null);
  const mapRef = useRef(null);
  const trailLineRef = useRef(null);
  const trailPointsRef = useRef([]);
  const requestRef = useRef(null);
  const trackCurveRef = useRef(null);

  // 2. Refs for Thread-Safe Data
  const locDataRef = useRef([]);
  const currentLoadRequestRef = useRef(0);

  // Procedural track calibration ref
  const trackCalibrationRef = useRef(null);

  // Unified Sync Ref for props & calibration
  const syncRef = useRef({
    isPaused,
    speedFactor,
    haloView,
    topFollowView,
    driverColor,
    driverSelected,
    calibrated: true, // Always calibrated in simplified model
    telemetryCenter: new THREE.Vector2(0, 0),
    telemetryScale: 1.0,
    mapDimension: 0,
    theta: (-131 * Math.PI) / 180,
    cameraHeight: 15,
    radius: 20,
  });

  // 3. UI State
  const [isCircuitLoaded, setIsCircuitLoaded] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(true);
  const [driverDetails, setDriverDetails] = useState(null);
  const [theta, setTheta] = useState((-131 * Math.PI) / 180);
  const [cameraHeight, setCameraHeight] = useState(
    window.innerWidth < 768 ? 28.5 : 21,
  );
  const [radius, setRadius] = useState(window.innerWidth < 768 ? 38 : 28);
  const [trackColorMode, setTrackColorMode] = useState("sectors");

  // Dynamic Prop Sync
  useEffect(() => {
    syncRef.current.isPaused = isPaused;
    syncRef.current.speedFactor = speedFactor;
    syncRef.current.haloView = haloView;
    syncRef.current.topFollowView = topFollowView;
    syncRef.current.driverColor = driverColor;
    syncRef.current.driverSelected = driverSelected;
    syncRef.current.theta = theta;
    syncRef.current.cameraHeight = cameraHeight;
    syncRef.current.radius = radius;
  }, [
    isPaused,
    speedFactor,
    haloView,
    topFollowView,
    driverColor,
    driverSelected,
    theta,
    cameraHeight,
    radius,
  ]);

  // Handle color updates
  useEffect(() => {
    if (mapRef.current && trackCurveRef.current) {
      const canonicalId =
        locationMaps[circuitId?.toLowerCase()] || circuitId?.toLowerCase();
      const bounds = sectorBoundaries[canonicalId] ||
        sectorBoundaries[circuitId] || [0.333, 0.666];
      updateTrackColors(
        mapRef.current,
        trackCurveRef.current,
        bounds,
        trackColorMode,
      );
    }
  }, [trackColorMode, circuitId]);

  // 4. Initial Scene Setup (RUN ONCE)
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const scene = sceneRef.current;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(
      currentMount.clientWidth,
      currentMount.clientHeight || 700,
    );
    renderer.setClearColor(0x000000, 0);
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          renderer.setSize(width, height);
          
          if (cameraRef.current) {
            cameraRef.current.aspect = width / height;
            // Dynamically scale vertical FOV in portrait to keep the track horizontally large
            cameraRef.current.fov = width < height ? 40 * (height / width) : 40;
            cameraRef.current.updateProjectionMatrix();
          }
          if (haloCameraRef.current) {
            haloCameraRef.current.aspect = width / height;
            haloCameraRef.current.updateProjectionMatrix();
          }
          if (topFollowCameraRef.current) {
            topFollowCameraRef.current.aspect = width / height;
            topFollowCameraRef.current.updateProjectionMatrix();
          }
        }
      }
    });
    resizeObserver.observe(currentMount);

    // Core Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 2.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(200, 400, 200);
    scene.add(dirLight);

    // Standard Camera
    cameraRef.current = new THREE.PerspectiveCamera(
      40,
      currentMount.clientWidth / (currentMount.clientHeight || 700),
      0.5,
      30000,
      1,
    );
    cameraRef.current.up.set(0, 0, 1);

    // Car Cameras
    const aspect =
      currentMount.clientWidth / (currentMount.clientHeight || 700);

    haloCameraRef.current = new THREE.PerspectiveCamera(75, aspect, 0.01, 5000);
    haloCameraRef.current.position.set(0, 0.6, 0.3); // Y is Height, Z is Depth
    haloCameraRef.current.rotation.set(Math.PI / 12, Math.PI, 0);

    topFollowCameraRef.current = new THREE.PerspectiveCamera(
      72,
      aspect,
      0.1,
      5000,
    );
    topFollowCameraRef.current.position.set(0, 2.5, -3.5); // Y is Height, Z is Depth
    topFollowCameraRef.current.rotation.set(Math.PI / 5.5, Math.PI, 0);

    // Progressive Trail
    const MAX_TRAIL = 800;
    const trailGeom = new THREE.BufferGeometry();
    trailGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(MAX_TRAIL * 3), 3),
    );
    trailGeom.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(MAX_TRAIL * 3), 3),
    );
    trailLineRef.current = new THREE.Line(
      trailGeom,
      new THREE.LineBasicMaterial({
        transparent: true,
        vertexColors: true,
        linewidth: 4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(trailLineRef.current);

    const animate = (time) => {
      try {
        TWEEN.update(time);
        const sync = syncRef.current;

        // 1. Car Animation Step
        if (
          carModelRef.current &&
          locDataRef.current.length > 0 &&
          sync.driverSelected &&
          !carModelRef.current.userData.tweenActive &&
          !sync.isPaused &&
          sync.calibrated
        ) {
          let next = locDataRef.current.shift();
          let targetX = 0,
            targetY = 0;

          // FAST-FORWARD invalid points instantly (e.g. thousands of 0,0 points before race start)
          while (next) {
            // Calculate targetX/targetY for 'next'
            if (trackCalibrationRef.current) {
              const scenePos = telemetryToScene(
                (next.x || 0) * 1500, // Reverse the /1500 scaling applied in fetchLocationData
                (next.y || 0) * 1500,
                trackCalibrationRef.current.center,
                trackCalibrationRef.current.scale,
                trackCalibrationRef.current.invertX,
                trackCalibrationRef.current.invertY,
              );
              targetX = scenePos.x;
              targetY = scenePos.y;
            } else {
              targetX =
                ((next.x || 0) - sync.telemetryCenter.x) * sync.telemetryScale;
              targetY =
                ((next.y || 0) - sync.telemetryCenter.y) * sync.telemetryScale;
            }

            // Check if valid (strict finite check)
            if (
              Number.isFinite(targetX) &&
              Number.isFinite(targetY) &&
              !(next.x === 0 && next.y === 0)
            ) {
              break; // Found a valid point!
            }

            // Point is invalid, skip it, but keep driver details if any
            if (next.cardata) setDriverDetails(next.cardata);
            next = locDataRef.current.shift();
          }

          if (next && Number.isFinite(targetX) && Number.isFinite(targetY)) {
            carModelRef.current.userData.tweenActive = true;
            const oldPos = carModelRef.current.position.clone();
            // Bulletproof fix: If the distance is massive (e.g. first spawn, teleport, driver switch, GPS glitch)
            // do not tween! Snap instantly and clear the trail memory to prevent laser beams.
            const distSq =
              (targetX - oldPos.x) ** 2 + (targetY - oldPos.y) ** 2;
            if (distSq > 100 || carModelRef.current.userData.isFirstSpawn) {
              carModelRef.current.position.set(targetX, targetY, 0.03);
              carModelRef.current.userData.tweenActive = false;
              carModelRef.current.userData.isFirstSpawn = false;
              if (carModelRef.current.userData.currentTween) {
                carModelRef.current.userData.currentTween.stop();
                carModelRef.current.userData.currentTween = null;
              }
              trailPointsRef.current = [];
              if (next.cardata) setDriverDetails(next.cardata);
            } else {
              const tween = new TWEEN.Tween(carModelRef.current.position)
                .to({ x: targetX, y: targetY, z: 0.03 }, 12)
                .onUpdate(() => {
                  if (!carModelRef.current) return;
                  const dx = targetX - oldPos.x;
                  const dy = targetY - oldPos.y;
                  if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
                    const angle = Math.atan2(dy, dx);
                    carModelRef.current.rotation.set(
                      Math.PI / 2,
                      0,
                      angle + Math.PI / 2,
                      "YZX",
                    );
                  }
                })
                .easing(TWEEN.Easing.Linear.None)
                .delay(50 * sync.speedFactor)
                .onComplete(() => {
                  if (carModelRef.current && carModelRef.current.userData) {
                    carModelRef.current.userData.tweenActive = false;
                    carModelRef.current.userData.currentTween = null;
                  }
                  if (next.cardata) setDriverDetails(next.cardata);
                });

              carModelRef.current.userData.currentTween = tween;
              carModelRef.current.userData.isTweenPaused = false;
              tween.start();
            }
          }
        }

        // Pause/Resume Current Tween
        if (carModelRef.current && carModelRef.current.userData.currentTween) {
          if (sync.isPaused && !carModelRef.current.userData.isTweenPaused) {
            carModelRef.current.userData.currentTween.pause();
            carModelRef.current.userData.isTweenPaused = true;
          } else if (
            !sync.isPaused &&
            carModelRef.current.userData.isTweenPaused
          ) {
            carModelRef.current.userData.currentTween.resume();
            carModelRef.current.userData.isTweenPaused = false;
          }
        }

        // 2. Trail Buffer Step
        if (carModelRef.current && trailLineRef.current) {
          const pts = trailPointsRef.current;
          pts.push(carModelRef.current.position.clone());
          if (pts.length > MAX_TRAIL) pts.shift();
          const posArr =
            trailLineRef.current.geometry.attributes.position.array;
          const colArr = trailLineRef.current.geometry.attributes.color.array;
          const baseCol = new THREE.Color(`#${sync.driverColor || "737373"}`);
          for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            posArr[i * 3] = p.x;
            posArr[i * 3 + 1] = p.y;
            posArr[i * 3 + 2] = p.z - 0.01; // Elevation offset for trail visibility (just below car)
            const fade = (i + 1) / pts.length;
            colArr[i * 3] = baseCol.r * fade;
            colArr[i * 3 + 1] = baseCol.g * fade;
            colArr[i * 3 + 2] = baseCol.b * fade;
          }
          trailLineRef.current.geometry.setDrawRange(0, pts.length);
          trailLineRef.current.geometry.attributes.position.needsUpdate = true;
          trailLineRef.current.geometry.attributes.color.needsUpdate = true;
        }

        // 3. Render Step
        let activeCam = cameraRef.current;
        if (sync.haloView && carModelRef.current) {
          activeCam = haloCameraRef.current;
        } else if (sync.topFollowView && carModelRef.current) {
          activeCam = topFollowCameraRef.current;
        }

        // Dynamically elevate corner numbers in Halo view to avoid clipping,
        // but drop them back to the sticks for top-down overview
        const cornerLabelsGroup = scene.getObjectByName("CornerLabels");
        if (cornerLabelsGroup) {
          const targetZ = sync.haloView ? 1.5 : 0.1;
          cornerLabelsGroup.children.forEach(child => {
            if (child.isSprite) {
              // Smooth lerp for the elevation change
              child.position.z += (targetZ - child.position.z) * 0.1;
            }
          });
        }

        if (activeCam && rendererRef.current) {
          if (activeCam === cameraRef.current) {
            // Phase 2: Auto-orbiting camera for 360 preview mode
            if (!sync.driverSelected) {
              sync.theta += 0.002; // Slow, cinematic orbit
            }

            activeCam.position.set(
              sync.radius * Math.cos(sync.theta),
              sync.radius * Math.sin(sync.theta),
              sync.cameraHeight,
            );
            // Look directly at the origin to center the track perfectly in the viewport
            // Removing the previous -6 offset that pushed the track artificially high up
            activeCam.lookAt(0, 0, 0);
          }
          rendererRef.current.render(scene, activeCam);
        }
      } catch (err) {
        console.error("[THREE] Anim Loop Crash Handled:", err);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      resizeObserver.disconnect();
      if (rendererRef.current && currentMount) {
        currentMount.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      TWEEN.removeAll();
    };
  }, []);

  // 5. Procedural Track Generation from GPS Reference Data
  useEffect(() => {
    if (!trackReferenceData || trackReferenceData.length < 10) return;

    const currentScene = sceneRef.current;

    // Remove previous track
    if (mapRef.current) {
      currentScene.remove(mapRef.current);
      mapRef.current = null;
    }

    setIsCircuitLoaded(false);

    const result = buildTrackFromGPS(trackReferenceData, circuitId);
    if (!result) {
      console.warn("[ThreeCanvas] Failed to build procedural track");
      return;
    }

    const { group, curve, center, scale, invertX, invertY } = result;

    // Store calibration for converting driver telemetry to scene coordinates
    trackCalibrationRef.current = { center, scale, invertX, invertY };
    trackCurveRef.current = curve;

    currentScene.add(group);
    mapRef.current = group;

    setIsCircuitLoaded(true);
    console.log("[ThreeCanvas] Procedural track loaded and calibrated");
  }, [trackReferenceData, circuitId]);

  // 6. Telemetry Analysis & Synchronization
  useEffect(() => {
    if (!isCircuitLoaded) return;
    locDataRef.current = Array.isArray(locData) ? [...locData] : [];
  }, [locData, isCircuitLoaded]);

  // 7. Driver Car Population
  useEffect(() => {
    if (!driverSelected || !isCalibrated) return;

    const requestId = ++currentLoadRequestRef.current;
    const currentScene = sceneRef.current;

    // Cleanup
    if (carModelRef.current) {
      currentScene.remove(carModelRef.current);
      carModelRef.current = null;
    }

    // Clear the trail when switching drivers
    trailPointsRef.current = [];

    const teamTextureMap = {
      mercedes: "mercedes_LowPolyUv.png",
      ferrari: "ferrari_LowPolyUv.png",
      red_bull: "red_bull_LowPolyUv.png",
      mclaren: "mclaren_LowPolyUv.png",
      aston_martin: "aston_martin_LowPolyUv.png",
      alpine: "alpine_LowPolyUv.png",
      williams: "williams_LowPolyUv.png",
      haas: "haas_LowPolyUv.png",
      sauber: "sauber_LowPolyUv.png",
      rb: "rb_LowPolyUv.png",
      apx: "alpine_LowPolyUv.png", // Fallback for APX
    };

    const textureLoader = new THREE.TextureLoader();
    const textureFile =
      teamTextureMap[constructorId] || "mercedes_LowPolyUv.png";

    textureLoader.load(`/car25/${textureFile}`, (texture) => {
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;

      new GLTFLoader().load("/car25/scene.gltf", (gltf) => {
        if (requestId !== currentLoadRequestRef.current) return;

        const car = gltf.scene;
        // Scaled up for better visibility
        car.scale.set(0.05, 0.05, 0.05);
        car.rotation.x = Math.PI / 2;
        car.rotation.y = -Math.PI;

        const startPos = locDataRef.current[0] || { x: 0, y: 0 };
        car.position.set(startPos.x, startPos.y, 0);

        // Add a dynamic glowing light to the car matching the team color!
        const hexColor = parseInt(
          (driverColor || "#ffffff").replace("#", "0x"),
          16,
        );
        const carGlow = new THREE.PointLight(hexColor, 8.0, 6.0);
        carGlow.position.set(0, 0, 10.0); // Above the car
        car.add(carGlow);

        car.traverse((o) => {
          if (o.isMesh && o.material && o.material.name === "Body") {
            o.material.map = texture;
            o.material.color.set(0xffffff); // Use original texture colors
            o.material.needsUpdate = true;
          }
        });

        car.userData = { tweenActive: false, isFirstSpawn: true };

        currentScene.add(car);
        if (haloCameraRef.current) car.add(haloCameraRef.current);
        if (topFollowCameraRef.current) car.add(topFollowCameraRef.current);
        carModelRef.current = car;
      });
    });
  }, [driverSelected, isCalibrated, driverColor, constructorId]);

  return (
    <div
      className={classNames(
        className,
        "relative overflow-hidden w-full h-full min-h-[250px]",
      )}
    >
      <div
        ref={mountRef}
        className="three-canvas-container w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Floating Track Color Toggle */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[60]">
        <button
          onClick={() =>
            setTrackColorMode((prev) =>
              prev === "sectors" ? "heatmap" : "sectors",
            )
          }
          className="bg-[#1a1a1a]/80 backdrop-blur-sm hover:bg-[#333]/90 text-white font-display uppercase tracking-widest text-[11px] py-2 px-4 rounded-sm border border-white/10 transition-all duration-200 shadow-xl"
        >
          <span className="opacity-60 mr-2">🎨</span>
          {trackColorMode === "sectors"
            ? "Switch to Speed Heatmap"
            : "Switch to Sector Colors"}
        </button>
      </div>

      {driverSelected &&
        hudContainer &&
        createPortal(
          <RaceHud
            driverDetails={driverDetails}
            year={year}
            speedUnit={speedUnit}
            onSpeedUnitChange={onSpeedUnitChange}
            isPaused={isPaused}
            onPausedChange={onPausedChange}
            speedFactor={speedFactor}
            onSpeedFactorChange={onSpeedFactorChange}
            cameraView={haloView ? "halo" : topFollowView ? "top" : "sky"}
            onCameraViewChange={onCameraViewChange}
            theta={theta}
            onThetaChange={setTheta}
            cameraHeight={cameraHeight}
            onCameraHeightChange={setCameraHeight}
            radius={radius}
            onRadiusChange={setRadius}
          />,
          hudContainer,
        )}
    </div>
  );
};

export default ThreeCanvas;
