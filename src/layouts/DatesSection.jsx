import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import RaceCalendar from "../components/RaceCalendar";
import RaceCalendar2027 from "../components/RaceCalendar2027";
import ProceduralTrackBackground from "../components/ProceduralTrackBackground";

const DatesSection = () => {
  const [selectedTrack2026, setSelectedTrack2026] = useState(null);
  const [selectedTrack2027, setSelectedTrack2027] = useState(null);
  const sectionRef = useRef(null);
  const section2027Ref = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const is2027InView = useInView(section2027Ref, { once: true, margin: "-100px" });

  return (
    <>
      {/* 2026 Calendar — own snap section */}
      <section
        ref={sectionRef}
        className="min-h-screen snap-start scroll-mt-24 flex flex-col items-center max-md:justify-start md:justify-center px-4 md:px-16 bg-neutral-950 relative max-md:pt-[120px] max-md:pb-[80px] md:py-32"
      >
        <div className="max-w-[1200px] w-full mx-auto text-center z-10">
          <motion.h2
            className="heading-2 uppercase mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            2026 F1 Race Calendar
          </motion.h2>
          <motion.p
            className="text-neutral-400 text-2xl mb-48 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Plan your season with the full 2026 F1 Race Calendar
          </motion.p>

          <motion.div
            className="relative w-full max-w-5xl mx-auto rounded-2xl overflow-hidden bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {selectedTrack2026 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 bg-neutral-950/95 backdrop-blur-lg flex flex-col items-center justify-center"
              >
                <button 
                  onClick={() => setSelectedTrack2026(null)}
                  className="absolute top-8 right-8 text-white bg-[#e10600] hover:bg-red-700 rounded-full w-16 h-16 flex items-center justify-center transition-transform hover:scale-110 z-50 shadow-lg cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="w-full h-full absolute inset-0">
                  <ProceduralTrackBackground trackKey={selectedTrack2026} />
                </div>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 z-20">
                  <div className="text-2xl md:text-4xl font-black italic tracking-widest text-[#e10600] uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,1)] pointer-events-none">
                    {selectedTrack2026.replace(/_/g, ' ')}
                  </div>
                  <Link
                    to={`/race/${selectedTrack2026.toLowerCase()}`}
                    className="group flex items-center gap-3 px-8 py-4 bg-[#e10600] hover:bg-white text-white hover:text-[#e10600] font-black text-sm uppercase tracking-widest rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(225,6,0,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)]"
                  >
                    <span>Circuit Details</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </motion.div>
            )}
            <RaceCalendar onRaceClick={setSelectedTrack2026} />
          </motion.div>
        </div>

        {/* Subtle background decoration */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0">
          <img
            className="w-[300px] absolute -left-[100px] top-64 transition-opacity duration-500"
            style={{ opacity: selectedTrack2026 ? 0 : 1 }}
            src="/images/plusPatterns.png"
            alt=""
          />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(255,0,0,0.05),_transparent_70%)]" />
        </div>
      </section>

      {/* 2027 Calendar — own snap section */}
      <section
        ref={section2027Ref}
        className="min-h-screen snap-start scroll-mt-24 flex flex-col items-center max-md:justify-start md:justify-center px-4 md:px-16 bg-neutral-950 relative max-md:pt-[120px] max-md:pb-[80px] md:py-32"
      >
        <div className="max-w-[1200px] w-full mx-auto text-center z-10">
          <motion.h2
            className="heading-2 uppercase mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={is2027InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            2027 F1 Race Calendar
          </motion.h2>
          <motion.p
            className="text-neutral-400 text-2xl mb-48 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={is2027InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Look ahead — the provisional 2027 F1 Race Calendar
          </motion.p>

          <motion.div
            className="relative w-full max-w-5xl mx-auto rounded-2xl overflow-hidden bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={is2027InView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {selectedTrack2027 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 bg-neutral-950/95 backdrop-blur-lg flex flex-col items-center justify-center"
              >
                <button 
                  onClick={() => setSelectedTrack2027(null)}
                  className="absolute top-8 right-8 text-white bg-[#e10600] hover:bg-red-700 rounded-full w-16 h-16 flex items-center justify-center transition-transform hover:scale-110 z-50 shadow-lg cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="w-full h-full absolute inset-0">
                  <ProceduralTrackBackground trackKey={selectedTrack2027} />
                </div>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 z-20">
                  <div className="text-2xl md:text-4xl font-black italic tracking-widest text-[#e10600] uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,1)] pointer-events-none">
                    {selectedTrack2027.replace(/_/g, ' ')}
                  </div>
                  <Link
                    to={`/race/${selectedTrack2027.toLowerCase()}`}
                    className="group flex items-center gap-3 px-8 py-4 bg-[#e10600] hover:bg-white text-white hover:text-[#e10600] font-black text-sm uppercase tracking-widest rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(225,6,0,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)]"
                  >
                    <span>Circuit Details</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </motion.div>
            )}
            <RaceCalendar2027 onRaceClick={setSelectedTrack2027} />
          </motion.div>
        </div>

        {/* Subtle background decoration */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(255,0,0,0.05),_transparent_70%)]" />
        </div>
      </section>
    </>
  );
};

export default DatesSection;
