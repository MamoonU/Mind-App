const OPENWEATHER_API_KEY = "600f88efdf077eb6a2dcc291eea460d3";
const STORAGE_KEY = "mindAppEntries";

document.addEventListener("DOMContentLoaded", async () => {
    const modal = document.getElementById("add-entry-modal");
    const openBtn = document.getElementById("add-entry-btn");
    const cancelBtn = document.getElementById("cancel-entry-btn");
    const saveBtn = document.getElementById("save-entry-btn");
    const entriesList = document.getElementById("entries-list");

    const weatherLocationEl = document.getElementById("weather-location");
    const weatherIconEl = document.getElementById("weather-icon");
    const weatherDescEl = document.getElementById("weather-desc");
    const weatherTempEl = document.getElementById("weather-temp");
    const weatherHumidityEl = document.getElementById("weather-humidity");
    const weatherWindEl = document.getElementById("weather-wind");

    openBtn.addEventListener("click", () => modal.classList.remove("hidden"));
    cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));

    const moodButtons = document.querySelectorAll(".mood-btn");
    let selectedMood = null;
    moodButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            moodButtons.forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            selectedMood = btn.dataset.mood;
        });
    });

    let existingEntries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    existingEntries = existingEntries.map(entry => ({
        ...entry,
        weatherData: entry.weatherData || {
            name: "--",
            weather: "--",
            icon: "☁️",
            temp: "--",
            humidity: "--",
            wind: "--"
        }
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingEntries));

    existingEntries.forEach(addEntryToDOM);

    try {
        const location = await getUserLocation();
        const weather = await getWeather(location.latitude, location.longitude);
        updateWeatherBanner(weather);
    } catch (err) {
        console.error("Failed to fetch weather for banner:", err);
    }

    saveBtn.addEventListener("click", async () => {
        const notes = document.getElementById("entry-notes").value;

        if (!selectedMood) {
            alert("Please select a mood!");
            return;
        }

        try {
            const location = await getUserLocation();
            const weather = await getWeather(location.latitude, location.longitude);

            const entry = {
                mood: selectedMood,
                notes: notes || "-",
                timestamp: new Date().toISOString(),
                latitude: location.latitude,
                longitude: location.longitude,
                weatherData: weather
            };

            existingEntries.push(entry);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(existingEntries));
            addEntryToDOM(entry);

            modal.classList.add("hidden");
            moodButtons.forEach(b => b.classList.remove("selected"));
            document.getElementById("entry-notes").value = "";
            selectedMood = null;

        } catch (err) {
            console.error("Failed to get location or weather:", err);
            alert("Could not get location or weather. Make sure permissions are granted.");
        }
    });

    function addEntryToDOM(entry) {
        const weather = entry.weatherData || {
            name: "--",
            weather: "--",
            icon: "☁️",
            temp: "--",
            humidity: "--",
            wind: "--"
        };

        const entryDiv = document.createElement("div");
        entryDiv.className = "entry-card";
        entryDiv.innerHTML = `
            <strong>Mood:</strong> ${entry.mood} <br/>
            <strong>Notes:</strong> ${entry.notes} <br/>
            <strong>Location:</strong> ${weather.name} <br/>
            <strong>Weather:</strong> ${weather.weather} <br/>
            <strong>Temp:</strong> ${weather.temp}°C <br/>
            <strong>Humidity:</strong> ${weather.humidity}% <br/>
            <strong>Wind:</strong> ${weather.wind} m/s <br/>
            <small>${new Date(entry.timestamp).toLocaleString()}</small>
        `;
        entriesList.prepend(entryDiv);
    }

    function updateWeatherBanner(weather) {
        weatherLocationEl.textContent = weather.name;
        weatherIconEl.textContent = weather.icon;
        weatherDescEl.textContent = weather.weather;
        weatherTempEl.textContent = `${weather.temp}°C`;
        weatherHumidityEl.textContent = `${weather.humidity}%`;
        weatherWindEl.textContent = `${weather.wind} m/s`;
    }

    function getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject("Geolocation not supported");
            } else {
                navigator.geolocation.getCurrentPosition(
                    pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                    err => reject(err)
                );
            }
        });
    }

    async function getWeather(lat, lon) {
        const url = `http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Weather API failed");
        const data = await res.json();
        return {
            name: data.name,
            weather: data.weather[0].description,
            icon: mapIconToEmoji(data.weather[0].icon),
            temp: data.main.temp,
            humidity: data.main.humidity,
            wind: data.wind.speed
        };
    }

    function mapIconToEmoji(icon) {
        if (icon.startsWith("01")) return "☀️";
        if (icon.startsWith("02")) return "⛅";
        if (icon.startsWith("03") || icon.startsWith("04")) return "☁️";
        if (icon.startsWith("09") || icon.startsWith("10")) return "🌧️";
        if (icon.startsWith("11")) return "⛈️";
        if (icon.startsWith("13")) return "❄️";
        if (icon.startsWith("50")) return "🌫️";
        return "🌈";
    }

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/service-worker.js")
            .then(reg => console.log("SW registered", reg))
            .catch(err => console.error("SW registration failed:", err));
    }
});
