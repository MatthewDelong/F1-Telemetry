import React from "react";
import classNames from "classnames";
import { nationalityToFlag } from "../utils/nationalityToFlag";

const DriverCarDetails = ({ driverDetails, speedUnit, selectedDriverData, onToggleUnit, year }) => {
    const isModern = parseInt(year) >= 2026;
    const isMph = speedUnit === "mph";
    const displayUnit = isMph ? "mph" : "kph";

    const ersActiveNumbers = [10, 12, 14];
    // Simulated battery state (in a real app this would come from telemetry)
    const [battery, setBattery] = React.useState(85);

    React.useEffect(() => {
        if (ersActiveNumbers.includes(driverDetails.drs)) {
            setBattery(prev => Math.max(0, prev - 0.5));
        } else if (driverDetails.brake > 10) {
            setBattery(prev => Math.min(100, prev + 0.3));
        } else {
            setBattery(prev => Math.min(100, prev + 0.05)); // Slight trickle charge
        }
    }, [driverDetails.drs, driverDetails.brake]);

    return (
        <div className="px-16 py-10 shadow-xl bg-neutral-800/90 backdrop-blur-sm rounded-l-md min-w-[200px]">
            {selectedDriverData && (
                <div className="flex items-center gap-8 mb-8 border-b border-white/10 pb-8">
                    <div className="flex flex-col">
                        <p className="text-[10px] uppercase tracking-widest opacity-60 leading-none mb-4">Driver</p>
                        <div className="flex items-center gap-8">
                            <p className="font-display text-lg leading-none uppercase">
                                {selectedDriverData.first_name} <span className="font-black italic text-brand-blue-400">{selectedDriverData.last_name}</span>
                            </p>
                            {(selectedDriverData.country_code || selectedDriverData.nationality || selectedDriverData.acronym || selectedDriverData.code) && (
                                <img 
                                    src={nationalityToFlag(selectedDriverData.country_code || selectedDriverData.nationality || selectedDriverData.acronym || selectedDriverData.code)} 
                                    alt="flag"
                                    className="h-12 rounded-sm"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
            <div className="flex flex-col">
                <p className="gradient-text-light uppercase text-[1rem] tracking-sm leading-none">
                    Gear
                </p>
                <div className="flex items-center justify-between">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((number) => (
                        <p
                            key={number}
                            className={classNames(
                                "font-display ease-in-out leading-none text-sm",
                                driverDetails.n_gear === number
                                    ? "text-xl"
                                    : "text-neutral-400"
                            )}
                        >
                            {number}
                        </p>
                    ))}
                </div>
            </div>

            <div className="divider-glow-dark my-6 !h-8" />

            <div className="flex gap-32">
                <div className="flex flex-col w-[10rem] sm:w-[20rem]">
                    <p className="font-display max-sm:text-[2.4rem] sm:text-[6.4rem] leading-none">
                        {!isMph
                            ? driverDetails.speed
                            : Math.round(driverDetails.speed * 0.621371)}
                    </p>
                    <div className="flex items-center gap-8 uppercase text-[1rem] tracking-xs opacity-60">
                        {displayUnit}
                        <button 
                            onClick={onToggleUnit}
                            className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded text-[8px] transition-colors border border-white/5"
                        >
                            Toggle
                        </button>
                    </div>
                    <p
                        className={classNames(
                            "max-sm:text-[1rem] border-solid px-16 mt-8 text-center uppercase font-bold transition-all duration-300",
                            ersActiveNumbers.includes(driverDetails.drs)
                                ? (isModern ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "bg-emerald-900 text-emerald-500")
                                : (isModern && battery >= 100)
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                    : "bg-neutral-900 text-neutral-400 border border-white/5"
                        )}
                    >
                        {isModern 
                            ? (ersActiveNumbers.includes(driverDetails.drs) ? "ERS Deploying" : (battery >= 100 ? "ERS Charged" : "ERS Ready"))
                            : (ersActiveNumbers.includes(driverDetails.drs) ? "DRS Enabled" : "DRS Disabled")
                        }
                    </p>
                </div>
            </div>

            <div className="divider-glow-dark !h-8 mt-8 mb-4" />

            <div className="flex flex-col">
                <p className="gradient-text-light uppercase text-[1rem] tracking-sm">Throttle</p>
                <div className="shadow-lg bg-emerald-950">
                    <div
                        className="bg-gradient-to-r from-emerald-700 to-emerald-400 h-12 ease-in-out"
                        style={{
                            width: `${driverDetails.throttle}%`,
                        }}
                    />
                </div>
                <div className="shadow-lg bg-rose-950">
                    <div
                        className="bg-gradient-to-r from-rose-900 to-rose-600 h-12 ease-in-out"
                        style={{
                            width: `${driverDetails.brake}%`,
                        }}
                    />
                </div>
                <p className="gradient-text-light uppercase text-[1rem] tracking-sm">Brake</p>
                
                {isModern && (
                    <div className="mt-12 pt-8 border-t border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <p className={classNames("text-[10px] uppercase tracking-widest font-bold transition-colors duration-500", battery >= 100 ? "text-emerald-500" : "text-yellow-500/80")}>ERS Battery</p>
                            <p className={classNames("text-[10px] font-mono transition-colors duration-500", battery >= 100 ? "text-emerald-500" : "text-yellow-500/80")}>{Math.round(battery)}%</p>
                        </div>
                        <div className="h-6 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                            <div 
                                className={classNames(
                                    "h-full transition-all duration-500",
                                    battery >= 100 
                                        ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)] animate-pulse" 
                                        : "bg-gradient-to-r from-yellow-600 to-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                                )}
                                style={{ width: `${battery}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverCarDetails;

