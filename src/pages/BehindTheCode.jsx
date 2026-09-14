import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '../components';

export function BehindTheCode() {
  return (
    <div className="global-container px-8 pb-64 pt-32">
      <div className="max-w-4xl mx-auto mt-32">
        <h1 className="heading-1 text-center mb-8 gradient-text-light uppercase tracking-widest font-display text-4xl sm:text-6xl">Behind the Code</h1>
        <p className="text-sm sm:text-lg text-neutral-400 text-center mb-32 font-display uppercase tracking-widest">
          A Solo Developer & AI Collaboration
        </p>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.4rem] p-12 sm:p-24 mb-16 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-white/10 transition-colors duration-500">
            <FontAwesomeIcon icon="code" size="8x" />
          </div>
          <h2 className="heading-3 mb-12 flex items-center gap-4 relative z-10">
            The Origin Story
          </h2>
          <p className="text-neutral-300 leading-relaxed text-lg sm:text-xl mb-6 relative z-10">
            The spark for F1 Telemetry ignited when I stumbled upon another project called F1nsight. It was a great concept, but seeing it abandoned—with no commits for over a month—made me realize there was a massive gap in the community that needed filling. 
          </p>
          <p className="text-neutral-300 leading-relaxed text-lg sm:text-xl relative z-10">
            I decided to pick up the mantle. The goal wasn't just to build another dashboard; I wanted fans to know more than what they just see on TV. I wanted to build a platform that provides real, granular insight into the sport we all love, making complex data accessible and beautiful.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.4rem] p-12 sm:p-24 mb-16 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-white/10 transition-colors duration-500">
            <FontAwesomeIcon icon="chart-line" size="8x" />
          </div>
          <h2 className="heading-3 mb-12 flex items-center gap-4 relative z-10">
            The Mission
          </h2>
          <p className="text-neutral-300 leading-relaxed text-lg sm:text-xl relative z-10">
            Formula 1 is as much an engineering competition as it is a racing series. The TV broadcast gives you the overtakes and the drama, but the true story of a race is often told through tire degredation, micro-sectors, and telemetry traces. F1 Telemetry is designed to peel back the curtain, giving every fan the pit-wall experience directly in their browser.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.4rem] p-12 sm:p-24 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-white/10 transition-colors duration-500">
            <FontAwesomeIcon icon="robot" size="8x" />
          </div>
          <h2 className="heading-3 mb-12 flex items-center gap-4 relative z-10">
            Powered by AI
          </h2>
          <p className="text-neutral-300 leading-relaxed text-lg sm:text-xl mb-6 relative z-10">
            This entire platform is maintained and developed by just me and my AI pair-programmer. No huge corporate team, no outside collaborators—just a solo dev leveraging the power of Artificial Intelligence to rapidly build, debug, and design a premium motorsport experience.
          </p>
          <p className="text-neutral-300 leading-relaxed text-lg sm:text-xl relative z-10">
            From the real-time OpenF1 integration to the 3D track visualizations and the sleek glassmorphism UI, AI has been an invaluable co-pilot in bringing this vision to life.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.4rem] p-12 sm:p-24 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-white/10 transition-colors duration-500">
            <FontAwesomeIcon icon="file-contract" size="8x" />
          </div>
          <h2 className="heading-3 mb-12 flex items-center gap-4 relative z-10">
            Commercial Use &amp; Permissions
          </h2>
          <p className="text-neutral-300 leading-relaxed text-lg sm:text-xl mb-6 relative z-10">
            F1 Telemetry is built as a non-commercial, open-source passion project. 
          </p>
          <p className="text-neutral-300 leading-relaxed text-lg sm:text-xl relative z-10">
            In accordance with the original F1nsight project terms, if you wish to use this software (or any of the original excluded components) for commercial purposes, you must contact the original creators at <a href="mailto:kothaaditya03@gmail.com" className="text-brand-yellow-500 hover:underline">kothaaditya03@gmail.com</a> or <a href="mailto:antonicommodore@gmail.com" className="text-brand-yellow-500 hover:underline">antonicommodore@gmail.com</a> to negotiate terms. Approval must be granted in writing before proceeding with any commercial activities.
          </p>
        </div>
        
        <div className="flex justify-center mt-24">
          <Button to="/" size="md" className="font-display uppercase tracking-widest px-32">
            Back to Landing Page
          </Button>
        </div>
      </div>
    </div>
  );
}
