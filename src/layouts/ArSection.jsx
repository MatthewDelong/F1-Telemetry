import React, { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button, LumaKeyVideo } from "../components";

const ArSection = ({ layoutMobile, container }) => {
  const navigate = useNavigate();
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
    container: container,
  });

  const yTextContent = useTransform(
    scrollYProgress,
    [0, 1],
    layoutMobile ? [0, 0] : [100, -100],
  );

  return (
    <section
      ref={sectionRef}
      className="min-h-screen snap-start block md:flex md:items-center md:justify-center px-16 bg-neutral-950 relative max-md:pt-[100px] md:pt-32 z-0 overflow-x-hidden"
    >
      <div className="max-w-[1200px] w-full mx-auto px-16">
        <h2 className="heading-2 text-center mb-16 uppercase">
          Explore the 2026 Team Garages
        </h2>
        <div className="flex max-sm:flex-col-reverse sm:flex-row items-center mx-auto relative">
          <motion.div
            className="w-full sm:w-3/4 flex flex-col max-sm:items-center gap-8 sm:gap-12 relative z-10 bg-black/40 backdrop-blur-md border border-white/10 p-16 sm:p-24 sm:mr-[-40px] rounded-[2.4rem] shadow-[0_0_40px_rgba(255,255,255,0.05)] max-sm:text-center text-left"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ y: yTextContent }}
          >
            <div className="absolute inset-0 z-0 opacity-10 rounded-[2.4rem] pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.5) 0%, rgba(0,0,0,0) 70%)` }} />
            <div className="relative z-10 flex flex-col gap-8 sm:gap-12">
              <p className="text-neutral-300 text-lg">
                Discover the latest 2026 driver line-ups and team principals.
                <br />
                <br />
                Dive into the team garages to learn about the history of the 
                constructors and see who is leading them into the new era of Formula 1!
              </p>
              <Button
                as="button"
                onClick={() => {
                  navigate("/team-garages");
                  if (typeof window.trackButtonClick === "function") {
                    window.trackButtonClick(
                      `Home/Click/Section/Team Garages - /team-garages`,
                    );
                  }
                }}
                size="sm"
                className="shadow-xl w-fit"
              >
                View 2026 Team Garages
              </Button>
            </div>
            <img
              className="w-[300px] absolute left-full top-32 z-[1] pointer-events-none opacity-50"
              src={`${"/images/plusPatterns.png"}`}
              alt=""
            />
          </motion.div>
          <motion.div
            className="w-2/3 sm:w-1/2 z-10"
            initial={{ opacity: 0, scale: 1.2 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <img
              src="/images/2026/cars/ferrari.png"
              alt="2026 Team Garages"
              className="w-full h-auto max-h-[70vh] object-contain drop-shadow-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ArSection;
