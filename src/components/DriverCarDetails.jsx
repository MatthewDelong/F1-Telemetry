import React from "react";
import classNames from "classnames";
import { nationalityToFlag } from "../utils/nationalityToFlag";

const DriverCarDetails = ({ driverDetails, speedUnit, selectedDriverData, onToggleUnit }) => {
    const isMph = speedUnit === "mph";
    const displayUnit = isMph ? "mph" : "kph";

    const drsActiveNumbers = [10, 12, 14];

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
                            "max-sm:text-[1rem] border-solid px-16 mt-8 text-center",
                            drsActiveNumbers.includes(driverDetails.drs)
                                ? "bg-emerald-900 text-emerald-500"
                                : "bg-neutral-900 text-neutral-700"
                        )}
                    >
                        DRS Enabled
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
            </div>
        </div>
    );
};

export default DriverCarDetails;

