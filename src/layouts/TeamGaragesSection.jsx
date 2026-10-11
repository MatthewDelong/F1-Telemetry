import React, { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button, LumaKeyVideo } from "../components";

const TeamGaragesSection = ({ layoutMobile, container }) => {
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
      className="min-h-screen h-screen snap-start flex items-center justify-center px-4 md:px-16 bg-neutral-950 relative pt-[64px] z-0 overflow-x-hidden"
    >
      {/* Centered Horizontal Glassmorphic Feature Image with equal space top and bottom */}
      <div className="absolute top-[64px] bottom-0 left-0 right-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden px-4 md:px-8">
        <motion.div
          className="relative w-full max-w-[1360px] h-[86%] max-h-[760px] rounded-[2.5rem] border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-neutral-950/85 via-transparent to-neutral-950/50 pointer-events-none" />
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-neutral-950/60 via-transparent to-neutral-950/60 pointer-events-none" />
          <img
            src="/images/features-3.png"
            alt="2026 Team Garages"
            className="w-full h-full object-cover object-center opacity-35"
          />
        </motion.div>
      </div>

      <div className="max-w-[1200px] w-full mx-auto px-16 relative z-10">
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

export default TeamGaragesSection;
