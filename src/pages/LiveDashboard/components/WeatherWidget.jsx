import React from 'react';

export default function WeatherWidget({ weather, useCelsius = true, useKmh = false }) {
  if (!weather) {
    return (
      <div className="weather-widget">
        <div className="weather-item">
          <div className="weather-icon">🌡️</div>
          <div className="weather-value">—</div>
          <div className="weather-label">Air Temp</div>
        </div>
        <div className="weather-item">
          <div className="weather-icon">🛤️</div>
          <div className="weather-value">—</div>
          <div className="weather-label">Track Temp</div>
        </div>
        <div className="weather-item">
          <div className="weather-icon">💧</div>
          <div className="weather-value">—</div>
          <div className="weather-label">Humidity</div>
        </div>
        <div className="weather-item">
          <div className="weather-icon">💨</div>
          <div className="weather-value">—</div>
          <div className="weather-label">Wind</div>
        </div>
        <div className="weather-item">
          <div className="weather-icon">🌧️</div>
          <div className="weather-value">—</div>
          <div className="weather-label">Rainfall</div>
        </div>
        <div className="weather-item">
          <div className="weather-icon">🧭</div>
          <div className="weather-value">—</div>
          <div className="weather-label">Pressure</div>
        </div>
      </div>
    );
  }

  const isRaining = weather.rainfall > 0;
  const weatherIcon = isRaining ? '🌧️' : '☀️';

  return (
    <div className="weather-widget">
      <div className="weather-item">
        <div className="weather-icon">🌡️</div>
        <div className="weather-value">{weather.air_temperature != null ? (useCelsius ? `${weather.air_temperature}°C` : `${Math.round(weather.air_temperature * 9/5 + 32)}°F`) : '—'}</div>
        <div className="weather-label">Air Temp</div>
      </div>
      <div className="weather-item">
        <div className="weather-icon">🛤️</div>
        <div className="weather-value">{weather.track_temperature != null ? (useCelsius ? `${weather.track_temperature}°C` : `${Math.round(weather.track_temperature * 9/5 + 32)}°F`) : '—'}</div>
        <div className="weather-label">Track Temp</div>
      </div>
      <div className="weather-item">
        <div className="weather-icon">💧</div>
        <div className="weather-value">{weather.humidity != null ? `${weather.humidity}%` : '—'}</div>
        <div className="weather-label">Humidity</div>
      </div>
      <div className="weather-item">
        <div className="weather-icon">💨</div>
        <div className="weather-value">
          {weather.wind_speed != null ? (useKmh ? `${(weather.wind_speed * 3.6).toFixed(1)} km/h` : `${(weather.wind_speed * 2.23694).toFixed(1)} mph`) : '—'}
        </div>
        <div className="weather-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          Wind 
          {weather.wind_direction != null && (
            <span style={{ 
              display: 'inline-block', 
              transform: `rotate(${weather.wind_direction + 180}deg)`,
              fontSize: '0.85rem'
            }}>↑</span>
          )}
        </div>
      </div>
      <div className="weather-item">
        <div className="weather-icon">{weatherIcon}</div>
        <div className="weather-value" style={{ color: isRaining ? 'var(--status-blue)' : 'var(--status-green)' }}>
          {isRaining ? 'Yes' : 'No'}
        </div>
        <div className="weather-label">Rainfall</div>
      </div>
      <div className="weather-item">
        <div className="weather-icon">🧭</div>
        <div className="weather-value">{weather.pressure != null ? `${weather.pressure}` : '—'}</div>
        <div className="weather-label">Pressure (mbar)</div>
      </div>
    </div>
  );
}
