import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import RaceCalendar from "../components/RaceCalendar";
import RaceCalendar2027 from "../components/RaceCalendar2027";
import ProceduralTrackBackground from "../components/ProceduralTrackBackground";

const CIRCUIT_NAMES = {
  "f1.circuits.albert_park": "Albert Park Grand Prix Circuit",
  "f1.circuits.shanghai": "Shanghai International Circuit",
  "f1.circuits.suzuka": "Suzuka Circuit",
  "f1.circuits.miami": "Miami International Autodrome",
  "f1.circuits.gilles_villeneuve": "Circuit Gilles Villeneuve",
  "f1.circuits.monte_carlo": "Circuit de Monaco",
  "f1.circuits.catalunya": "Circuit de Barcelona-Catalunya",
  "f1.circuits.red_bull_ring": "Red Bull Ring",
  "f1.circuits.silverstone": "Silverstone Circuit",
  "f1.circuits.spa": "Circuit de Spa-Francorchamps",
  "f1.circuits.hungaroring": "Hungaroring",
  "f1.circuits.zandvoort": "Circuit Park Zandvoort",
  "f1.circuits.monza": "Autodromo Nazionale di Monza",
  "f1.circuits.madrid": "Madring Circuit",
  "f1.circuits.baku": "Baku City Circuit",
  "f1.circuits.sepang": "Sepang International Circuit",
  "f1.circuits.marina_bay": "Marina Bay Street Circuit",
  "f1.circuits.cota": "Circuit of the Americas",
  "f1.circuits.hermanos_rodriguez": "Autódromo Hermanos Rodríguez",
  "f1.circuits.interlagos": "Autódromo José Carlos Pace",
  "f1.circuits.vegas_strip": "Las Vegas Strip Street Circuit",
  "f1.circuits.losail": "Lusail International Circuit",
  "f1.circuits.yas_marina": "Yas Marina Circuit",
};

const DatesSection = () => {
  const [selectedTrack2026, setSelectedTrack2026] = useState(null);
  const [selectedTrack2027, setSelectedTrack2027] = useState(null);
  const sectionRef = useRef(null);
  const section2027Ref = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const is2027InView = useInView(section2027Ref, {
    once: true,
    margin: "-100px",
  });

  return (
    <>
      {/* 2026 Calendar — own snap section */}
      <section
        ref={sectionRef}
        className="min-h-screen snap-start scroll-mt-24 flex flex-col items-center max-md:justify-start md:justify-center px-4 md:px-16 bg-neutral-950 relative max-md:pt-[120px] max-md:pb-[80px] md:py-32"
      >
        <div className="max-w-[1400px] w-full mx-auto text-center z-10">
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
            className="relative w-full max-w-7xl mx-auto rounded-2xl overflow-hidden bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)]"
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="w-full h-full absolute inset-0 opacity-40">
                  <ProceduralTrackBackground
                    trackKey={
                      selectedTrack2026.circuitKey
                        ? selectedTrack2026.circuitKey.split(".").pop()
                        : selectedTrack2026.country?.toLowerCase()
                    }
                  />
                </div>

                <div className="absolute z-20 flex flex-col items-center w-full max-w-2xl px-4 pointer-events-none">
                  <div className="flex items-center justify-center gap-6 mb-6">
                    <img
                      src={`/images/flags/${selectedTrack2026.flag}`}
                      alt={selectedTrack2026.country}
                      className="w-20 h-auto rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/10"
                    />
                    <div className="text-4xl md:text-5xl font-black italic tracking-widest text-white uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,1)]">
                      {selectedTrack2026.displayName}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-neutral-300 font-bold text-lg md:text-xl uppercase tracking-widest bg-black/60 px-8 py-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-3">
                      <span className="text-[#e10600]">Date:</span>{" "}
                      {selectedTrack2026.dateRange || selectedTrack2026.date}
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-600"></div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#e10600]">Circuit:</span>{" "}
                      {CIRCUIT_NAMES[selectedTrack2026.circuitKey] || selectedTrack2026.city}
                    </div>
                    {selectedTrack2026.isSprint && (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-600"></div>
                        <div className="text-purple-400 font-black">
                          Sprint Weekend
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 z-20">
                  <Link
                    to={`/race/${selectedTrack2026.circuitKey ? selectedTrack2026.circuitKey.split(".").pop() : selectedTrack2026.city.split(",")[0].toLowerCase().replace(/ /g, "_")}`}
                    className="group flex items-center gap-3 px-10 py-5 bg-[#e10600] hover:bg-white text-white hover:text-[#e10600] font-black text-lg uppercase tracking-widest rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(225,6,0,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] pointer-events-auto"
                  >
                    <span>Circuit Details</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 transform group-hover:translate-x-1 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
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
        <div className="max-w-[1600px] w-full mx-auto text-center z-10">
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
            className="relative w-full max-w-7xl mx-auto rounded-2xl overflow-hidden bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)]"
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="w-full h-full absolute inset-0 opacity-40">
                  <ProceduralTrackBackground
                    trackKey={
                      selectedTrack2027.circuitKey
                        ? selectedTrack2027.circuitKey.split(".").pop()
                        : selectedTrack2027.city
                            .split(",")[0]
                            .toLowerCase()
                            .replace(/ /g, "_")
                    }
                  />
                </div>

                <div className="absolute z-20 flex flex-col items-center w-full max-w-2xl px-4 pointer-events-none">
                  <div className="flex items-center justify-center gap-6 mb-6">
                    <img
                      src={`/images/flags/${selectedTrack2027.flag}`}
                      alt={selectedTrack2027.country}
                      className="w-20 h-auto rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/10"
                    />
                    <div className="text-4xl md:text-5xl font-black italic tracking-widest text-white uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,1)]">
                      {selectedTrack2027.displayName}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-neutral-300 font-bold text-lg md:text-xl uppercase tracking-widest bg-black/60 px-8 py-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-3">
                      <span className="text-[#e10600]">Date:</span>{" "}
                      {selectedTrack2027.dateRange || selectedTrack2027.date}
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-600"></div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#e10600]">Circuit:</span>{" "}
                      {CIRCUIT_NAMES[selectedTrack2027.circuitKey] || selectedTrack2027.city}
                    </div>
                    {selectedTrack2027.isSprint && (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-600"></div>
                        <div className="text-purple-400 font-black">
                          Sprint Weekend
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 z-20">
                  <Link
                    to={`/race/${selectedTrack2027.circuitKey ? selectedTrack2027.circuitKey.split(".").pop() : selectedTrack2027.city.split(",")[0].toLowerCase().replace(/ /g, "_")}`}
                    className="group flex items-center gap-3 px-10 py-5 bg-[#e10600] hover:bg-white text-white hover:text-[#e10600] font-black text-lg uppercase tracking-widest rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(225,6,0,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] pointer-events-auto"
                  >
                    <span>Circuit Details</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 transform group-hover:translate-x-1 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
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
