import React from "react";
import { trackLengths } from "../utils/trackLengths";
import { nationalityToFlag } from "../utils/nationalityToFlag";

export const SelectedDriverStats = (props) => {
    const { selectedDriverData, selectedDriverRaceData, year, speedUnit } = props;
    const isMph = speedUnit === "mph";
    const displayUnit = isMph ? "mph" : "kph";
    const conversionFactor = isMph ? 0.621371 : 1;

    if (!selectedDriverData || !selectedDriverRaceData) {
        return null;
    }

    return (
        <div className="mb-32">
            <div className="flex items-end relative w-[23.6rem] mx-auto">
                <img
                    alt=""
                    src={`${
                        "/images/" +
                        year +
                        "/drivers/" +
                        (selectedDriverData?.acronym || "placeholder") +
                        ".png"
                    }`}
                    width={120}
                    height={120}
                />
                <img
                    alt=""
                    className="absolute -bottom-16 left-32"
                    src={`${
                        "/images/" +
                        year +
                        "/cars/" +
                        (selectedDriverRaceData?.Constructor?.constructorId || "placeholder") +
                        ".png"
                    }`}
                    width={150}
                />
                <div className="-ml-32 w-full">
                    <h3 className="tracking-xs text-sm uppercase gradient-text-medium -mb-8">
                        {selectedDriverData?.first_name}
                    </h3>
                    <h3 className="font-display gradient-text-light text-[2rem]">
                        {selectedDriverData?.last_name}
                    </h3>
                    <p className="font-display gradient-text-dark text-[6.4rem] mr-16 leading-none text-right">
                        {selectedDriverData?.driver_number}
                    </p>
                </div>
            </div>
            <div className="bg-glow bg-glow-large px-24 pt-24 pb-24 rounded-xlarge">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="uppercase tracking-xs text-xs">
                            Finished
                        </div>
                        <div>
                            <span className="font-display text-[3.2rem]">
                                {selectedDriverRaceData?.position}
                            </span>
                            <span className="uppercase tracking-xs text-xs ml-4">
                                {selectedDriverRaceData?.status === "Finished"
                                    ? selectedDriverRaceData?.Time?.time
                                    : selectedDriverRaceData?.status}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center self-center -mt-8">
                        {(selectedDriverData?.country_code || selectedDriverData?.nationality || selectedDriverData?.acronym || selectedDriverData?.code) && (
                            <img 
                                src={nationalityToFlag(selectedDriverData.country_code || selectedDriverData.nationality || selectedDriverData.acronym || selectedDriverData.code)} 
                                alt="flag"
                                className="h-24 rounded-sm shadow-md"
                            />
                        )}
                    </div>
                    <div className="text-right">
                        <div className="uppercase tracking-xs text-xs">
                            Started
                        </div>
                        <div className="font-display text-[3.2rem]">
                            {selectedDriverRaceData?.grid}
                        </div>
                    </div>
                </div>

                <div className="divider-glow-dark mt-12 mb-10" />

                <p className="font-display text-center mb-14 ml-24">
                    fastest lap
                </p>

                <div className="flex items-center justify-between">
                    <div>
                        <div className="uppercase tracking-xs text-xs">
                            Time
                        </div>
                        <div className="font-display">
                            {selectedDriverRaceData?.FastestLap?.Time?.time || "N/A"}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="uppercase tracking-xs text-xs">Lap</div>
                        <div className="font-display">
                            {selectedDriverRaceData?.FastestLap?.lap || "N/A"}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-16">
                    <div>
                        <div className="flex items-center gap-8">
                            <span className="uppercase tracking-xs text-xs">avg speed</span>
                            <button 
                                onClick={props.onToggleUnit}
                                className="text-[10px] bg-neutral-800 hover:bg-neutral-700 px-8 py-1 rounded border border-neutral-700 transition-colors uppercase tracking-widest text-neutral-400 hover:text-white"
                            >
                                {isMph ? "To KPH" : "To MPH"}
                            </button>
                        </div>
                        <div className="mt-4">
                            <span className="font-display">
                                {(() => {
                                    const fl = selectedDriverRaceData?.FastestLap;
                                    const speedObj = fl?.AverageSpeed || fl?.averageSpeed;
                                    
                                    // If we have a speed object, convert it if necessary
                                    if (speedObj?.speed) {
                                        const baseSpeed = parseFloat(speedObj.speed);
                                        const baseUnits = (speedObj.units || "").toLowerCase();
                                        
                                        // Assume base is KPH if not specified or "kph"
                                        if (isMph && (baseUnits === "kph" || baseUnits === "km/h" || !baseUnits)) {
                                            return (baseSpeed * 0.621371).toFixed(3);
                                        } else if (!isMph && baseUnits === "mph") {
                                            return (baseSpeed / 0.621371).toFixed(3);
                                        }
                                        return baseSpeed.toFixed(3);
                                    }
                                    
                                    // Fallback calculation
                                    const lapTimeStr = fl?.Time?.time || fl?.time?.time || fl?.Time || fl?.time;
                                    const length = props.circuitId && trackLengths[props.circuitId];
                                    
                                    if (lapTimeStr && length) {
                                        const parts = lapTimeStr.split(/[:.]/).map(Number);
                                        let totalSeconds = 0;
                                        if (parts.length === 3) { // mm:ss.ms
                                            totalSeconds = parts[0] * 60 + parts[1] + parts[2] / 1000;
                                        } else if (parts.length === 2) { // ss.ms or mm:ss
                                            if (lapTimeStr.includes(':')) {
                                                totalSeconds = parts[0] * 60 + parts[1];
                                            } else {
                                                totalSeconds = parts[0] + parts[1] / 1000;
                                            }
                                        }
                                        
                                        if (totalSeconds > 0) {
                                            const kph = (length / totalSeconds) * 3600;
                                            return (kph * conversionFactor).toFixed(3);
                                        }
                                    }
                                    
                                    return "N/A";
                                })()}
                            </span>
                            <span className="uppercase tracking-xs text-xs ml-4">
                                {displayUnit}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="uppercase tracking-xs text-xs">
                            Rank
                        </div>
                        <div>
                            <span className="font-display">{selectedDriverRaceData?.FastestLap?.rank || "N/A"}</span> <span className="text-xs">/ 20</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

