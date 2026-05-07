import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./FormulaOne.css";

// Race Data for Automation - Using the data provided by the user
const RACES_DATA = {
  "Australian Grand Prix": {
    round: 1,
    raceName: "Australian Grand Prix",
    circuitName: "Albert Park Grand Prix Circuit",
    date: "2026-03-08",
    localTime: "15:00",
    laps: 58,
    city: "Melbourne, AU",
    country: "Australia",
    displayName: "Melbourne",
    countDownDate: "2026-03-08T04:00:00Z",
    flag: "au.webp",
    direction: "cw",
  },
  "Chinese Grand Prix": {
    round: 2,
    raceName: "Chinese Grand Prix",
    circuitName: "Shanghai International Circuit",
    date: "2026-03-15",
    localTime: "15:00",
    laps: 56,
    city: "Shanghai, CN",
    country: "China",
    displayName: "Shanghai",
    countDownDate: "2026-03-15T07:00:00Z",
    flag: "cn.webp",
    direction: "cw",
  },
  "Japanese Grand Prix": {
    round: 3,
    raceName: "Japanese Grand Prix",
    circuitName: "Suzuka Circuit",
    date: "2026-03-29",
    localTime: "14:00",
    laps: 53,
    city: "Suzuka, JP",
    country: "Japan",
    displayName: "Suzuka",
    countDownDate: "2026-03-29T05:00:00Z",
    flag: "jp.webp",
    direction: "cw",
  },
  "Miami Grand Prix": {
    round: 4,
    raceName: "Miami Grand Prix",
    circuitName: "Miami International Autodrome",
    date: "2026-05-03",
    localTime: "13:00",
    laps: 57,
    city: "Miami, US",
    country: "USA",
    displayName: "Miami",
    countDownDate: "2026-05-03T17:00:00Z",
    flag: "us.webp",
    direction: "ccw",
  },
  "Canadian Grand Prix": {
    round: 5,
    raceName: "Canadian Grand Prix",
    circuitName: "Circuit Gilles Villeneuve",
    date: "2026-05-24",
    localTime: "16:00",
    laps: 70,
    city: "Montreal, CA",
    country: "Canada",
    displayName: "Montreal",
    countDownDate: "2026-05-24T20:00:00Z",
    flag: "ca.webp",
    direction: "cw",
  },
  "Monaco Grand Prix": {
    round: 6,
    raceName: "Monaco Grand Prix",
    circuitName: "Circuit de Monaco",
    date: "2026-06-07",
    localTime: "15:00",
    laps: 78,
    city: "Monte Carlo, MC",
    country: "Monaco",
    displayName: "Monte Carlo",
    countDownDate: "2026-06-07T13:00:00Z",
    flag: "mc.webp",
    direction: "cw",
  },
  "Spanish Grand Prix": {
    round: 7,
    raceName: "Spanish Grand Prix",
    circuitName: "Circuit de Barcelona-Catalunya",
    date: "2026-06-14",
    localTime: "15:00",
    laps: 66,
    city: "Montmeló, ES",
    country: "Spain",
    displayName: "Barcelona",
    countDownDate: "2026-06-14T13:00:00Z",
    flag: "es.webp",
    direction: "cw",
  },
  "Austrian Grand Prix": {
    round: 8,
    raceName: "Austrian Grand Prix",
    circuitName: "Red Bull Ring",
    date: "2026-06-28",
    localTime: "15:00",
    laps: 71,
    city: "Spielberg, AT",
    country: "Austria",
    displayName: "Spielberg",
    countDownDate: "2026-06-28T13:00:00Z",
    flag: "at.webp",
    direction: "cw",
  },
  "British Grand Prix": {
    round: 9,
    raceName: "British Grand Prix",
    circuitName: "Silverstone Circuit",
    date: "2026-07-05",
    localTime: "15:00",
    laps: 52,
    city: "Silverstone, GB",
    country: "United Kingdom",
    displayName: "Silverstone",
    countDownDate: "2026-07-05T14:00:00Z",
    flag: "gb.webp",
    direction: "cw",
  },
  "Belgian Grand Prix": {
    round: 10,
    raceName: "Belgian Grand Prix",
    circuitName: "Circuit de Spa-Francorchamps",
    date: "2026-07-19",
    localTime: "15:00",
    laps: 44,
    city: "Stavelot, BE",
    country: "Belgium",
    displayName: "Spa-Francorchamps",
    countDownDate: "2026-07-19T13:00:00Z",
    flag: "be.webp",
    direction: "cw",
  },
  "Hungarian Grand Prix": {
    round: 11,
    raceName: "Hungarian Grand Prix",
    circuitName: "Hungaroring",
    date: "2026-07-26",
    localTime: "15:00",
    laps: 70,
    city: "Mogyoród, HU",
    country: "Hungary",
    displayName: "Budapest",
    countDownDate: "2026-07-26T13:00:00Z",
    flag: "hu.webp",
    direction: "cw",
  },
  "Dutch Grand Prix": {
    round: 12,
    raceName: "Dutch Grand Prix",
    circuitName: "Circuit Park Zandvoort",
    date: "2026-08-23",
    localTime: "15:00",
    laps: 72,
    city: "Zandvoort, NL",
    country: "Netherlands",
    displayName: "Zandvoort",
    countDownDate: "2026-08-23T13:00:00Z",
    flag: "nl.webp",
    direction: "cw",
  },
  "Italian Grand Prix": {
    round: 13,
    raceName: "Italian Grand Prix",
    circuitName: "Autodromo Nazionale di Monza",
    date: "2026-09-06",
    localTime: "15:00",
    laps: 53,
    city: "Monza, IT",
    country: "Italy",
    displayName: "Monza",
    countDownDate: "2026-09-06T13:00:00Z",
    flag: "it.webp",
    direction: "cw",
  },
  "Spanish Grand Prix (Madrid)": {
    round: 14,
    raceName: "Madrid Grand Prix",
    circuitName: "Madring",
    date: "2026-09-13",
    localTime: "15:00",
    laps: 57,
    city: "Madrid, ES",
    country: "Spain",
    displayName: "Madrid",
    countDownDate: "2026-09-13T13:00:00Z",
    flag: "es.webp",
    direction: "cw",
  },
  "Azerbaijan Grand Prix": {
    round: 15,
    raceName: "Azerbaijan Grand Prix",
    circuitName: "Baku City Circuit",
    date: "2026-09-26",
    localTime: "15:00",
    laps: 51,
    city: "Baku, AZ",
    country: "Azerbaijan",
    displayName: "Baku",
    countDownDate: "2026-09-26T11:00:00Z",
    flag: "az.webp",
    direction: "ccw",
  },
  "Singapore Grand Prix": {
    round: 16,
    raceName: "Singapore Grand Prix",
    circuitName: "Marina Bay Street Circuit",
    date: "2026-10-11",
    localTime: "20:00",
    laps: 62,
    city: "Singapore, SG",
    country: "Singapore",
    displayName: "Singapore",
    countDownDate: "2026-10-11T12:00:00Z",
    flag: "sg.webp",
    direction: "ccw",
  },
  "United States Grand Prix": {
    round: 17,
    raceName: "United States Grand Prix",
    circuitName: "Circuit of the Americas",
    date: "2026-10-25",
    localTime: "15:00",
    laps: 56,
    city: "Austin, US",
    country: "USA",
    displayName: "Austin",
    countDownDate: "2026-10-25T20:00:00Z",
    flag: "us.webp",
    direction: "ccw",
  },
  "Mexico Grand Prix": {
    round: 18,
    raceName: "Mexico City Grand Prix",
    circuitName: "Autódromo Hermanos Rodríguez",
    date: "2026-11-01",
    localTime: "14:00",
    laps: 71,
    city: "Mexico City, MX",
    country: "Mexico",
    displayName: "Mexico City",
    countDownDate: "2026-11-01T20:00:00Z",
    flag: "mx.webp",
    direction: "cw",
  },
  "Brazilian Grand Prix": {
    round: 19,
    raceName: "Brazilian Grand Prix",
    circuitName: "Autódromo José Carlos Pace",
    date: "2026-11-08",
    localTime: "14:00",
    laps: 71,
    city: "Sao Paulo, BR",
    country: "Brazil",
    displayName: "Sao Paulo",
    countDownDate: "2026-11-08T17:00:00Z",
    flag: "br.webp",
    direction: "ccw",
  },
  "Las Vegas Grand Prix": {
    round: 20,
    raceName: "Las Vegas Grand Prix",
    circuitName: "Las Vegas Strip Street Circuit",
    date: "2026-11-21",
    localTime: "20:00",
    laps: 50,
    city: "Las Vegas, US",
    country: "USA",
    displayName: "Las Vegas",
    countDownDate: "2026-11-22T04:00:00Z",
    flag: "us.webp",
    direction: "ccw",
  },
  "Qatar Grand Prix": {
    round: 21,
    raceName: "Qatar Grand Prix",
    circuitName: "Lusail International Circuit",
    date: "2026-11-29",
    localTime: "19:00",
    laps: 57,
    city: "Lusail, QA",
    country: "Qatar",
    displayName: "Lusail",
    countDownDate: "2026-11-29T16:00:00Z",
    flag: "qa.webp",
    direction: "cw",
  },
  "Abu Dhabi Grand Prix": {
    round: 22,
    raceName: "Abu Dhabi Grand Prix",
    circuitName: "Yas Marina Circuit",
    date: "2026-12-06",
    localTime: "17:00",
    laps: 58,
    city: "Abu Dhabi, AE",
    country: "UAE",
    displayName: "Abu Dhabi",
    countDownDate: "2026-12-06T13:00:00Z",
    flag: "ae.webp",
    direction: "ccw",
  },
};

