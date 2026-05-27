import Accordion from "../components/Accordion";
import React from "react";
import { Link } from "react-router-dom";
import { getCurrentYear } from "../utils/currentYear";

const currentYear = getCurrentYear();

export const F1Links = ({ accordion = false, onClick }) => {
  const links = (
    <>
      <Link
        to="/race-results"
        className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
        onClick={onClick}
      >
        {currentYear} Race Results
      </Link>
      <Link
        to="/constructor-standings"
        className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
        onClick={onClick}
      >
        Constructor Standings
      </Link>
      <Link
        to="/driver-standings"
        className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
        onClick={onClick}
      >
        Driver Standings
      </Link>
      <Link
        to="/driver-comparison"
        className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
        onClick={onClick}
      >
        Driver Comparisons
      </Link>
      <Link
        to="/teammates-comparison"
        className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
        onClick={onClick}
      >
        Teammate Comparisons
      </Link>
      <Link
        to="/ar-viewer"
        className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
        onClick={onClick}
      >
        Team History
      </Link>
    </>
  );
  return accordion ? (
    <Accordion
      title="Formula 1"
      contentClasses="flex flex-col gap-2 items-start"
      titleClassName="text-lg font-bold"
      defaultOpen={true}
    >
      {links}
    </Accordion>
  ) : (
    <>
      <div>
        <p className="uppercase tracking-xs gradient-text-light text-lg font-bold">
          Formula 1
        </p>
        <div className="divider-glow-dark mt-8 mb-12 border-t border-neutral-700/50" />
      </div>
      {links}
    </>
  );
};

export const F1ALinks = ({ accordion = false, onClick }) => {
  const links = (
    <>
      <Link
        to="/f1a/race-results"
        className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
        onClick={onClick}
      >
        {currentYear} Race Results
      </Link>
      <Link
        to="/f1a/constructor-standings"
        className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
        onClick={onClick}
      >
        Constructor Standings
      </Link>
      <Link
        to="/f1a/driver-standings"
        className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
        onClick={onClick}
      >
        Driver Standings
      </Link>
    </>
  );
  return accordion ? (
    <Accordion
      title="F1 Academy"
      contentClasses="flex flex-col gap-2 items-start"
      titleClassName="text-lg font-bold"
      defaultOpen={true}
    >
      {links}
    </Accordion>
  ) : (
    <>
      <div>
        <p className="uppercase tracking-xs gradient-text-light text-lg font-bold">
          F1 Academy
        </p>
        <div className="divider-glow-dark mt-8 mb-12 border-t border-neutral-700/50" />
      </div>
      {links}
    </>
  );
};

export const F2Links = ({ accordion = false, onClick }) => {
  const links = (
    <>
      <Link
        to="/f2/race-results"
        className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
        onClick={onClick}
      >
        {currentYear} Race Results
      </Link>
      <Link
        to="/f2/constructor-standings"
        className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
        onClick={onClick}
      >
        Constructor Standings
      </Link>
      <Link
        to="/f2/driver-standings"
        className="text-m leading-relaxed text-neutral-400 hover:text-brand-blue-400 hover:translate-x-2 transition-all duration-300 block"
        onClick={onClick}
      >
        Driver Standings
      </Link>
    </>
  );
  return accordion ? (
    <Accordion
      title="Formula 2"
      contentClasses="flex flex-col gap-2 items-start"
      titleClassName="text-lg font-bold"
      defaultOpen={true}
    >
      {links}
    </Accordion>
  ) : (
    <>
      <div>
        <p className="uppercase tracking-xs gradient-text-light text-lg font-bold">
          Formula 2
        </p>
        <div className="divider-glow-dark mt-8 mb-12 border-t border-neutral-700/50" />
      </div>
      {links}
    </>
  );
};
export const LegalLinks = ({ accordion = false, onClick }) => {
  const links = (
    <>
      <Link
        to="/privacy-policy"
        className="text-m leading-relaxed text-neutral-400 hover:text-brand-yellow-500 hover:translate-x-2 transition-all duration-300 block"
        onClick={onClick}
      >
        Privacy Policy
      </Link>
    </>
  );
  return accordion ? (
    <Accordion
      title="Legal"
      contentClasses="flex flex-col gap-8 items-start"
      titleClassName="text-lg font-bold"
    >
      {links}
    </Accordion>
  ) : (
    <>
      <div>
        <p className="uppercase tracking-xs gradient-text-light text-lg font-bold">
          Legal
        </p>
        <div className="divider-glow-dark mt-8 mb-12 border-t border-neutral-700/50" />
      </div>
      {links}
    </>
  );
};
