import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Popover } from "flowbite-react";
import { useInView } from "framer-motion";

export const DriverCard = (props) => {
    const { championshipLevel, className, driver, driverColor, stint, fastestLap, status, startPosition, endPosition, isActive, layoutSmall, time, year, hasHover, index, mobileSmall, isRace, darkBG} = props;

    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    const getTireCompound = (driverCode, lap) => {
        const driverStint = stint?.find(item => item.acronym === driverCode);
        if (driverStint && driverStint.tires) {
            for (const tire of driverStint.tires){
                if(lap <= tire.lap_end){
                    return tire.compound;
                }
            }
        }
        return '?';
    } 

    const positionMovement = () => {
        if ( startPosition !== endPosition ) {
            return (
                <Popover
                    aria-labelledby="default-popover"
                    className="bg-glow border-neutral-400 border-[.1rem] p-4 bg-neutral-950 rounded-md z-[10]"
                    trigger="hover"
                    placement="top"
                    // open={true}
                    arrow={false}
                    content={
                        <div className="p-4">
                            <div>
                                <span className="text-sm mr-4">Started</span>
                                <span className="font-display">P{startPosition}</span></div>
                            <div>
                                <span className="text-sm mr-4">Ended</span>
                                <span className="font-display">P{endPosition}</span>
                            </div>
                        </div>
                    }
                >
                    <FontAwesomeIcon 
                        icon={startPosition > endPosition ? "circle-up" : "circle-down"} 
                        className={classNames("fa-xs", startPosition > endPosition ? "text-emerald-500" : "text-rose-500")} 
                    />
                </Popover>
            )
        }
        return
    }

    const driverImage = (
        <img 
            alt={driver.code} 
            src={championshipLevel ? 
                `${"/images/" + year + "/" + championshipLevel + "/" + driver.code + ".png"}`
                : `${"/images/" + year + "/drivers/" + driver.code + ".png"}`
            }
            loading="lazy"
            onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/images/wildcardicon.png";
            }}
            width={championshipLevel === 'F2' ? 54 : 72} 
            height={championshipLevel === 'F2' ? 54 : 72} 
            ref={ref}
            className={classNames('absolute block inset-x-0 bottom-[0px]', championshipLevel === 'F2' ? 'left-[46px] sm:left-46 rounded-r-md' : 'left-[28px] sm:left-46')}
            style={{
                opacity: isInView ? 1 : 0,
                transition: `all 1s cubic-bezier(0.17, 0.55, 0.55, 1) .${index}s`
            }}
        />
    )

    const isFastestLapDriver = String(fastestLap?.rank) === "1";
    const fastestLapTime =
        fastestLap?.Time?.time ||
        fastestLap?.time?.time ||
        fastestLap?.Time ||
        fastestLap?.time ||
        "";
    const fastestLapAverageSpeed =
        fastestLap?.AverageSpeed || fastestLap?.averageSpeed;
    
    return (
        <div 
            className={classNames(
                className, 
                'driver-card flex items-center bg-glow relative',
                { 
                    'driver-card--canvas': mobileSmall,
                    'hidden': status === "cancelled",
                    'bg-neutral-800' : darkBG,
                },
                isActive ? "bg-glow--active" : hasHover ? "bg-glow--hover" : "",
                mobileSmall ? "rounded-sm mb-4" : "rounded-md"
            )}
            style={{borderColor: isActive && `#${driverColor}`}}
        >
            <div className={classNames("flex items-center justify-between w-full", { "max-md:hidden": mobileSmall, "hidden": !layoutSmall})}>
                <div className="flex items-center font-display leading-none text-sm">
                    <p className={classNames("w-48 bg-neutral-600 py-2 text-center rounded-l-md")}>P{isRace ? endPosition : index + 1}</p>
                    <span className="pl-16 mr-4">{driver.code}</span>
                </div>
                <div className="flex items-center gap-12 pr-16 justify-end grow">
                    <p className="text-xs text-right grow">{time}</p>
                    <div className="flex flex-col items-center gap-2 w-32 flex-shrink-0">
                        {isFastestLapDriver && (
                            <Popover
                                aria-labelledby="default-popover"
                                className="bg-glow border-plum-500 border-[.1rem] rounded-md p-4 bg-neutral-950 z-[10]"
                                trigger="hover"
                                placement="top"
                                arrow={false}
                                content={
                                    <div className="p-4">
                                        <div className="bg-plum-500 text-center font-display rounded">
                                            {fastestLapTime}
                                        </div>
                                        <div className="flex align-start justify-around">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm">Lap</span>
                                                <span className="font-display">{fastestLap?.lap || "-"}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm">Tyre</span>
                                                <span className="font-display">{getTireCompound(driver.code, fastestLap?.lap).charAt(0)}</span>
                                            </div>
                                        </div>
                                        {fastestLapAverageSpeed && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm">Avg Speed</span>
                                                <div>
                                                    <span className="font-display">{fastestLapAverageSpeed?.speed}</span>
                                                    <span className="text-sm">{fastestLapAverageSpeed?.units}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                }
                            >
                                <span className="fa-layers fa-fw fa-xs">
                                    <FontAwesomeIcon icon="circle" className="text-white" transform="grow-2" />
                                    <FontAwesomeIcon icon="circle" className="text-plum-500" />
                                    <FontAwesomeIcon icon="clock" className="text-white" transform="shrink-4" />
                                </span>
                            </Popover>
                        )}
                        {isRace && positionMovement()}
                    </div>
                </div>
            </div>
            <div className={classNames('flex item-center w-full', { "max-md:hidden": mobileSmall, "hidden": layoutSmall})}>
                <p className={classNames("driver-card-position text-2xl font-display px-8 py-4 bg-neutral-700 rounded-l-md flex items-center")}>
                    P{isRace ? endPosition : index + 1}
                </p>
                {driverImage}
                <div className="grow py-4 px-12 text-right">
                    <span className="heading-4 mb-12 pl-60">{driver.code}</span>
                    <div className="divider-glow w-full" /> 
                    <div className="flex items-center justify-end gap-12 -mt-8">
                        <p className={classNames("text-sm text-right grow")}>{time}</p>
                        <div className="flex flex-col items-center gap-2 w-32 flex-shrink-0">
                            {isFastestLapDriver && (
                                <Popover
                                    aria-labelledby="default-popover"
                                    className="bg-glow border-plum-500 border-[.1rem] rounded-md p-4 bg-neutral-950 z-[10]"
                                    trigger="hover"
                                    placement="top"
                                    arrow={false}
                                    content={
                                        <div className="p-4">
                                            <div className="bg-plum-500 text-center font-display rounded">
                                                {fastestLapTime}
                                            </div>
                                            <div className="flex align-start justify-around">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm">Lap</span>
                                                    <span className="font-display">{fastestLap?.lap || "-"}</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm">Tyre</span>
                                                    <span className="font-display">{getTireCompound(driver.code, fastestLap?.lap).charAt(0)}</span>
                                                </div>
                                            </div>
                                            {fastestLapAverageSpeed && (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm">Avg Speed</span>
                                                    <div>
                                                        <span className="font-display">{fastestLapAverageSpeed?.speed}</span>
                                                        <span className="text-sm">{fastestLapAverageSpeed?.units}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    }
                                >
                                    <span className="fa-layers fa-fw fa-xs">
                                        <FontAwesomeIcon icon="circle" className="text-white" transform="grow-2" />
                                        <FontAwesomeIcon icon="circle" className="text-plum-500" />
                                        <FontAwesomeIcon icon="clock" className="text-white" transform="shrink-4" />
                                    </span>
                                </Popover>
                            )}
                            {isRace && positionMovement()}
                        </div>
                    </div>
                </div>
            </div>
            {mobileSmall && (
                <div className="md:hidden">
                    <div className="flex items-center text-xs font-display">
                        <p className="w-24 bg-neutral-600 py-1 text-center rounded-tl-[.4rem]">P{isRace ? endPosition : index + 1}</p>
                        <p className="pl-8 pr-8">{driver.code}</p>
                    </div>
                    <div>
                        <p className="text-xs pl-8">{time}</p>
                    </div>
                </div>
            )}
                    </div>
    );
};

DriverCard.propTypes = {
    isActive: PropTypes.bool,
    index: PropTypes.number,
    hasHover: PropTypes.bool,
    className: PropTypes.string,
    carNumber: PropTypes.string, // Max has a different permanentNumber than his actual car number
    driverColor: PropTypes.string,
    driver: PropTypes.shape({
        driverId: PropTypes.string,
        permanentNumber: PropTypes.string,
        code: PropTypes.string,
        url: PropTypes.string,
        givenName: PropTypes.string,
        familyName: PropTypes.string,
        dateOfBirth: PropTypes.string,
        nationality: PropTypes.string,
    }),
    fastestLap: PropTypes.shape({
        rank: PropTypes.string,
        lap: PropTypes.string,
        time: PropTypes.shape({
            time: PropTypes.string,
        }),
        averageSpeed: PropTypes.shape({
            units: PropTypes.string,
            speed: PropTypes.string,
        }),
    }),
    grid: PropTypes.string,
    startPosition: PropTypes.number,
    endPosition: PropTypes.number,
    status: PropTypes.string,
    time: PropTypes.string,
    year: PropTypes.number,
    layoutSmall: PropTypes.bool,
    mobileSmall: PropTypes.bool,
    championshipLevel: PropTypes.string,
};

