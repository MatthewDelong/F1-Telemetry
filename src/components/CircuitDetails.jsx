import React from 'react';
import circuitDetails from '../config/circuitDetails.json';
import { locationMaps } from '../utils/locationMaps';

export default function CircuitDetails({ circuitId, trackReferenceData, mapPath }) {
  // Try to find circuit info from JSON
  const details = circuitDetails[circuitId];

  if (!details) {
    return null; // Or some fallback text
  }

  return (
    <div className="bg-glow-large p-16 sm:p-32 rounded-xlarge mb-32 border border-neutral-800">
      <h3 className="heading-4 mb-24 text-neutral-400">Circuit Details</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-16 md:gap-32">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-xs text-neutral-500 mb-4">First Grand Prix</span>
          <span className="text-xl font-display text-white">{details.firstGrandPrix}</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-xs text-neutral-500 mb-4">Number of Laps</span>
          <span className="text-xl font-display text-white">{details.raceLaps}</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-xs text-neutral-500 mb-4">Circuit Length</span>
          <span className="text-xl font-display text-white">{details.length}</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-xs text-neutral-500 mb-4">Number of Corners</span>
          <span className="text-xl font-display text-white">{details.corners}</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-xs text-neutral-500 mb-4">ERS Zones</span>
          <span className="text-xl font-display text-white">{details.drsZones}</span>
        </div>
        
        <div className="flex flex-col col-span-2 md:col-span-1">
          <span className="text-xs uppercase tracking-xs text-neutral-500 mb-4">Lap Record</span>
          <span className="text-md sm:text-lg text-white font-display">{details.lapRecord}</span>
        </div>
      </div>
    </div>
  );
}
