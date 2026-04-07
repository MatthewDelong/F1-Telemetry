import React, { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "../components";
import classNames from "classnames";

const ComparisonsSection = ({ layoutMobile }) => {
    const navigate = useNavigate();
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

    // Get scroll progress for smooth parallax effect
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"],
    });

    // Parallax Transformations
    const yHeading = useTransform(
        scrollYProgress,
        [0, 1],
        layoutMobile ? [-75, 0] : [-75, 50]
    ); // Heading moves slower
    const computerImages = useTransform(
        scrollYProgress,
        [0, 1],
        layoutMobile ? [-50, 50] : [-150, 100]
    ); // Images move more
    const yDecorationBG = useTransform(scrollYProgress, [0, 1], [0, 0]); // Decorations move the most
    const yDecoration1 = useTransform(scrollYProgress, [0, 1], [-150, -75]); // Mobile
    const yDecoration2 = useTransform(scrollYProgress, [0, 1], [-100, 0]); // Decorations move the most
    const yDecoration3 = useTransform(scrollYProgress, [0, 1], [-50, 25]); // Decorations move the most

    const links = (customClassName) => {
        return (
            <div className={classNames(customClassName, "z-10 w-full")}>
                <Button
                    as="button"
                    onClick={() => {
                        navigate("/driver-comparison")
                    }}
                    size="sm"
                    className="shadow-xl max-sm:w-full"
                >
                    Driver Comparison
                </Button>
                <Button
                    as="button"
                    onClick={() => {
                        navigate("/teammates-comparison")
                    }}
                    size="sm"
                    className="shadow-xl max-sm:w-full"
                >
                    Teammate Comparison
                </Button>
            </div>
        );
    };

    return (
        <section
            ref={sectionRef}
            className="min-h-screen snap-start flex flex-col lg:flex-row items-center justify-center bg-neutral-950 relative overflow-hidden pt-[80px] lg:pt-[64px] px-16 lg:px-0 gap-32 lg:gap-0"
        >
            {/* Heading Animates in & Scrolls */}
            <motion.div
                className="max-w-[1200px] w-full lg:w-1/2 mx-auto text-center lg:text-left px-4 lg:px-64 z-10"
                initial={{ opacity: 0, x: -50 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <h2 className="heading-3 mb-16">
                    Driver and Teammate Comparisons
                </h2>
                <p className="text-sm lg:text-base">
                    Compare teammates directly, evaluating their performances in
                    the same car during specific seasons or extend your analysis
                    beyond teammates to include any driver from any team
                    throughout F1 history.
                </p>
                {/* Mobile Links - positioned under text for better flow */}
                {links("flex flex-col gap-8 mt-32 sm:hidden")}
            </motion.div>

            {/* Comparison Grid/Images */}
            <motion.div
                className="comparison-container relative w-full lg:w-1/2 flex items-center justify-center lg:justify-start"
                ref={sectionRef}
            >
                <div className="comparison-containers--computer z-10 relative py-8 lg:py-32 w-full max-w-[600px] lg:max-w-none px-8 lg:px-24">
                    <motion.div
                        className="flex flex-row items-center justify-center lg:justify-start relative"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={isInView ? { opacity: 1, scale: layoutMobile ? 1.1 : 1 } : {}}
                        transition={{ duration: 1, ease: "easeOut" }}
                        style={{ y: computerImages }}
                    >
                        {/* Left - Driver Comparison */}
                        <div className="w-[55%] shrink-0">
                            <img
                                className="w-full h-auto"
                                src="/images/comparisonDrivers.png"
                                alt="Drivers"
                            />
                        </div>

                        {/* Right - Teammate Comparison */}
                        <div className="w-[65%] shrink-0 relative ml-[-40px] sm:ml-[-100px] lg:ml-[-150px]">
                            <img
                                className="w-full"
                                src="/images/comparisonTeammates.png"
                                alt="Teammates"
                            />
                        </div>
                        {/* Desktop Links */}
                        {links("absolute top-1/2 -translate-y-1/2 flex flex-row justify-between items-center gap-8 max-sm:hidden")}
                    </motion.div>
                </div>

                {/* Background Decorations - Move on Scroll */}
                <motion.img
                    className="w-full absolute top-1/4 z-0"
                    src={`${
                        "/images/arrowsBGthin.png"
                    }`}
                    alt=""
                    initial={{ opacity: 0, scale: 1.5 }}
                    animate={isInView ? { opacity: 1, scale: 1.1 } : {}}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    style={{ y: yDecorationBG }}
                />
                <motion.img
                    className="w-[300px] absolute top-1/4 left-32 z-0 sm:hidden"
                    src={`${
                        "/images/plusPatterns.png"
                    }`}
                    alt=""
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                    style={{ y: yDecoration1 }}
                />
                <motion.img
                    className="w-[300px] absolute top-1/4 right-32 z-0 max-sm:hidden"
                    src={`${
                        "/images/plusPatterns.png"
                    }`}
                    alt=""
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                    style={{ y: yDecoration2 }}
                />
                <motion.img
                    className="w-[300px] absolute top-1/4 left-32 z-0 max-sm:hidden"
                    src={`${
                        "/images/plusPatterns.png"
                    }`}
                    alt=""
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                    style={{ y: yDecoration3 }}
                />
            </motion.div>
        </section>
    );
};

export default ComparisonsSection;

