import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { buildTrackFromGPS } from '../utils/TrackBuilder';

function TrackGeometry({ trackKey }) {
  const [trackGroup, setTrackGroup] = useState(null);
  const meshRef = useRef();

  useEffect(() => {
    if (!trackKey) {
      setTrackGroup(null);
      return;
    }
    
    fetch(`/trackdata/${trackKey}.json`)
      .then(res => {
        if (!res.ok) throw new Error("Track data not found");
        return res.json();
      })
      .then(data => {
        const rawPoints = Array.isArray(data) ? data : data.points || data;
        if (!Array.isArray(rawPoints)) throw new Error("Invalid data");

        // We only use first lap if it's nested telemetry
        let pts = rawPoints;
        if (rawPoints[0] && rawPoints[0].telemetry) {
            pts = rawPoints[0].telemetry.map(t => ({ x: t.x, y: t.y }));
        }
        
        const result = buildTrackFromGPS(pts, trackKey);
        if (result && result.group) {
          setTrackGroup(result.group);
        }
      })
      .catch(err => {
        console.warn("Failed to load procedural track:", err);
      });
      
      return () => {
        if (trackGroup) setTrackGroup(null);
      }
  }, [trackKey]);

  useFrame((state) => {
    if (meshRef.current) {
      // Very slow continuous rotation along Z axis
      meshRef.current.rotation.z -= 0.002;
    }
  });

  if (!trackGroup) return null;

  return (
    <primitive 
      ref={meshRef} 
      object={trackGroup} 
      rotation={[-Math.PI / 3, 0, 0]} 
      scale={0.18} 
    />
  );
}

const ProceduralTrackBackground = ({ trackKey }) => {
  if (!trackKey) return null;

  return (
    <div className="absolute inset-0 z-0" style={{ pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 5.0], fov: 45 }}>
        <ambientLight intensity={3.0} />
        <directionalLight position={[5, 10, 5]} intensity={2.5} />
        <pointLight position={[0, 0, 10]} intensity={1.5} />
        <React.Suspense fallback={null}>
          <TrackGeometry trackKey={trackKey} />
        </React.Suspense>
        {/* No orbit controls so it acts purely as a background */}
      </Canvas>
    </div>
  );
};

export default ProceduralTrackBackground;
