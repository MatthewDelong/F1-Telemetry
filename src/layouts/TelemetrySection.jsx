import React, { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";

import { Button, LumaKeyVideo } from "../components";

import classNames from "classnames";

const TelemetrySection = ({ layoutMobile, onClick, container }) => {
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
    container: container,
  });

  const yTextContent = useTransform(
    scrollYProgress,
    [0, 1],
    layoutMobile ? [0, 0] : [0, -100],
  );

  return (
    <section className="telemetry-section min-h-screen snap-start block md:flex md:items-center md:justify-center bg-neutral-950 max-md:pt-[100px] md:pt-32 relative z-0 overflow-x-hidden">
      <div className="max-w-[1200px] w-full mx-auto px-16">
        <h2 className="heading-2 text-center mb-16 uppercase">
          Interactive Telemetry
        </h2>
        <div
          ref={sectionRef}
          className="flex flex-col-reverse md:flex-row-reverse md:items-start items-center mx-auto relative"
        >
          <motion.div
            className={classNames(
              "p-16 md:py-32 md:pr-32 md:pl-64 md:ml-[-100px] md:rounded-xlarge max-md:text-small max-md:text-center",
              "w-full md:w-1/3 flex flex-col max-md:items-center gap-8 relative z-10",
            )}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ y: yTextContent }}
          >
            <div className="w-full flex flex-col gap-12 mb-12">
              <div className="p-24 rounded-[1.6rem] bg-black/40 backdrop-blur-md border border-white/10 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300 relative group overflow-hidden text-left">
                <div className="absolute inset-0 z-0 opacity-10 transition-opacity duration-300 group-hover:opacity-20 rounded-[1.6rem]" style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.5) 0%, rgba(0,0,0,0) 70%)` }} />
                <div className="relative z-10">
                  <p className="uppercase font-semibold tracking-xs gradient-text-electric-blue mb-4 text-sm md:text-base">
                    Select a Driver
                  </p>
                  <p className="text-neutral-300">Monitor their race progress lap by lap.</p>
                </div>
              </div>
              
              <div className="p-24 rounded-[1.6rem] bg-black/40 backdrop-blur-md border border-white/10 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300 relative group overflow-hidden text-left">
                <div className="absolute inset-0 z-0 opacity-10 transition-opacity duration-300 group-hover:opacity-20 rounded-[1.6rem]" style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.5) 0%, rgba(0,0,0,0) 70%)` }} />
                <div className="relative z-10">
                  <p className="uppercase tracking-xs gradient-text-electric-blue mb-4 text-sm md:text-base">
                    Multiple Camera Views
                  </p>
                  <p className="text-neutral-300">Get closer to the action with various perspectives.</p>
                </div>
              </div>
              
              <div className="p-24 rounded-[1.6rem] bg-black/40 backdrop-blur-md border border-white/10 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300 relative group overflow-hidden text-left">
                <div className="absolute inset-0 z-0 opacity-10 transition-opacity duration-300 group-hover:opacity-20 rounded-[1.6rem]" style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.5) 0%, rgba(0,0,0,0) 70%)` }} />
                <div className="relative z-10">
                  <p className="uppercase tracking-xs gradient-text-electric-blue mb-4 text-sm md:text-base">
                    Detailed Telemetry Data
                  </p>
                  <p className="text-neutral-300">Analyze every aspect of driver performance.</p>
                </div>
              </div>
            </div>
            <div className="w-full flex justify-center">
              <Button
                as="button"
                onClick={onClick}
                size="sm"
                className="shadow-xl w-fit"
              >
                View Latest F1 Race
              </Button>
            </div>
          </motion.div>
          <motion.div
            className="w-full sm:w-2/3 ar-experience-section__phone z-10 md:ml-[-40px]"
            initial={{ opacity: 0, scale: 1.2 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <LumaKeyVideo
              src="/Media/PngSequenceCanvas.mp4"
              poster="/images/telemetryImage.png"
              className="w-full h-auto"
            />

            <div className="divider-glow-dark -mt-8" />
          </motion.div>
          <motion.img
            className="w-[300px] absolute -left-[100px] top-64 z-[1]"
            src={`${"/images/plusPatterns.png"}`}
            alt=""
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ y: yTextContent }}
          />
        </div>
      </div>
    </section>
  );
};

export default TelemetrySection;
