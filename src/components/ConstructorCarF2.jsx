import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useInView } from "framer-motion";

import './ConstructorCar.scss';

export const ConstructorCarF2 = (props) => {
    const { className, points, image, name, year, drivers, index} = props;
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    const driverImage = (driver) => {
        return (
            <div className="-mt-40 z-[1] relative">
                <img 
                    alt="" 
                    className=""
                    src={`${"/images/" + year + "/F2/" + driver + ".png"}`}
                    width={90} 
                    style={{
                        opacity: isInView ? 1 : 0,
                        transition: "all 2s cubic-bezier(0.17, 0.55, 0.55, 1) .3s"
                    }}
                />
                <img 
                    alt="" 
                    className="z-10 absolute drop-shadow-[0_0_14px_rgba(0,0,0,0.75)]"
                    src={`${"/images/" + year + "/F2/carSideView/" + image + ".png"}`}
                    width={image === 'campos' ? 165 : 180} 
                    style={{
                        transform: isInView ? "none" : "translateX(25px) translateY(-15px)",
                        opacity: isInView ? 1 : 0,
                        transition: "all 1s cubic-bezier(0.17, 0.55, 0.55, 1) .2s",
                        bottom: image === 'campos' ? "-1.4rem" : "-2rem",
                        left: image === 'campos' ? "2.8rem" : "2.5rem",
                        maxWidth: "none"
                    }}
                />
                <div className='absolute bottom-[-2.8rem] left-[4rem] gradient-text-light text-xl'>{driver}</div>
            </div>
        )
    };

    return (
        <div 
            className={classNames(
                className, 
                'constructor-card mt-32'
            )}
            ref={ref}
        >
            <div className="flex flex-col justify-between pb-40">
                <div className="flex flex-col items-center justify-center gap-2 mb-20 mt-8 w-3/4 m-auto leading-none">
                    <div className="flex items-end mb-4">
                        <div className="h-1 w-32 border-b-[1px] border-solid border-neutral-500" />
                        <div className="font-display text-24 leading-none -mb-4 mx-8 text-neutral-400">
                            {index + 1}
                        </div>
                        <div className="h-1 w-32 border-b-[1px] border-solid border-neutral-500" />
                    </div>
                    <p className="uppercase text-20 tracking-sm gradient-text-light font-light mt-4 mb-2">{name}</p>
                    <span className="font-display text-24 gradient-text-light">{points}</span>
                </div>

                <div className="flex justify-between items-end relative w-[65%] m-auto right-[3rem]">
                    {drivers[0] && driverImage(drivers[0])}
                    {drivers[1] && driverImage(drivers[1])}
                </div>
            </div>
            <div className="constructor-stand bg-glow h-16 m-auto -mt-32" />
            <div className="divider-glow-dark w-full" />
        </div>
    );
};

ConstructorCarF2.propTypes = {
    className: PropTypes.string,
    points: PropTypes.string,
    name: PropTypes.string,
    year: PropTypes.number,
    drivers: PropTypes.array,
    index: PropTypes.number,
};
