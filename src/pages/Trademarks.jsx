import React, { useEffect } from "react";
import "./Trademarks.scss";

const Trademarks = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Trademarks & Intellectual Property | F1-Telemetry";
  }, []);

  return (
    <div className="trademarks-container font-lato text-white grow">
      <div className="max-w-[1000px] mx-auto px-24 pt-4 md:pt-8 pb-32 md:pb-64">
        <h1 className="heading-2 mb-32 gradient-text-light uppercase tracking-xs">
          Trademarks &amp; Intellectual Property
        </h1>
        <p className="text-neutral-400 mb-48">Last Updated: June 29, 2026</p>

        <section className="mb-48">
          <h2 className="text-2xl font-bold mb-16 uppercase tracking-xs">
            1. Disclaimer
          </h2>
          <p className="text-neutral-300 leading-relaxed">
            This website is an unofficial, fan-made project and is not
            associated, affiliated, endorsed, or sponsored by Formula One World
            Championship Limited, the Fédération Internationale de
            l&apos;Automobile (FIA), Formula One Licensing B.V., or any of their
            subsidiaries, partners, or licensees.
          </p>
        </section>

        <section className="mb-48">
          <h2 className="text-2xl font-bold mb-16 uppercase tracking-xs">
            2. Formula One Trademarks
          </h2>
          <p className="text-neutral-300 leading-relaxed mb-16">
            The following names and marks are trade marks of Formula One
            Licensing B.V., a Formula 1 company. All rights are reserved by
            their respective owners:
          </p>
          <ul className="list-disc list-inside text-neutral-300 mt-8 space-y-4">
            <li>F1®</li>
            <li>FORMULA ONE®</li>
            <li>FORMULA 1®</li>
            <li>FIA FORMULA ONE WORLD CHAMPIONSHIP™</li>
            <li>GRAND PRIX™</li>
            <li>F1 SPRINT™</li>
          </ul>
        </section>

        <section className="mb-48">
          <h2 className="text-2xl font-bold mb-16 uppercase tracking-xs">
            3. Formula 2 Trademarks
          </h2>
          <p className="text-neutral-300 leading-relaxed mb-16">
            The following names and marks are trade marks of their respective
            owners:
          </p>
          <ul className="list-disc list-inside text-neutral-300 mt-8 space-y-4">
            <li>F2™</li>
            <li>FORMULA 2™</li>
            <li>FIA FORMULA 2 CHAMPIONSHIP™</li>
          </ul>
        </section>

        <section className="mb-48">
          <h2 className="text-2xl font-bold mb-16 uppercase tracking-xs">
            4. F1 Academy Trademarks
          </h2>
          <p className="text-neutral-300 leading-relaxed mb-16">
            The following names and marks are trade marks of their respective
            owners:
          </p>
          <ul className="list-disc list-inside text-neutral-300 mt-8 space-y-4">
            <li>F1 ACADEMY™</li>
            <li>F1 ACADEMY CHAMPIONSHIP™</li>
          </ul>
        </section>

        <section className="mb-48">
          <h2 className="text-2xl font-bold mb-16 uppercase tracking-xs">
            5. FIA Trademarks
          </h2>
          <p className="text-neutral-300 leading-relaxed">
            FIA and the FIA logo are trade marks of the Fédération
            Internationale de l&apos;Automobile. All rights reserved.
          </p>
        </section>

        <section className="mb-48">
          <h2 className="text-2xl font-bold mb-16 uppercase tracking-xs">
            6. Team &amp; Driver Trademarks
          </h2>
          <p className="text-neutral-300 leading-relaxed">
            All team names, logos, and driver likenesses used on this website are
            the property of their respective owners and are used here for
            informational and editorial purposes only. No ownership or
            endorsement is implied.
          </p>
        </section>

        <section className="mb-48">
          <h2 className="text-2xl font-bold mb-16 uppercase tracking-xs">
            7. Use of Content
          </h2>
          <p className="text-neutral-300 leading-relaxed">
            The data, statistics, and analysis presented on F1-Telemetry are
            compiled from publicly available sources for educational and
            entertainment purposes. If you are a rights holder and believe any
            content on this site infringes upon your intellectual property,
            please contact us so we can address your concerns promptly.
          </p>
        </section>

        <div className="divider-glow-dark my-48" />

        <p className="text-neutral-500 text-[11px] uppercase tracking-widest leading-relaxed font-light opacity-80">
          All trademarks, service marks, trade names, and logos referenced herein
          belong to their respective owners. F1-Telemetry has no affiliation
          with Formula One World Championship Limited or the FIA.
        </p>
      </div>
    </div>
  );
};

export { Trademarks };
