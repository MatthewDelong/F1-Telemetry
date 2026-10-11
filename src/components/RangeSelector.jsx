import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

import { ReactSelectComponent } from './Select';
import { Button } from './Button';
import classNames from 'classnames';

export const RangeSelector = (props) => {
    const { 
        start, 
        end, 
        reset,
        setStart,
        setEnd, 
        setReset,
        raceDetails, 
        className,
        rangeOpen,
    } = props;

    const [isOpen, setIsOpen] = useState(rangeOpen);

    const handleStartChange = (selectedOption) => {
        setStart(selectedOption.value);
        setEnd(-1);
    };
      
    const handleReset = () => {
        setStart(-1);
        setEnd(-1);
        setReset(!reset);
    };

    const toggleOpen = () => {
        setIsOpen(!isOpen);
    };

    const race1name = raceDetails ? start > 0 && raceDetails.find(race => (race.round === start)).raceName : ''
    const race2name = raceDetails ? end > 0 && raceDetails.find(race => (race.round === end)).raceName : ''

    return (
        <>
        <div className={classNames(className, "flex flex-col items-center z-[2] relative mb-14")}>
            <button 
                type="button"
                onClick={toggleOpen}
                className={classNames(
                  "group flex items-center gap-6 px-14 py-5 rounded-lg text-xs font-mono font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer select-none border backdrop-blur-md shadow-sm",
                  isOpen || (start > 0 || end > 0)
                    ? "bg-brand-blue-500/15 text-white border-brand-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                    : "bg-[#0c0d14]/80 text-neutral-400 border-white/12 hover:border-white/30 hover:text-white hover:bg-white/[0.06]"
                )}
            >
                <span className="w-5 h-5 rounded-full bg-brand-blue-400 inline-block shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                <span>Race Range Filter</span>
                <svg
                  className={classNames(
                    "w-9 h-9 transition-transform duration-200 text-neutral-400 group-hover:text-white",
                    isOpen ? "rotate-180 text-brand-blue-400" : ""
                  )}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
            
            <div 
                className={`transition-all duration-300 ease-in-out w-full ${isOpen ? 'max-h-screen opacity-100 mt-12' : 'max-h-[0] opacity-0 overflow-hidden'}`}
            >
                <div className="flex max-md:flex-col justify-center items-center gap-12 z-[2] relative p-12 bg-[#0c0d14]/75 border border-white/10 rounded-xl backdrop-blur-xl max-w-[45rem] mx-auto shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
                    <ReactSelectComponent 
                        placeholder="Select Start Race"
                        options={raceDetails ? raceDetails.map(race => ({value: race.round, label: race.raceName})) : ''}
                        onChange={handleStartChange}
                        className="w-full md:w-[24rem]"
                    />
                    <ReactSelectComponent 
                        placeholder="Select End Race"
                        options={raceDetails ? raceDetails.map(race => ({value: race.round, label: race.raceName})).filter(x => (parseInt(x.value) > parseInt(start))) : ''}
                        onChange={(selectedOption) => setEnd(selectedOption.value)}
                        className="w-full md:w-[24rem]"
                    />
                    <Button 
                        onClick={handleReset} 
                        size='sm'
                        className="shrink-0"
                    >
                        Reset
                    </Button>
                </div>
            </div>
        </div>
        {(race1name && race2name) && (
            <div className="flex justify-center gap-16 px-8 items-center">
                <div className="text-right w-1/2">
                    <div className="text-neutral-400 text-sm leading-[1]">Round {start}</div>
                    <div className="font-display">{race1name.replace(/Grand Prix/g, "GP")}</div>
                </div>
                <div>-</div>
                <div className="w-1/2">
                    <div className="text-neutral-400 text-sm leading-[1]">Round {end}</div>
                    <div className="font-display">{race2name.replace(/Grand Prix/g, "GP")}</div>
                </div>
            </div>
        )} 
        </>
    );
};