const NextRaceSection = () => {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  const [raceStatus, setRaceStatus] = useState("upcoming");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [showTrackTime, setShowTrackTime] = useState(true);

  // Find the next upcoming race
  const nowTime = new Date().getTime();
  const sortedRaces = Object.values(RACES_DATA).sort(
    (a, b) => new Date(a.countDownDate).getTime() - new Date(b.countDownDate).getTime()
  );
  
  const currentRaceData = sortedRaces.find(r => new Date(r.countDownDate).getTime() > nowTime - 2 * 60 * 60 * 1000) || sortedRaces[sortedRaces.length - 1];

  const countDownDate = new Date(currentRaceData.countDownDate).getTime();

  useEffect(() => {
    // Countdown Timer Logic
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = countDownDate - now;
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown({ days, hours, minutes });
        setRaceStatus("upcoming");
      } else if (difference > -TWO_HOURS_MS) {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
        setRaceStatus("running");
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
        setRaceStatus("ended");
        clearInterval(timer);
      }
    }, 1000);

    // Weather Fetching Logic
    const fetchWeather = async () => {
      setLoadingWeather(true);
      try {
        const baseUrl = `https://weather-bar.matthew-delong73.workers.dev/?city=${encodeURIComponent(currentRaceData.city)}&lang=en`;
        
        const [currentResponse, forecastResponse] = await Promise.all([
          fetch(baseUrl),
          fetch(`${baseUrl}&forecast=daily`),
        ]);

        if (currentResponse.ok) {
          const data = await currentResponse.json();
          setWeather({
            temp: Math.round(data.main.temp),
            condition: data.weather[0].main,
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            location: currentRaceData.displayName,
          });
        }

        if (forecastResponse.ok) {
          const forecastData = await forecastResponse.json();
          if (forecastData.daily && forecastData.daily.length > 1) {
            setForecast(
              forecastData.daily.slice(0, 3).map((day) => ({
                dt: day.dt,
                tempMax: Math.round(day.temp.max),
                tempMin: Math.round(day.temp.min),
                condition: day.weather[0].main,
                description: day.weather[0].description,
                icon: day.weather[0].icon,
                pop: Math.round((day.pop ?? 0) * 100),
              })),
            );
          }
        }
      } catch (error) {
        console.error("Weather fetch error:", error);
      } finally {
        setLoadingWeather(false);
      }
    };

    fetchWeather();
    return () => clearInterval(timer);
  }, [currentRaceData, countDownDate]);

  return (
    <section className="min-h-screen snap-start flex flex-col items-center justify-center px-16 bg-black relative pt-[100px] pb-16 overflow-hidden border-t border-neutral-900">
      {/* Background with blurred image and gradient overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/images/bg.png" 
          className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          alt=""
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.8)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-60" />
      </div>

      <div className="max-w-5xl w-full mx-auto z-10">
        <motion.div 
          className="f1-next-race"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="next-race-header text-center py-10">
            <h3>
              <i className="bi bi-calendar-event me-2"></i> Next Race
            </h3>
          </div>

          <div className="next-race-content flex flex-col items-center text-center pt-6 pb-10">
            {/* Flag at the top center */}
            <div className="race-flag mb-6">
              <img
                src={`/images/flags/${currentRaceData.flag}`}
                alt={currentRaceData.country}
                className="country-flag mx-auto"
              />
            </div>

            <div className="race-details w-full">
              <h4 className="mb-2">{currentRaceData.raceName}</h4>
              <p className="race-circuit mb-6">{currentRaceData.circuitName}</p>

              <div className="race-datetime flex flex-col items-center gap-4">
                <div className="time-toggle mb-2">
                  <button
                    className={`time-toggle-btn ${showTrackTime ? "active" : ""}`}
                    onClick={() => setShowTrackTime(true)}
                  >
                    Track Time
                  </button>
                  <button
                    className={`time-toggle-btn ${!showTrackTime ? "active" : ""}`}
                    onClick={() => setShowTrackTime(false)}
                  >
                    Your Time
                  </button>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-10">
                  <span className="race-date">
                    {showTrackTime
                      ? `${new Date(currentRaceData.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}, ${currentRaceData.localTime} Local`
                      : new Date(currentRaceData.countDownDate).toLocaleString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                          timeZoneName: "short",
                        })}
                  </span>
                  <span className="hidden sm:inline opacity-30">•</span>
                  <span className="race-laps">
                    {currentRaceData.laps} Laps
                  </span>
                </div>
              </div>

              {/* Weather Display Area */}
              <div className="race-weather max-w-xl mx-auto mt-8">
                {loadingWeather ? (
                  <div className="weather-loading py-4">
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Loading weather...
                  </div>
                ) : weather ? (
                  <>
                    <span className="weather-title">Current Conditions</span>
                    <div className="flex flex-col items-center gap-4 py-4">
                      <div className="weather-display">
                        <img
                          src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                          alt={weather.condition}
                          className="weather-icon"
                        />
                        <span className="weather-temp">{weather.temp}°C</span>
                        <span className="weather-condition">{weather.condition}</span>
                      </div>

                      {forecast.length > 0 && (
                        <div className="w-full mt-4">
                          <hr className="weather-divider mx-auto" />
                          <div className="weather-forecast justify-center mt-6">
                            {forecast.map((day) => (
                              <div key={day.dt} className="forecast-day">
                                <span className="forecast-label">
                                  {new Date(day.dt * 1000).toLocaleDateString("en-GB", { weekday: "short" })}
                                </span>
                                <img
                                  src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                                  alt={day.condition}
                                  className="forecast-icon"
                                />
                                <span className="forecast-temp">
                                  {day.tempMax}°
                                  <span className="forecast-temp-min">/{day.tempMin}°</span>
                                </span>
                                <span className="forecast-pop mt-2">
                                  {day.pop}% 💧
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="weather-error py-4">Weather data unavailable</div>
                )}
              </div>
            </div>

            {/* Countdown at the bottom center */}
            <div className="race-countdown mt-10 w-full flex justify-center">
              {raceStatus === "upcoming" ? (
                <div className="countdown-timer">
                  <div className="countdown-item">
                    <span className="countdown-value">
                      {String(countdown.days).padStart(2, "0")}
                    </span>
                    <span className="countdown-label">Days</span>
                  </div>
                  <div className="countdown-item">
                    <span className="countdown-value">
                      {String(countdown.hours).padStart(2, "0")}
                    </span>
                    <span className="countdown-label">Hours</span>
                  </div>
                  <div className="countdown-item">
                    <span className="countdown-value">
                      {String(countdown.minutes).padStart(2, "0")}
                    </span>
                    <span className="countdown-label">Mins</span>
                  </div>
                </div>
              ) : (
                <div className="race-status-container mx-auto">
                  <div className={`indicator-dot ${raceStatus}`}></div>
                  <span className="indicator-text">
                    {raceStatus === "running" ? "Race Running" : "Race Ended"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default NextRaceSection;
