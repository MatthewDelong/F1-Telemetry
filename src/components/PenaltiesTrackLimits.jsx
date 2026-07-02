import React, { useMemo } from "react";
import classNames from "classnames";

export function PenaltiesTrackLimits({ messages = [], driversColor = {}, driversDetails = {} }) {
  const { parsedPenalties, trackLimitCounts } = useMemo(() => {
    const penalties = [];
    const limits = {};

    messages.forEach((m) => {
      if (!m.message) return;

      const msgLower = m.message.toLowerCase();
      
      // Parse Acronym
      let acronym = "N/A";
      const match = m.message.match(/CAR \d+\s*\(([A-Z]{3})\)/);
      if (match) {
        acronym = match[1];
      } else if (m.driver_number && driversDetails[m.driver_number]) {
        acronym = driversDetails[m.driver_number];
      }

      // Track Limits
      if (
        msgLower.includes("track limit") &&
        msgLower.includes("deleted")
      ) {
        if (acronym !== "N/A") {
          limits[acronym] = (limits[acronym] || 0) + 1;
        }
      }

      // Penalties
      if (msgLower.includes("penalty") && !msgLower.includes("served")) {
        const timeObj = new Date(m.date);
        let timeStr = "";
        if (!isNaN(timeObj.getTime())) {
          timeStr = timeObj.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });
        }

        penalties.push({
          acronym,
          color: acronym !== "N/A" ? driversColor[acronym] : "555555",
          message: m.message,
          time: timeStr,
        });
      }
    });

    return { parsedPenalties: penalties, trackLimitCounts: limits };
  }, [messages, driversColor, driversDetails]);

  const formatPenaltyMessage = (msg, timeStr) => {
    let cleanMsg = msg.replace(/\s*FOR CAR \d+\s*\([A-Z]{3}\)/, "");
    const hasTime = /\b\d{2}:\d{2}(?::\d{2})?\b/.test(cleanMsg);
    const suffix = (!hasTime && timeStr) ? ` (${timeStr})` : "";

    const parts = cleanMsg.split(" - ");
    
    if (parts.length > 1) {
      return (
        <>
          <span className="text-red-500 font-bold">{parts[0]}</span>
          <span className="text-neutral-400">
            {" — "}
            {parts.slice(1).join(" - ")}
            {suffix}
          </span>
        </>
      );
    }
    return (
      <span className="text-red-500 font-bold">
        {cleanMsg}
        {suffix}
      </span>
    );
  };

  const sortedLimits = Object.entries(trackLimitCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-2xl mx-auto my-16 space-y-24">
      {/* Penalties Section */}
      <div className="rounded-xl overflow-hidden border border-neutral-800">
        <div className="bg-[#cc1111] text-white font-display text-center py-10 tracking-widest font-bold uppercase text-sm">
          Penalties
        </div>
        <div className="bg-[#151515] p-16 flex flex-col gap-12">
          {parsedPenalties.length > 0 ? (
            parsedPenalties.map((p, idx) => (
              <div key={idx} className="flex items-center gap-12 bg-neutral-900/50 p-12 rounded-md border border-neutral-800/50">
                <div className="text-yellow-600 text-lg leading-none">
                  ⚠️
                </div>
                {p.acronym !== "N/A" && (
                  <div
                    className="text-white font-display text-xs px-8 py-4 rounded-sm font-bold"
                    style={{ backgroundColor: `#${p.color}` }}
                  >
                    {p.acronym}
                  </div>
                )}
                <div className="text-xs font-display flex-1 uppercase tracking-wide">
                  {formatPenaltyMessage(p.message, p.time)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-neutral-500 text-center font-display text-sm py-8">
              No penalties recorded.
            </div>
          )}
        </div>
      </div>

      {/* Track Limits Section */}
      <div className="rounded-xl overflow-hidden border border-neutral-800">
        <div className="bg-[#e65c00] text-white font-display text-center py-10 tracking-widest font-bold uppercase text-sm">
          Track Limits
        </div>
        <div className="bg-[#151515] p-24">
          {sortedLimits.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-12">
              {sortedLimits.map(([acronym, count]) => (
                <div
                  key={acronym}
                  className="flex rounded-md overflow-hidden text-white font-display text-sm font-bold border border-neutral-800"
                  style={{ backgroundColor: `#${driversColor[acronym] || "555"}` }}
                >
                  <div className="flex-1 px-8 py-8 text-center">{acronym}</div>
                  <div className="px-12 py-8 text-center bg-black/30 w-12 flex justify-center items-center">
                    {count}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-neutral-500 text-center font-display text-sm py-8">
              No track limits recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
