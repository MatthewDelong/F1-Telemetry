import React, { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "../components";
import classNames from "classnames";

const ComparisonsSection = ({ layoutMobile, container }) => {
  const navigate = useNavigate();
  const sectionRef = useRef(null);

  // Get scroll progress for smooth parallax effect
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
    container: container,
  });

  // Parallax Transformations
  const yHeading = useTransform(
    scrollYProgress,
    [0, 1],
    layoutMobile ? [-75, 0] : [-75, 50],
  ); // Heading moves slower
  const computerImages = useTransform(
    scrollYProgress,
    [0, 1],
    layoutMobile ? [-50, 50] : [-75, 50],
  ); // Images move more
  const yDecorationBG = useTransform(scrollYProgress, [0, 1], [0, 0]); // Decorations move the most
  const yDecoration1 = useTransform(scrollYProgress, [0, 1], [-150, -75]); // Mobile
  const yDecoration2 = useTransform(scrollYProgress, [0, 1], [-100, 0]); // Decorations move the most
  const yDecoration3 = useTransform(scrollYProgress, [0, 1], [-50, 25]); // Decorations move the most


  return (
    <section
      ref={sectionRef}
      className="min-h-screen block md:flex md:flex-col md:justify-center px-4 md:px-16 bg-gradient-to-b from-neutral-950/30 to-neutral-950/5 relative snap-start max-md:pt-[100px] md:pt-32 pb-16 z-0 overflow-hidden"
    >
      <div className="divider-glow-dark absolute top-0 left-0 w-full" />
      {/* Heading Animates in & Scrolls */}
      <motion.div
        className="max-w-3xl mx-auto text-center bg-black/40 backdrop-blur-md border border-white/10 p-10 md:p-16 rounded-[2.4rem] shadow-[0_0_40px_rgba(255,255,255,0.05)] relative z-20 mt-8 md:mt-16"
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h2 className="heading-3 mb-8 gradient-text-white drop-shadow-xl text-3xl md:text-4xl leading-tight py-2">
          Driver and Teammate Comparisons
        </h2>
        <p className="text-neutral-300 text-sm md:text-base">
          Compare teammates directly, evaluating their performances in the same
          car during specific seasons or extend your analysis beyond teammates
          to include any driver from any team throughout F1 history.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8">
          <Button
            as="button"
            onClick={() => {
              navigate("/driver-comparison");
              if (typeof window.trackButtonClick === "function") {
                window.trackButtonClick(`Home/Click/Section/Comparisons - /driver-comparison`);
              }
            }}
            className="shadow-xl max-sm:w-full"
          >
            Driver Comparison
          </Button>
          <Button
            as="button"
            onClick={() => {
              navigate("/teammates-comparison");
              if (typeof window.trackButtonClick === "function") {
                window.trackButtonClick(`Home/Click/Section/Comparisons - /teammates-comparison`);
              }
            }}
            className="shadow-xl max-sm:w-full"
          >
            Teammate Comparison
          </Button>
        </div>
      </motion.div>

      {/* Comparison Grid */}
      <motion.div className="comparison-container relative mt-4 md:mt-8" ref={sectionRef}>
        <div className="comparison-containers--computer z-10 relative max-w-[500px] md:max-w-[700px] mx-auto">
          <motion.div
            className="flex flex-row items-center justify-center relative [perspective:2000px] max-md:scale-[0.8]"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: layoutMobile ? 0.85 : 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ y: computerImages }}
          >
            {/* Left - Driver Comparison */}
            <div 
              className="w-[60%] shrink-0 group relative z-10 hover:z-30 transition-all duration-700 cursor-pointer"
              onClick={() => {
                navigate("/driver-comparison");
                if (typeof window.trackButtonClick === "function") {
                  window.trackButtonClick(`Home/Click/Section/Comparisons - /driver-comparison (Image)`);
                }
              }}
            >
              <div className="relative transition-transform duration-700 ease-out origin-center [transform:rotateY(20deg)_rotateX(5deg)_rotateZ(-1deg)] group-hover:[transform:rotateY(0deg)_rotateX(0deg)_rotateZ(0deg)_scale(1.05)]">
                <div className="relative p-2 md:p-3 rounded-[1.6rem] bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] group-hover:border-blue-500/40 group-hover:shadow-[0_0_50px_rgba(59,130,246,0.3)] transition-all duration-700">
                  <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity duration-700 rounded-[1.6rem]" style={{ background: `radial-gradient(circle at 50% 0%, rgba(59,130,246,0.4) 0%, rgba(0,0,0,0) 70%)` }} />
                  <img
                    className="w-full h-auto rounded-[1.2rem] relative z-10 border border-black/40"
                    src="/images/comparisonDrivers.png"
                    alt="Drivers"
                  />
                </div>
              </div>
            </div>

            {/* Right - Teammate Comparison */}
            <div 
              className="w-[80%] shrink-0 relative ml-[-90px] sm:ml-[-100px] lg:ml-[-150px] group z-20 hover:z-30 transition-all duration-700 cursor-pointer"
              onClick={() => {
                navigate("/teammates-comparison");
                if (typeof window.trackButtonClick === "function") {
                  window.trackButtonClick(`Home/Click/Section/Comparisons - /teammates-comparison (Image)`);
                }
              }}
            >
              <div className="relative transition-transform duration-700 ease-out origin-center [transform:rotateY(-20deg)_rotateX(5deg)_rotateZ(1deg)] group-hover:[transform:rotateY(0deg)_rotateX(0deg)_rotateZ(0deg)_scale(1.05)]">
                <div className="relative p-2 md:p-3 rounded-[1.6rem] bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] group-hover:border-blue-500/40 group-hover:shadow-[0_0_50px_rgba(59,130,246,0.3)] transition-all duration-700">
                  <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity duration-700 rounded-[1.6rem]" style={{ background: `radial-gradient(circle at 50% 0%, rgba(59,130,246,0.4) 0%, rgba(0,0,0,0) 70%)` }} />
                  <img
                    className="w-full h-auto rounded-[1.2rem] relative z-10 border border-black/40"
                    src="/images/comparisonTeammates.png"
                    alt="Teammates"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Background Decorations - Move on Scroll */}
        <motion.img
          className="w-full absolute top-1/4 z-0"
          src="/images/arrowsBGthin.png"
          alt=""
          initial={{ opacity: 0, scale: 1.5 }}
          whileInView={{ opacity: 1, scale: 1.1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ y: yDecorationBG }}
        />
        <motion.img
          className="w-[300px] absolute top-1/4 left-32 z-0 sm:hidden"
          src="/images/plusPatterns.png"
          alt=""
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          style={{ y: yDecoration1 }}
        />
        <motion.img
          className="w-[300px] absolute top-1/4 right-32 z-0 max-sm:hidden"
          src="/images/plusPatterns.png"
          alt=""
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          style={{ y: yDecoration2 }}
        />
        <motion.img
          className="w-[300px] absolute top-1/4 left-32 z-0 max-sm:hidden"
          src="/images/plusPatterns.png"
          alt=""
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          style={{ y: yDecoration3 }}
        />
      </motion.div>
    </section>
  );
};

export default ComparisonsSection;
