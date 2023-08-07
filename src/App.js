import React from "react";
import { useEffect, useState } from "react";

function getWeatherIcon(wmoCode) {
  const icons = new Map([
    [[0], "☀️"],
    [[1], "🌤"],
    [[2], "⛅️"],
    [[3], "☁️"],
    [[45, 48], "🌫"],
    [[51, 56, 61, 66, 80], "🌦"],
    [[53, 55, 63, 65, 57, 67, 81, 82], "🌧"],
    [[71, 73, 75, 77, 85, 86], "🌨"],
    [[95], "🌩"],
    [[96, 99], "⛈"],
  ]);
  const arr = [...icons.keys()].find((key) => key.includes(wmoCode));
  if (!arr) return "NOT FOUND";
  return icons.get(arr);
}

function convertToFlag(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function formatDay(dateStr) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
  }).format(new Date(dateStr));
}

export default function App() {
  const [location, setLocation] = useState(
    () => localStorage.getItem("location") || ""
  );
  const [displayLocation, setDisplayLocation] = useState("");
  const [weather, setWeather] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(
    function () {
      if (location.length === 0) {
        setDisplayLocation("");
        setWeather({});
      }

      if (location.length < 2) return;

      async function getWeather(location) {
        try {
          setError("");
          setIsLoading(true);

          // 1) Getting location (geocoding)
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${location}`
          );
          const geoData = await geoRes.json();

          if (!geoData.results) throw new Error("Location not found");

          const { latitude, longitude, timezone, name, country_code } =
            geoData.results.at(0);
          // console.log(`${name} ${convertToFlag(country_code)}`);
          setDisplayLocation(`${name} ${convertToFlag(country_code)}`);

          // 2) Getting actual weather
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`
          );
          const weatherData = await weatherRes.json();
          setWeather(weatherData.daily);
        } catch (err) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      }

      getWeather(location);
    },
    [location]
  );

  return (
    <div className="app">
      <h1>Classy Weather</h1>

      <Search query={location} onSetQuery={setLocation} />

      {isLoading && <Loader />}
      {displayLocation && !isLoading && (
        <>
          <DisplayLocation displayLocation={displayLocation} error={error} />
          <WeatherDays weather={weather} />
        </>
      )}
    </div>
  );
}

function Loader() {
  return <p className="loader">Loading...</p>;
}

function Search({ query, onSetQuery }) {
  function handleSetQuery(e) {
    onSetQuery(e.target.value);
    localStorage.setItem("location", e.target.value);
  }

  return (
    <input
      type="text"
      value={query}
      onChange={handleSetQuery}
      plalceholder="Search from location..."
    />
  );
}

function DisplayLocation({ displayLocation, error }) {
  return <h2>{error ? error : `Weather for ${displayLocation}`}</h2>;
}

function WeatherDays({ weather }) {
  const {
    temperature_2m_max: max,
    temperature_2m_min: min,
    time: dates,
    weathercode: codes,
  } = weather;

  return (
    <ul className="weather">
      {dates.map((date, i) => (
        <Day
          max={max.at(i)}
          min={min.at(i)}
          date={date}
          code={codes.at(i)}
          key={date}
        />
      ))}
    </ul>
  );
}

function Day({ max, min, date, code }) {
  const currentDay = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(new Date());

  return (
    <li className="day">
      <span>{getWeatherIcon(code)}</span>
      <p>
        {formatDay(date).toLowerCase() === currentDay.toLowerCase()
          ? "Today"
          : formatDay(date)}
      </p>
      <p>
        {Math.floor(min)}&deg; &mdash; <strong>{Math.ceil(max)}&deg;</strong>
      </p>
    </li>
  );
}
