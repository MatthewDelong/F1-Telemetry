import React, { useEffect, useState } from "react";
import classNames from "classnames";
import { fetchWithPersistentCache } from "../utils/api";
import { buildOpenF1Url } from "../config/openf1";

export function WeatherDetails({ sessionKey, speedUnit = "mph" }) {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tempUnit, setTempUnit] = useState("C");

  const formatTemp = (celsius) => {
    if (tempUnit === "F") {
      return (celsius * 9 / 5 + 32).toFixed(1);
    }
    return celsius;
  };

  useEffect(() => {
    if (!sessionKey) return;
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const url = `${buildOpenF1Url("/weather")}?session_key=${sessionKey}`;
        const data = await fetchWithPersistentCache(url);
        if (data && data.length > 0) {
          // Get the latest weather reading
          setWeatherData(data[data.length - 1]);
        }
      } catch (err) {
        console.error("Failed to fetch weather", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, [sessionKey]);

  if (loading) {
    return <div className="text-center p-8 text-neutral-400">Loading weather...</div>;
  }
  
  if (!weatherData) {
    return <div className="text-center p-8 text-neutral-400">No weather data available for this session.</div>;
  }

  const isRain = weatherData.rainfall === 1;
  const condition = isRain ? "Wet" : "Dry";
  
  let windSpeed = weatherData.wind_speed;
  let displaySpeedUnit = speedUnit;
  if (speedUnit === "mph") {
    windSpeed = (windSpeed * 2.23694).toFixed(1);
  } else {
    windSpeed = (windSpeed * 3.6).toFixed(1);
  }

  return (
    <div className="bg-[#151515] border border-neutral-800 rounded-md overflow-hidden max-w-sm mx-auto my-8">
      <div className="flex justify-between items-center px-16 py-12 border-b border-neutral-800">
        <div className="flex items-center gap-12">
          <h3 className="text-white font-display text-lg tracking-wider">Weather</h3>
          <span className="text-neutral-400 text-sm bg-neutral-900 px-8 py-2 rounded-full border border-neutral-800">{condition}</span>
        </div>
        <div className="flex bg-neutral-900 rounded-sm p-[2px] border border-neutral-800">
          <button
            onClick={() => setTempUnit("C")}
            className={classNames("px-8 py-4 rounded-sm text-xs font-display transition-all leading-none", {
              "bg-white text-black": tempUnit === "C",
              "text-neutral-500 hover:text-white": tempUnit !== "C"
            })}
          >
            °C
          </button>
          <button
            onClick={() => setTempUnit("F")}
            className={classNames("px-8 py-4 rounded-sm text-xs font-display transition-all leading-none", {
              "bg-white text-black": tempUnit === "F",
              "text-neutral-500 hover:text-white": tempUnit !== "F"
            })}
          >
            °F
          </button>
        </div>
      </div>
      <div className="p-24">
        <div className="flex justify-center mb-32">
          {isRain ? (
            <span className="text-8xl drop-shadow-[0_0_15px_rgba(100,150,255,0.4)] leading-none">🌧️</span>
          ) : (
            <span className="text-8xl drop-shadow-[0_0_15px_rgba(255,183,77,0.4)] leading-none">☀️</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-y-24 gap-x-16">
          <div>
            <div className="text-neutral-500 text-xs tracking-wider uppercase mb-4 font-display">Air Temp</div>
            <div className="text-white text-2xl font-display">{formatTemp(weatherData.air_temperature)}°{tempUnit}</div>
          </div>
          <div>
            <div className="text-neutral-500 text-xs tracking-wider uppercase mb-4 font-display">Track Temp</div>
            <div className="text-white text-2xl font-display">{formatTemp(weatherData.track_temperature)}°{tempUnit}</div>
          </div>
          <div>
            <div className="text-neutral-500 text-xs tracking-wider uppercase mb-4 font-display">Humidity</div>
            <div className="text-white text-2xl font-display">{weatherData.humidity}%</div>
          </div>
          <div>
            <div className="text-neutral-500 text-xs tracking-wider uppercase mb-4 font-display">Wind</div>
            <div className="text-white text-2xl font-display">{windSpeed} {displaySpeedUnit}</div>
          </div>
          <div>
            <div className="text-neutral-500 text-xs tracking-wider uppercase mb-4 font-display">Pressure</div>
            <div className="text-white text-2xl font-display">{weatherData.pressure} hPa</div>
          </div>
          <div>
            <div className="text-neutral-500 text-xs tracking-wider uppercase mb-4 font-display">Rainfall</div>
            <div className="text-white text-2xl font-display">{isRain ? "Yes" : "No"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
