import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { buildTrackFromGPS } from "../utils/TrackBuilder";

export function MiniTrackViewer({ circuitId }) {
  const mountRef = useRef(null);
  const trackGroupRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!circuitId) return;

    let requestID;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      10000,
    );
    // Camera is at 0,0,0 by default, looking down -Z axis.

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.pointerEvents = "none";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";

    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    const trackGroup = new THREE.Group();
    // Put track group right in front of camera
    trackGroup.position.set(0, 0, -50);
    scene.add(trackGroup);
    trackGroupRef.current = trackGroup;

    // Load track geometry data
    console.log("[MiniTrackViewer] Fetching track for circuitId:", circuitId);
    fetch(`/trackdata/${circuitId}.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Track not found");
        return res.json();
      })
      .then((data) => {
        console.log(`[MiniTrackViewer] Fetched ${data?.length} points`);
        if (!data || data.length < 10) return;

        const validPoints = data.filter(
          (p) =>
            typeof p.x === "number" &&
            typeof p.y === "number" &&
            !isNaN(p.x) &&
            !isNaN(p.y),
        );
        if (validPoints.length < 10) return;

        const deduped = [validPoints[0]];
        for (let i = 1; i < validPoints.length; i++) {
          const prev = deduped[deduped.length - 1];
          const dx = validPoints[i].x - prev.x;
          const dy = validPoints[i].y - prev.y;
          if (Math.sqrt(dx * dx + dy * dy) > 0.5) {
            deduped.push(validPoints[i]);
          }
        }

        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;
        for (const p of deduped) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const maxRange = Math.max(maxX - minX || 1, maxY - minY || 1);
        const scaleFactor = 25 / maxRange;

        const pts3D = deduped.map(
          (p) =>
            new THREE.Vector3(
              (p.x - cx) * scaleFactor,
              (p.y - cy) * scaleFactor,
              0,
            ),
        );

        const curve = new THREE.CatmullRomCurve3(
          pts3D,
          true,
          "catmullrom",
          0.3,
        );
        const tubeGeom = new THREE.TubeGeometry(curve, 300, 0.6, 8, true);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.8,
        });
        const mesh = new THREE.Mesh(tubeGeom, mat);

        // Dynamically scale or push back trackGroup so it fits
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);

        // Adjust the entire group's distance so the maxDim perfectly fills a 45 deg FOV
        const dist = maxDim / (2 * Math.tan((Math.PI * 45) / 360));
        trackGroup.position.set(0, 0, -(dist * 1.3)); // Scale to medium size
        console.log(
          `[MiniTrackViewer] Track mesh size:`,
          size,
          `maxDim:`,
          maxDim,
          `Placed at z=`,
          -(dist * 1.2),
        );

        trackGroup.add(mesh);
      })
      .catch((err) => {
        console.error("[MiniTrackViewer] Error loading track geometry:", err);
        setError(true);
      });

    // Animation Loop
    const animate = () => {
      if (trackGroupRef.current) {
        trackGroupRef.current.rotation.z += 0.001;
      }
      renderer.render(scene, camera);
      requestID = requestAnimationFrame(animate);
    };
    animate();

    // Resize handling
    const handleResize = () => {
      if (mountRef.current) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(requestID);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [circuitId]);

  if (error || !circuitId) return null;

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 0,
        opacity: 0.5,
        overflow: "hidden",
      }}
    />
  );
}
