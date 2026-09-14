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
          bring the excitement of F1 right into your own space
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
                Place and scale your favorite F1 car model right in your
                environment. Walk around and inspect every intricate detail as if
                you were in the paddock!
                <br />
                <br />
                Not on a phone? No problem! You can also view the car in 360
                degrees on your computer and learn about your favorite teams
                history.
              </p>
              <Button
                as="button"
                onClick={() => {
                  navigate("/ar-viewer");
                  if (typeof window.trackButtonClick === "function") {
                    window.trackButtonClick(
                      `Home/Click/Section/AR Viewer - /ar-viewer`,
                    );
                  }
                }}
                size="sm"
                className="shadow-xl w-fit"
              >
                {layoutMobile
                  ? "Full AR Experience"
                  : "360 Team Livery Viewer and History"}
              </Button>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mt-8 border-t border-white/10 pt-12">
                <div className="flex-1">
                  <p className="text-base text-neutral-400 mb-2">
                    Scan QR code to go to the full AR Experience on your mobile device
                  </p>
                  <p className="text-sm text-neutral-500 font-mono">
                    Don't forget to tag @F1-Telemetry_uk #F1-Telemetry_uk
                  </p>
                </div>
                <img
                  className="w-[8rem] sm:w-[10rem] rounded-xl bg-white p-2"
                  src={`${"/images/arQr.png"}`}
                  alt="QR Code"
                />
              </div>
            </div>
            <img
              className="w-[300px] absolute left-full top-32 z-[1] pointer-events-none opacity-50"
              src={`${"/images/plusPatterns.png"}`}
              alt=""
            />
          </motion.div>
          <motion.div
            className="w-2/3 sm:w-1/4 ar-experience-section__phone z-10"
            initial={{ opacity: 0, scale: 1.2 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <LumaKeyVideo
              src="/Media/PngSequencePhone.mp4"
              poster="/images/ArPhoneImage.png"
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ArSection;
