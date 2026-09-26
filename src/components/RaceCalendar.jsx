import React from "react";


const RaceCalendar = ({ onRaceClick }) => {
  const RACES_DATA = {
    "Australia Grand Prix": {
      round: 1,
      raceKey: "f1.races.australia",
      circuitKey: "f1.circuits.albert_park",
      date: "2026-03-08",
      localTime: "15:00",
      ukTime: "04:00",
      laps: 58,
      city: "Melbourne, AU",
      country: "Australia",
      lat: -37.8497,
      lng: 144.968,
      displayName: "Australia Grand Prix",
      countDownDate: "2026-03-08T04:00:00Z",
      flag: "au.webp",
      track: "Australia.webp",
      direction: "cw",
    },
    "China Grand Prix": {
      round: 2,
      isSprint: true,
      raceKey: "f1.races.china",
      circuitKey: "f1.circuits.shanghai",
      date: "2026-03-15",
      localTime: "15:00",
      ukTime: "07:00",
      laps: 56,
      city: "Shanghai, CN",
      country: "China",
      lat: 31.3389,
      lng: 121.2197,
      displayName: "China Grand Prix",
      countDownDate: "2026-03-15T07:00:00Z",
      flag: "cn.webp",
      track: "China.webp",
      direction: "cw",
    },
    "Japan Grand Prix": {
      round: 3,
      raceKey: "f1.races.japan",
      circuitKey: "f1.circuits.suzuka",
      date: "2026-03-29",
      localTime: "14:00",
      ukTime: "06:00",
      laps: 53,
      city: "Suzuka, JP",
      country: "Japan",
      lat: 34.8431,
      lng: 136.5407,
      displayName: "Japanes Grand Prix",
      countDownDate: "2026-03-29T05:00:00Z",
      flag: "jp.webp",
      track: "Japan.webp",
      direction: "cw",
    },

    "Miami Grand Prix": {
      round: 4,
      isSprint: true,
      raceKey: "f1.races.miami",
      circuitKey: "f1.circuits.miami",
      date: "2026-05-03",
      localTime: "13:00",
      ukTime: "18:00",
      laps: 57,
      city: "Miami, US",
      country: "USA",
      lat: 25.9581,
      lng: -80.2389,
      displayName: "Miami Grand Prix",
      countDownDate: "2026-05-03T17:00:00Z",
      flag: "us.webp",
      track: "Miami.webp",
      direction: "ccw",
    },
    "Canada Grand Prix": {
      round: 5,
      raceKey: "f1.races.canada",
      circuitKey: "f1.circuits.gilles_villeneuve",
      date: "2026-05-24",
      localTime: "16:00",
      ukTime: "21:00",
      laps: 70,
      city: "Montreal, CA",
      country: "Canada",
      lat: 45.5,
      lng: -73.5228,
      displayName: "Canada Grand Prix",
      countDownDate: "2026-05-24T20:00:00Z",
      flag: "ca.webp",
      track: "Canada.webp",
      direction: "cw",
    },
    "Monaco Grand Prix": {
      round: 6,
      raceKey: "f1.races.monaco",
      circuitKey: "f1.circuits.monte_carlo",
      date: "2026-06-07",
      localTime: "15:00",
      ukTime: "14:00",
      laps: 78,
      city: "Monte Carlo, MC",
      country: "Monaco",
      lat: 43.7347,
      lng: 7.4206,
      displayName: "Monaco Grand Prix",
      countDownDate: "2026-06-07T13:00:00Z",
      flag: "mc.webp",
      track: "Monaco.webp",
      direction: "cw",
    },
    "Spain Grand Prix": {
      round: 7,
      raceKey: "f1.races.spain",
      circuitKey: "f1.circuits.catalunya",
      date: "2026-06-14",
      localTime: "15:00",
      ukTime: "14:00",
      laps: 66,
      city: "Montmeló, ES",
      country: "Spain",
      lat: 41.57,
      lng: 2.2611,
      displayName: "Barcelona-Catalunya Grand Prix",
      countDownDate: "2026-06-14T13:00:00Z",
      flag: "es.webp",
      track: "Barcelona.webp",
      direction: "cw",
    },
    "Austria Grand Prix": {
      round: 8,
      raceKey: "f1.races.austria",
      circuitKey: "f1.circuits.red_bull_ring",
      date: "2026-06-28",
      localTime: "15:00",
      ukTime: "14:00",
      laps: 71,
      city: "Spielberg, AT",
      country: "Austria",
      lat: 47.2197,
      lng: 14.7647,
      displayName: "Austria Grand Prix",
      countDownDate: "2026-06-28T13:00:00Z",
      flag: "at.webp",
      track: "Austria.webp",
      direction: "cw",
    },
    "Great Britain Grand Prix": {
      round: 9,
      raceKey: "f1.races.britain",
      circuitKey: "f1.circuits.silverstone",
      date: "2026-07-05",
      localTime: "15:00",
      ukTime: "15:00",
      laps: 52,
      city: "Silverstone, GB",
      country: "United Kingdom",
      lat: 52.0786,
      lng: -1.0169,
      displayName: "Great Britain Grand Prix",
      countDownDate: "2026-07-05T14:00:00Z",
      flag: "gb.webp",
      track: "Silverstone.webp",
      direction: "cw",
    },
    "Belgium Grand Prix": {
      round: 10,
      isSprint: true,
      raceKey: "f1.races.belgium",
      circuitKey: "f1.circuits.spa",
      date: "2026-07-19",
      localTime: "15:00",
      ukTime: "14:00",
      laps: 44,
      city: "Stavelot, BE",
      country: "Belgium",
      lat: 50.4372,
      lng: 5.9714,
      displayName: "Belgium Grand Prix",
      countDownDate: "2026-07-19T13:00:00Z",
      flag: "be.webp",
      track: "Belgium.webp",
      direction: "cw",
    },
    "Hungary Grand Prix": {
      round: 11,
      raceKey: "f1.races.hungary",
      circuitKey: "f1.circuits.hungaroring",
      date: "2026-07-26",
      localTime: "15:00",
      ukTime: "14:00",
      laps: 70,
      city: "Mogyoród, HU",
      country: "Hungary",
      lat: 47.5789,
      lng: 19.2486,
      displayName: "Hungary Grand Prix",
      countDownDate: "2026-07-26T13:00:00Z",
      flag: "hu.webp",
      track: "Hungary.webp",
      direction: "cw",
    },
    "Netherlands Grand Prix": {
      round: 12,
      raceKey: "f1.races.netherlands",
      circuitKey: "f1.circuits.zandvoort",
      date: "2026-08-23",
      localTime: "15:00",
      ukTime: "14:00",
      laps: 72,
      city: "Zandvoort, NL",
      country: "Netherlands",
      lat: 52.3888,
      lng: 4.5409,
      displayName: "Netherlands Grand Prix",
      countDownDate: "2026-08-23T13:00:00Z",
      flag: "nl.webp",
      track: "Dutch.webp",
      direction: "cw",
    },
    "Italy Grand Prix": {
      round: 13,
      raceKey: "f1.races.italy",
      circuitKey: "f1.circuits.monza",
      date: "2026-09-06",
      localTime: "15:00",
      ukTime: "14:00",
      laps: 53,
      city: "Monza, IT",
      country: "Italy",
      lat: 45.6156,
      lng: 9.2811,
      displayName: "Italy Grand Prix",
      countDownDate: "2026-09-06T13:00:00Z",
      flag: "it.webp",
      track: "Italy.webp",
      direction: "cw",
    },
    "Spain Grand Prix (Madrid)": {
      round: 14,
      globeName: "Madrid Grand Prix",
      raceKey: "f1.races.spain_madrid",
      circuitKey: "f1.circuits.madrid",
      date: "2026-09-13",
      localTime: "15:00",
      ukTime: "14:00",
      laps: 57,
      city: "Madrid, ES",
      country: "Spain",
      lat: 40.4168,
      lng: -3.7038,
      displayName: "Spanish Grand Prix (Madrid)",
      countDownDate: "2026-09-13T13:00:00Z",
      flag: "es.webp",
      track: "Madrid-Spain.webp",
      direction: "cw",
    },
    "Azerbaijan Grand Prix": {
      round: 15,
      raceKey: "f1.races.azerbaijan",
      circuitKey: "f1.circuits.baku",
      date: "2026-09-26",
      localTime: "15:00",
      ukTime: "12:00",
      laps: 51,
      city: "Baku, AZ",
      country: "Azerbaijan",
      lat: 40.3725,
      lng: 49.8533,
      displayName: "Azerbaijan Grand Prix",
      countDownDate: "2026-09-26T11:00:00Z",
      flag: "az.webp",
      track: "Azerbaijan.webp",
      direction: "ccw",
    },
    "Bahrain Grand Prix": {
      round: 16,
      raceKey: "f1.races.bahrain",
      circuitKey: "f1.circuits.sepang",
      date: "2026-10-04",
      localTime: "15:00",
      ukTime: "08:00",
      laps: 56,
      city: "Kuala Lumpur, MY",
      country: "Malaysia",
      lat: 2.7608,
      lng: 101.7383,
      displayName: "Bahrain Grand Prix (Malaysia)",
      countDownDate: "2026-10-04T07:00:00Z",
      flag: "my.webp",
      track: "Bahrain.webp",
      direction: "cw",
      isNew: true,
    },
    "Singapore Grand Prix": {
      round: 17,
      raceKey: "f1.races.singapore",
      circuitKey: "f1.circuits.marina_bay",
      date: "2026-10-11",
      localTime: "20:00",
      ukTime: "13:00",
      laps: 62,
      city: "Singapore, SG",
      country: "Singapore",
      lat: 1.2914,
      lng: 103.864,
      displayName: "Singapore Grand Prix",
      countDownDate: "2026-10-11T12:00:00Z",
      flag: "sg.webp",
      track: "Singapore.webp",
      direction: "ccw",
    },
    "United States Grand Prix": {
      round: 18,
      isSprint: true,
      raceKey: "f1.races.usa",
      circuitKey: "f1.circuits.cota",
      date: "2026-10-25",
      localTime: "15:00",
      ukTime: "20:00",
      laps: 56,
      city: "Austin, US",
      country: "USA",
      lat: 30.1328,
      lng: -97.6411,
      displayName: "Circuit of the Americas - USA",
      countDownDate: "2026-10-25T20:00:00Z",
      flag: "us.webp",
      track: "Austin-USA.webp",
      direction: "ccw",
    },
    "Mexico Grand Prix": {
      round: 19,
      raceKey: "f1.races.mexico",
      circuitKey: "f1.circuits.hermanos_rodriguez",
      date: "2026-11-01",
      localTime: "14:00",
      ukTime: "20:00",
      laps: 71,
      city: "Mexico City, MX",
      country: "Mexico",
      lat: 19.4042,
      lng: -99.0907,
      displayName: "Mexico Grand Prix",
      countDownDate: "2026-11-01T20:00:00Z",
      flag: "mx.webp",
      track: "Mexico.webp",
      direction: "cw",
    },
    "Brazil Grand Prix": {
      round: 20,
      isSprint: true,
      raceKey: "f1.races.brazil",
      circuitKey: "f1.circuits.interlagos",
      date: "2026-11-08",
      localTime: "14:00",
      ukTime: "17:00",
      laps: 71,
      city: "Sao Paulo, BR",
      country: "Brazil",
      lat: -23.7036,
      lng: -46.6997,
      displayName: "Brazil Grand Prix",
      countDownDate: "2026-11-08T17:00:00Z",
      flag: "br.webp",
      track: "Brazil.webp",
      direction: "ccw",
    },
    "Las Vegas Grand Prix": {
      round: 21,
      raceKey: "f1.races.vegas",
      circuitKey: "f1.circuits.vegas_strip",
      date: "2026-11-21",
      localTime: "20:00",
      ukTime: "04:00",
      laps: 50,
      city: "Las Vegas, US",
      country: "USA",
      lat: 36.1147,
      lng: -115.1728,
      displayName: "Las Vegas Grand Prix - USA",
      countDownDate: "2026-11-22T04:00:00Z",
      flag: "us.webp",
      track: "Las-Vegas.webp",
      direction: "ccw",
    },
    "Qatar Grand Prix": {
      round: 22,
      isSprint: true,
      raceKey: "f1.races.qatar",
      circuitKey: "f1.circuits.losail",
      date: "2026-11-29",
      localTime: "19:00",
      ukTime: "16:00",
      laps: 57,
      city: "Lusail, QA",
      country: "Qatar",
      lat: 25.49,
      lng: 51.4542,
      displayName: "Qatar Grand Prix",
      countDownDate: "2026-11-29T16:00:00Z",
      flag: "qa.webp",
      track: "Qatar.webp",
      direction: "cw",
    },
    "Abu Dhabi Grand Prix": {
      round: 23,
      raceKey: "f1.races.abu_dhabi",
      circuitKey: "f1.circuits.yas_marina",
      date: "2026-12-06",
      localTime: "17:00",
      ukTime: "13:00",
      laps: 58,
      city: "Abu Dhabi, AE",
      country: "UAE",
      lat: 24.4672,
      lng: 54.6031,
      displayName: "Abu Dhabi Grand Prix",
      countDownDate: "2026-12-06T13:00:00Z",
      flag: "ae.webp",
      track: "Abu-Dhabi.webp",
      direction: "ccw",
    },
  };
  const racesData = RACES_DATA;
  // Convert object to array and sort by round
  const racesList = Object.values(racesData).sort((a, b) => a.round - b.round);

  // Split into left and right columns (11 on left, 12 on right for 23 total)
  const midpoint = 11;
  const leftColumn = racesList.slice(0, midpoint);
  const rightColumn = racesList.slice(midpoint);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date
      .toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
      .toUpperCase();
  };

  const DATE_RANGES_2026 = {
    1: "06-08 Mar",
    2: "13-15 Mar",
    3: "27-29 Mar",
    4: "01-03 May",
    5: "22-24 May",
    6: "05-07 Jun",
    7: "12-14 Jun",
    8: "26-28 Jun",
    9: "03-05 Jul",
    10: "17-19 Jul",
    11: "24-26 Jul",
    12: "21-23 Aug",
    13: "04-06 Sep",
    14: "11-13 Sep",
    15: "24-26 Sep",
    16: "02-04 Oct",
    17: "09-11 Oct",
    18: "23-25 Oct",
    19: "30 Oct-01 Nov",
    20: "06-08 Nov",
    21: "19-21 Nov",
    22: "27-29 Nov",
    23: "04-06 Dec",
  };

  const renderRaceRow = (race) => (
    <div
      key={race.round}
      onClick={() => {
        if (onRaceClick) {
          onRaceClick(race);
        }
      }}
      className="group flex items-center bg-white/5 rounded-lg py-4 px-6 border-l-[3px] border-transparent cursor-pointer hover:bg-white/10 hover:border-white/20 transition-colors duration-200"
    >
      <div className="w-[28px] flex-shrink-0 font-black text-[0.7rem] text-[#e10600]">
        <span>R{race.round}</span>
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
      <div className="font-semibold text-[0.65rem] text-neutral-400 text-right min-w-[70px] flex-shrink-0 pl-4 whitespace-nowrap group-hover:text-white transition-colors duration-200 flex items-center justify-end gap-2">
        <span>{(DATE_RANGES_2026[race.round] || formatDate(race.date)).toUpperCase()}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-neutral-600 group-hover:text-[#e10600] transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
        </svg>
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
      <div className="text-center mb-16 border-b-2 border-[#e10600] pb-8 relative z-10">
        <h2 className="text-[1.1rem] font-black tracking-widest text-white uppercase m-0">
          FORMULA 1 2026 CALENDAR
        </h2>
        <p className="text-neutral-500 text-[0.65rem] font-bold uppercase tracking-widest mt-3">
          Click any race to preview circuit details
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
        <p className="text-[0.65rem] text-neutral-500 italic uppercase">
          23 races • 20 countries • 6 sprint weekends
        </p>
      </div>
    </div>
  );
};

export default RaceCalendar;
