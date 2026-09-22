import React from "react";

const RaceCalendar2027 = () => {
  const RACES_DATA_2027 = [
    {
      round: "T",
      displayName: "Pre-Season Testing",
      date: "2027-02-27",
      dateRange: "24-27 Feb",
      city: "Sakhir, BH",
      country: "Bahrain",
      flag: "bh.webp",
      isTesting: true,
    },
    {
      round: 1,
      displayName: "Bahrain Grand Prix",
      date: "2027-03-14",
      dateRange: "12-14 Mar",
      city: "Sakhir, BH",
      country: "Bahrain",
      flag: "bh.webp",
      isSprint: true,
    },
    {
      round: 2,
      displayName: "Saudi Arabian Grand Prix",
      date: "2027-03-21",
      dateRange: "19-21 Mar",
      city: "Jeddah, SA",
      country: "Saudi Arabia",
      flag: "sa.webp",
    },
    {
      round: 3,
      displayName: "Australian Grand Prix",
      date: "2027-04-04",
      dateRange: "2-4 Apr",
      city: "Melbourne, AU",
      country: "Australia",
      flag: "au.webp",
      isSprint: true,
    },
    {
      round: 4,
      displayName: "Japanese Grand Prix",
      date: "2027-04-11",
      dateRange: "9-11 Apr",
      city: "Suzuka, JP",
      country: "Japan",
      flag: "jp.webp",
      isSprint: true,
    },
    {
      round: 5,
      displayName: "Chinese Grand Prix",
      date: "2027-04-18",
      dateRange: "16-18 Apr",
      city: "Shanghai, CN",
      country: "China",
      flag: "cn.webp",
    },
    {
      round: 6,
      displayName: "Miami Grand Prix",
      date: "2027-05-02",
      dateRange: "30 Apr-2 May",
      city: "Miami, US",
      country: "USA",
      flag: "us.webp",
    },
    {
      round: 7,
      displayName: "Canadian Grand Prix",
      date: "2027-05-23",
      dateRange: "21-23 May",
      city: "Montreal, CA",
      country: "Canada",
      flag: "ca.webp",
      isSprint: true,
    },
    {
      round: 8,
      displayName: "Monaco Grand Prix",
      date: "2027-06-06",
      dateRange: "4-6 Jun",
      city: "Monte Carlo, MC",
      country: "Monaco",
      flag: "mc.webp",
      isSprint: true,
    },
    {
      round: 9,
      displayName: "Portuguese Grand Prix",
      date: "2027-06-20",
      dateRange: "18-20 Jun",
      city: "Portimão, PT",
      country: "Portugal",
      flag: "pt.webp",
      isNew: true,
    },
    {
      round: 10,
      displayName: "British Grand Prix",
      date: "2027-07-04",
      dateRange: "2-4 Jul",
      city: "Silverstone, GB",
      country: "United Kingdom",
      flag: "gb.webp",
      isSprint: true,
    },
    {
      round: 11,
      displayName: "Austrian Grand Prix",
      date: "2027-07-11",
      dateRange: "9-11 Jul",
      city: "Spielberg, AT",
      country: "Austria",
      flag: "at.webp",
    },
    {
      round: 12,
      displayName: "Belgian Grand Prix",
      date: "2027-07-25",
      dateRange: "23-25 Jul",
      city: "Stavelot, BE",
      country: "Belgium",
      flag: "be.webp",
    },
    {
      round: 13,
      displayName: "Hungarian Grand Prix",
      date: "2027-08-01",
      dateRange: "30 Jul-1 Aug",
      city: "Mogyoród, HU",
      country: "Hungary",
      flag: "hu.webp",
    },
    {
      round: 14,
      displayName: "Italian Grand Prix",
      date: "2027-09-05",
      dateRange: "3-5 Sep",
      city: "Monza, IT",
      country: "Italy",
      flag: "it.webp",
      isSprint: true,
    },
    {
      round: 15,
      displayName: "Spanish Grand Prix",
      date: "2027-09-12",
      dateRange: "10-12 Sep",
      city: "Madrid, ES",
      country: "Spain",
      flag: "es.webp",
    },
    {
      round: 16,
      displayName: "Azerbaijan Grand Prix",
      date: "2027-09-26",
      dateRange: "24-26 Sep",
      city: "Baku, AZ",
      country: "Azerbaijan",
      flag: "az.webp",
    },
    {
      round: 17,
      displayName: "Turkish Grand Prix",
      date: "2027-10-03",
      dateRange: "1-3 Oct",
      city: "Istanbul, TR",
      country: "Turkey",
      flag: "tr.webp",
      isNew: true,
    },
    {
      round: 18,
      displayName: "Singapore Grand Prix",
      date: "2027-10-10",
      dateRange: "8-10 Oct",
      city: "Singapore, SG",
      country: "Singapore",
      flag: "sg.webp",
    },
    {
      round: 19,
      displayName: "United States Grand Prix",
      date: "2027-10-24",
      dateRange: "22-24 Oct",
      city: "Austin, US",
      country: "USA",
      flag: "us.webp",
    },
    {
      round: 20,
      displayName: "Mexico City Grand Prix",
      date: "2027-10-31",
      dateRange: "29-31 Oct",
      city: "Mexico City, MX",
      country: "Mexico",
      flag: "mx.webp",
    },
    {
      round: 21,
      displayName: "Brazilian Grand Prix",
      date: "2027-11-07",
      dateRange: "5-7 Nov",
      city: "São Paulo, BR",
      country: "Brazil",
      flag: "br.webp",
      isSprint: true,
    },
    {
      round: 22,
      displayName: "Las Vegas Grand Prix",
      date: "2027-11-20",
      dateRange: "18-20 Nov",
      city: "Las Vegas, US",
      country: "USA",
      flag: "us.webp",
    },
    {
      round: 23,
      displayName: "Qatar Grand Prix",
      date: "2027-12-05",
      dateRange: "3-5 Dec",
      city: "Lusail, QA",
      country: "Qatar",
      flag: "qa.webp",
      isSprint: true,
    },
    {
      round: 24,
      displayName: "Abu Dhabi Grand Prix",
      date: "2027-12-12",
      dateRange: "10-12 Dec",
      city: "Abu Dhabi, AE",
      country: "UAE",
      flag: "ae.webp",
      isSprint: true,
    },
  ];

  // Split into two columns: testing + R1-R12 on left, R13-R24 on right
  const midpoint = 13; // testing + 12 races
  const leftColumn = RACES_DATA_2027.slice(0, midpoint);
  const rightColumn = RACES_DATA_2027.slice(midpoint);

  const renderRaceRow = (race) => (
    <div
      key={race.isTesting ? "testing" : race.round}
      className={`flex items-center rounded-lg py-4 px-6 border-l-[3px] ${
        race.isTesting
          ? "bg-amber-500/10 border-amber-500/50"
          : "bg-white/5 border-transparent"
      }`}
    >
      <div className="w-[28px] flex-shrink-0 font-black text-[0.7rem] text-[#e10600]">
        <span>
          {race.isTesting ? (
            <span className="text-amber-400 text-[0.6rem]">TST</span>
          ) : (
            `R${race.round}`
          )}
        </span>
      </div>
      <div className="w-[26px] flex-shrink-0 flex items-center justify-center">
        <img
          src={`/images/flags/${race.flag}`}
          alt={race.country}
          className="w-[18px] rounded-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-white/20"
        />
      </div>
      <div className="flex-1 font-bold text-[0.65rem] tracking-wide pl-6 text-white min-w-0">
        <span className="whitespace-nowrap">{race.displayName.toUpperCase()}</span>
        {race.isSprint && (
          <span className="ml-4 font-black text-[0.55rem] text-purple-400 bg-purple-500/10 px-3 py-[1px] rounded-[3px] align-middle whitespace-nowrap">
            SPRINT
          </span>
        )}
        {race.isNew && (
          <span className="ml-4 font-black text-[0.55rem] text-blue-500 bg-blue-500/10 px-3 py-[1px] rounded-[3px] align-middle whitespace-nowrap">
            NEW
          </span>
        )}
      </div>
      <div className="font-semibold text-[0.65rem] text-neutral-400 text-right min-w-[80px] flex-shrink-0 pl-4 whitespace-nowrap">
        {race.dateRange.toUpperCase()}
      </div>
    </div>
  );

  return (
    <div className="w-full bg-glow-dark border border-white/5 rounded-[2.4rem] p-16 md:p-24 shadow-xl relative group">
      <div
        className="absolute inset-0 z-0 opacity-10 transition-opacity duration-300 group-hover:opacity-20"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.5) 0%, rgba(0,0,0,0) 70%)`,
        }}
      />
      <div className="text-center mb-8 border-b-2 border-[#e10600] pb-8 relative z-10">
        <h2 className="text-[1.1rem] font-black tracking-widest text-white uppercase m-0">
          FORMULA 1 2027 CALENDAR
        </h2>
        <p className="text-[0.7rem] text-amber-400/90 mt-4 font-semibold tracking-wide">
          ⚠️ Subject to change due to Middle East conflict
        </p>
      </div>
      <div className="flex flex-col md:flex-row w-full gap-16 md:gap-24 relative z-10">
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {leftColumn.map(renderRaceRow)}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {rightColumn.map(renderRaceRow)}
        </div>
      </div>
      <div className="text-center mt-16 relative z-10">
        <p className="text-[0.65rem] text-neutral-500 italic">
          24 races • 22 countries • 10 sprint weekends
        </p>
      </div>
    </div>
  );
};

export default RaceCalendar2027;
