import React from "react";
import classNames from "classnames";
import { useLocation } from "react-router-dom";
import { FaLinkedin, FaGlobe, FaInstagram, FaEnvelope } from "react-icons/fa";
import { Link } from "react-router-dom";
import { F1TelemetryLogo as Logo } from "./F1TelemetryLogo";
import { Button } from "./Button";
import { LegalLinks } from "./Links";
import { getCurrentYear } from "../utils/currentYear";
import { FaXTwitter } from "react-icons/fa6";

const currentYear = getCurrentYear();

export const Footer = ({ className }) => {
  const location = useLocation().pathname;
  const hideFooter = location.startsWith("/race/");

  return (
    <footer
      className={classNames(
        "bg-black border-t border-white/10 text-white pb-10 w-full relative z-20",
        className,
        {
          hidden: hideFooter,
        },
      )}
    >
      <div className="divider-glow-dark" />
      <div className="max-w-[1400px] mx-auto flex flex-col xl:flex-row justify-between items-center py-24 text-base max-xl:text-center px-12 md:px-24 font-lato">
        {/* Left side: Logo, tagline, and social links */}
        <div className="flex flex-col items-center xl:items-start gap-12 mb-16 xl:mb-0">
          <a href="/">
            <Logo height={48} />
          </a>
          <div>
            <p className="text-xl uppercase tracking-1xs leading-none gradient-text-electric-blue">
              Your Ultimate Destination
            </p>
            <p className="text-xl uppercase tracking-1xs leading-none gradient-text-electric-blue">
              for F1 Data and Analysis
            </p>
          </div>
          <div className="flex flex-row items-center gap-8 flex-wrap">
            <Button
              as="href"
              className="flex flex-row items-center gap-16"
              href="https://x.com/F1_Telemetry_uk"
              target="_blank"
              rel="noopener noreferrer"
              buttonStyle="hollow"
              size="sm"
            >
              <FaXTwitter size={24} />
              <p className="uppercase tracking-xs">Follow us</p>
            </Button>
            <Button
              as="href"
              className="flex flex-row items-center gap-16"
              href="mailto:admin@f1-telemetry.co.uk"
              buttonStyle="hollow"
              size="sm"
            >
              <FaEnvelope size={22} />
              <p className="uppercase tracking-xs">Contact us</p>
            </Button>
          </div>
        </div>

        {/* Right side: Page path links */}
        <div className="flex flex-col md:flex-row md:items-start gap-6 uppercase mt-8 xl:mt-0 flex-wrap justify-center">
          <div
            className="flex flex-col gap-8 p-12 rounded-2xl bg-white/5 backdrop-blur-md shadow-xl min-w-[220px] hover:bg-white/10 transition-colors duration-300 border border-white/10"
          >
            <a
              href="https://www.formula1.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 hover:scale-105 transition-all duration-300 mt-2 mb-4"
            >
              <img
                src="/logos/f1.svg"
                alt="Formula 1 Logo"
                className="h-[20px] lg:h-[28px] object-contain mb-1"
              />
              <div className="flex items-center gap-3">
                <img
                  src="/logos/fia.svg"
                  alt="FIA"
                  className="h-[24px] w-[24px] lg:h-[32px] lg:w-[32px] object-contain"
                />
                <div className="flex flex-col text-[11px] leading-tight font-bold text-neutral-300 tracking-wider text-left">
                  <span>FIA FORMULA ONE</span>
                  <span>CHAMPIONSHIP&trade;</span>
                </div>
              </div>
            </a>
          </div>

          <div
            className="flex flex-col gap-8 p-12 rounded-2xl bg-white/5 backdrop-blur-md shadow-xl min-w-[220px] hover:bg-white/10 transition-colors duration-300 border border-white/10"
          >
            <a
              href="https://www.fiaformula2.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 hover:scale-105 transition-all duration-300 mt-2 mb-4"
            >
              <img
                src="/logos/f2.svg"
                alt="Formula 2 Logo"
                className="h-[20px] lg:h-[28px] object-contain mb-1"
              />
              <div className="flex items-center gap-3">
                <img
                  src="/logos/fia.svg"
                  alt="FIA"
                  className="h-[24px] w-[24px] lg:h-[32px] lg:w-[32px] object-contain"
                />
                <div className="flex flex-col text-[11px] leading-tight font-bold text-neutral-300 tracking-wider text-left">
                  <span>FIA FORMULA 2</span>
                  <span>CHAMPIONSHIP&trade;</span>
                </div>
              </div>
            </a>
          </div>

          <div
            className="flex flex-col gap-8 p-12 rounded-2xl bg-white/5 backdrop-blur-md shadow-xl min-w-[220px] hover:bg-white/10 transition-colors duration-300 border border-white/10"
          >
            <a
              href="https://www.f1academy.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 hover:scale-105 transition-all duration-300 mt-2 mb-4"
            >
              <img
                src="/logos/f1a.svg"
                alt="F1 Academy Logo"
                className="h-[20px] lg:h-[28px] object-contain mb-1"
              />
              <div className="flex items-center gap-3">
                <img
                  src="/logos/f1_logo.svg"
                  alt="F1 Logo"
                  className="h-[24px] w-[34px] lg:h-[32px] lg:w-[40px] object-contain"
                />
                <div className="flex flex-col text-[11px] leading-tight font-bold text-neutral-300 tracking-wider text-left">
                  <span>F1 ACADEMY</span>
                  <span>CHAMPIONSHIP&trade;</span>
                </div>
              </div>
            </a>
          </div>

          <div
            className="flex flex-col gap-8 p-12 rounded-2xl bg-white/5 backdrop-blur-md shadow-xl min-w-[200px] hover:bg-white/10 transition-colors duration-300 border border-white/10"
          >
            <div className="flex flex-col items-center gap-4 mt-2 mb-4">
              <div className="flex items-center justify-center h-[20px] lg:h-[28px] mb-1">
                <p className="uppercase tracking-xs gradient-text-electric-blue text-lg font-bold">
                  INFO & LEGAL
                </p>
              </div>
              <div className="flex items-center justify-center h-[24px] lg:h-[32px]">
                <div className="flex flex-col text-[11px] leading-tight font-bold text-neutral-300 tracking-wider text-center">
                  <Link
                    to="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-yellow-500 hover:scale-105 transition-all duration-300"
                  >
                    PRIVACY POLICY
                  </Link>
                  <Link
                    to="/trademarks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-yellow-500 hover:scale-105 transition-all duration-300"
                  >
                    TRADEMARKS
                  </Link>
                  <Link
                    to="/behind-the-code"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-yellow-500 hover:scale-105 transition-all duration-300"
                  >
                    BEHIND THE CODE
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom: Year and Copyright */}
      <div className="text-center text-neutral-500 mt-6 px-24 pb-24 text-[11px] uppercase tracking-widest leading-relaxed">
        <div className="divider-glow-dark mb-16 opacity-30" />
        <p className="max-w-[900px] mx-auto mb-8 font-light">
          This website is unofficial and not associated with Formula One
          companies. All trademarks are property of their respective owners.{" "}
          <Link
            to="/trademarks"
            className="underline hover:text-brand-yellow-500 transition-colors duration-300"
          >
            Full trademark notice
          </Link>
          .
        </p>
        <p className="text-neutral-400 font-medium tracking-normal lowercase first-letter:uppercase">
          &copy; {currentYear} F1-Telemetry
        </p>
      </div>
    </footer>
  );
};
