import React, { useRef, useEffect, useState } from "react";
import classNames from "classnames";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import TWEEN from "@tweenjs/tween.js";

import { Loading } from "./Loading";
import DriverCarDetails from "./DriverCarDetails";

/**
 * ThreeCanvas: Self-Calibrating 3D Race Viewer
 * 
 * Features:
 * - Ref-Based Synchronization: Thread-safe data management for 3D loops.
 * - Dynamic Framing: Automatic viewport fitting for any circuit.
 * - Origin-Sync: Precise overlay of telemetry on GLTF geometry.
 */
export const ThreeCanvas = ({
    MapFile,
    locData,
    driverColor,
    driverSelected,
    isPaused,
    haloView,
    topFollowView,
    speedFactor,
    className,
    showCarDetails,
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

    // 2. Refs for Thread-Safe Data
    const locDataRef = useRef([]);
    const currentLoadRequestRef = useRef(0);
    
    // Unified Sync Ref for props & calibration
    const syncRef = useRef({
        isPaused,
        speedFactor,
        haloView,
        topFollowView,
        driverColor,
        driverSelected,
        calibrated: false,
        telemetryCenter: new THREE.Vector2(0, 0),
        telemetryScale: 1.0,
        mapDimension: 0
    });

    // 3. UI State
    const [isCircuitLoaded, setIsCircuitLoaded] = useState(false);
    const [isCalibrated, setIsCalibrated] = useState(false);
    const [driverDetails, setDriverDetails] = useState(null);
    const [theta] = useState(-Math.PI / 2); 
    const [cameraHeight, setCameraHeight] = useState(14); 
    const [radius, setRadius] = useState(25);

    // Dynamic Prop Sync
    useEffect(() => {
        syncRef.current.isPaused = isPaused;
        syncRef.current.speedFactor = speedFactor;
        syncRef.current.haloView = haloView;
        syncRef.current.topFollowView = topFollowView;
        syncRef.current.driverColor = driverColor;
        syncRef.current.driverSelected = driverSelected;
    }, [isPaused, speedFactor, haloView, topFollowView, driverColor, driverSelected]);

    // 4. Initial Scene Setup (RUN ONCE)
    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        const scene = sceneRef.current;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight || 544);
        renderer.setClearColor(0x000000, 0); 
        currentMount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Core Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 2.5));
        const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
        dirLight.position.set(200, 400, 200);
        scene.add(dirLight);

        // Standard Camera
        cameraRef.current = new THREE.PerspectiveCamera(40, currentMount.clientWidth / (currentMount.clientHeight || 544), 0.5, 30000);
        cameraRef.current.up.set(0, 0, 1);

        // Car Cameras
        haloCameraRef.current = new THREE.PerspectiveCamera(75, 1, 0.1, 5000);
        haloCameraRef.current.position.set(0, 0.45, 0.35);
        haloCameraRef.current.rotation.set(Math.PI / 8, Math.PI, 0);

        topFollowCameraRef.current = new THREE.PerspectiveCamera(72, 1, 0.1, 5000);
        topFollowCameraRef.current.position.set(3.5, 2.5, -3.5);
        topFollowCameraRef.current.rotation.set(Math.PI / 8, Math.PI, 0);

        // Progressive Trail
        const MAX_TRAIL = 800;
        const trailGeom = new THREE.BufferGeometry();
        trailGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_TRAIL * 3), 3));
        trailGeom.setAttribute("color", new THREE.BufferAttribute(new Float32Array(MAX_TRAIL * 3), 3));
        trailLineRef.current = new THREE.Line(trailGeom, new THREE.LineBasicMaterial({ transparent: true, vertexColors: true, linewidth: 3 }));
        scene.add(trailLineRef.current);

        const animate = (time) => {
            try {
                TWEEN.update(time);
                const sync = syncRef.current;

                // 1. Car Animation Step
                if (carModelRef.current && locDataRef.current.length > 0 && sync.driverSelected && !carModelRef.current.userData.tweenActive && !sync.isPaused && sync.calibrated) {
                    const next = locDataRef.current.shift();
                    if (next) {
                        carModelRef.current.userData.tweenActive = true;
                        const oldPos = carModelRef.current.position.clone();
                        
                        const targetX = (next.x - sync.telemetryCenter.x) * sync.telemetryScale;
                        const targetY = (next.y - sync.telemetryCenter.y) * sync.telemetryScale;
                        
                        new TWEEN.Tween(carModelRef.current.position)
                            .to({ x: targetX, y: targetY, z: 0.15 }, 12)
                            .onUpdate(() => {
                                const dx = targetX - oldPos.x;
                                const dy = targetY - oldPos.y;
                                if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
                                    const angle = Math.atan2(dy, dx);
                                    carModelRef.current.rotation.set(Math.PI / 2, 0, angle + Math.PI / 2, "YZX");
                                }
                            })
                            .easing(TWEEN.Easing.Linear.None)
                            .delay(50 * sync.speedFactor)
                            .onComplete(() => {
                                carModelRef.current.userData.tweenActive = false;
                                if (next.cardata) setDriverDetails(next.cardata);
                            })
                            .start();
                    }
                }

                // 2. Trail Buffer Step
                if (carModelRef.current && trailLineRef.current) {
                    const pts = trailPointsRef.current;
                    pts.push(carModelRef.current.position.clone());
                    if (pts.length > MAX_TRAIL) pts.shift();
                    const posArr = trailLineRef.current.geometry.attributes.position.array;
                    const colArr = trailLineRef.current.geometry.attributes.color.array;
                    const baseCol = new THREE.Color(`#${sync.driverColor || "737373"}`);
                    for (let i = 0; i < pts.length; i++) {
                        const p = pts[i];
                        posArr[i * 3] = p.x; posArr[i * 3 + 1] = p.y; posArr[i * 3 + 2] = p.z;
                        const fade = (i + 1) / pts.length;
                        colArr[i * 3] = baseCol.r * fade; colArr[i * 3 + 1] = baseCol.g * fade; colArr[i * 3 + 2] = baseCol.b * fade;
                    }
                    trailLineRef.current.geometry.setDrawRange(0, pts.length);
                    trailLineRef.current.geometry.attributes.position.needsUpdate = true;
                    trailLineRef.current.geometry.attributes.color.needsUpdate = true;
                }

                // 3. Render Step
                let activeCam = cameraRef.current;
                if (sync.haloView) activeCam = haloCameraRef.current;
                else if (sync.topFollowView) activeCam = topFollowCameraRef.current;

                if (activeCam && rendererRef.current) {
                    if (activeCam === cameraRef.current) {
                        activeCam.position.set(radius * Math.cos(theta), radius * Math.sin(theta), cameraHeight);
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
            if (rendererRef.current && currentMount) {
                currentMount.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            TWEEN.removeAll();
        };
    }, [radius, cameraHeight]);

    // 5. Asset Loader & Map Processing
    useEffect(() => {
        if (!MapFile) return;
        
        setIsCircuitLoaded(false);
        setDriverDetails(null);
        
        new GLTFLoader().load(MapFile, (gltf) => {
            const currentScene = sceneRef.current;
            if (mapRef.current) currentScene.remove(mapRef.current);
            
            const map = gltf.scene;
            map.rotation.x = Math.PI / 2;
            
            // Calculate Precision Bounds
            const box = new THREE.Box3().setFromObject(map);
            const center = new THREE.Vector3();
            box.getCenter(center);
            map.position.sub(center); // Align geometric center to scene origin (0,0,0)
            
            const centeredBox = new THREE.Box3().setFromObject(map);
            const size = new THREE.Vector3();
            centeredBox.getSize(size);
            const dim = Math.max(size.x, size.y);
            
            setRadius(dim * 1.5);
            setCameraHeight(dim * 0.82);

            currentScene.add(map);
            mapRef.current = map;
            
            syncRef.current.mapDimension = dim;
            syncRef.current.calibrated = false; 
            
            setIsCircuitLoaded(true);
            setIsCalibrated(false);
            console.log("[THREE] Circuit Framed Successfully. MaxDim:", dim);
        });
    }, [MapFile]);

    // 6. Telemetry Analysis & Synchronization
    useEffect(() => {
        if (!locData || !Array.isArray(locData) || locData.length === 0 || !isCircuitLoaded) return;
        locDataRef.current = [...locData];

        const sync = syncRef.current;
        if (!sync.calibrated && sync.mapDimension > 0) {
            try {
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                locData.forEach(p => {
                    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
                });

                const diff = Math.max(maxX - minX, maxY - minY);
                if (diff > 0) {
                    sync.telemetryCenter = new THREE.Vector2((minX + maxX) / 2, (minY + maxY) / 2);
                    sync.telemetryScale = sync.mapDimension / diff;
                    sync.calibrated = true;
                    setIsCalibrated(true);
                    console.log("[THREE] Coordinate Mapping Complete. Scale:", sync.telemetryScale.toFixed(4));
                }
            } catch (err) {
                console.error("[THREE] Calibration Failed:", err);
            }
        }
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

        new GLTFLoader().load("/car25/scene.gltf", (gltf) => {
            if (requestId !== currentLoadRequestRef.current) return;
            
            const car = gltf.scene;
            const size = syncRef.current.mapDimension * 0.0135;
            car.scale.set(size, size, size);
            car.rotation.x = Math.PI / 2;
            car.rotation.y = -Math.PI;

            const startPos = locDataRef.current[0] || { x: syncRef.current.telemetryCenter.x, y: syncRef.current.telemetryCenter.y };
            car.position.set(
                (startPos.x - syncRef.current.telemetryCenter.x) * syncRef.current.telemetryScale,
                (startPos.y - syncRef.current.telemetryCenter.y) * syncRef.current.telemetryScale,
                0.15
            );

            car.traverse(o => {
                if (o.isMesh && o.material && o.material.name === "Body") {
                    o.material.color.setHex(`0x${driverColor || "737373"}`);
                    o.material.needsUpdate = true;
                }
            });

            currentScene.add(car);
            if (haloCameraRef.current) car.add(haloCameraRef.current);
            if (topFollowCameraRef.current) car.add(topFollowCameraRef.current);
            carModelRef.current = car;
        });
    }, [driverSelected, isCalibrated, driverColor]);

    return (
        <div className={classNames(className, "relative overflow-hidden w-full h-full min-h-[544px]")}>
            <div ref={mountRef} className="three-canvas-container" style={{ width: '100%', height: '100% !important' }} />
            {driverSelected && (
                <div className={classNames("driver-data absolute top-40 z-50 transition-all duration-300", showCarDetails ? "right-4" : "right-[-400px]")}>
                    {driverDetails ? <DriverCarDetails driverDetails={driverDetails} /> : <Loading message="Syncing telemetry..." />}
                </div>
            )}
        </div>
    );
};

export default ThreeCanvas;
