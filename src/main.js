const OPENWEATHER_API_KEY = "600f88efdf077eb6a2dcc291eea460d3";
const STORAGE_KEY = "mindAppEntries";
const ONBOARDING_KEY = "mindAppUser";

document.addEventListener("DOMContentLoaded", async () => {

    const stepName = document.getElementById("step-name");
    const stepPin = document.getElementById("step-pin");
    const stepPinConfirm = document.getElementById("step-pin-confirm");

    const userNameInput = document.getElementById("user-name-input");
    const nameNextBtn = document.getElementById("name-next-btn");

    const userPinInput = document.getElementById("user-pin-input");
    const pinNextBtn = document.getElementById("pin-next-btn");

    const userPinConfirmInput = document.getElementById("user-pin-confirm-input");
    const pinConfirmBtn = document.getElementById("pin-confirm-btn");

    const appContainer = document.getElementById("app");

    let tempUserName = "";
    let tempUserPin = "";

    let userData = JSON.parse(localStorage.getItem(ONBOARDING_KEY));

    function encryptData(data, key) {
        return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
    }

    function decryptData(cipherText, key) {

        try {
            const bytes = CryptoJS.AES.decrypt(cipherText, key);
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } catch {
            return null;
        }

    }

    if (!userData) {

        nameNextBtn.addEventListener("click", () => {

            const name = userNameInput.value.trim();
            if (!name) return alert("Please enter your name.");
            tempUserName = name;
            stepName.classList.remove("active");
            stepPin.classList.add("active");
            userPinInput.focus();

        });

        pinNextBtn.addEventListener("click", () => {

            const pin = userPinInput.value.trim();
            if (!/^\d{6}$/.test(pin)) return alert("PIN must be 6 digits.");
            tempUserPin = pin;
            stepPin.classList.remove("active");
            stepPinConfirm.classList.add("active");
            userPinConfirmInput.focus();

        });

        pinConfirmBtn.addEventListener("click", () => {

            const pinConfirm = userPinConfirmInput.value.trim();
            if (pinConfirm !== tempUserPin) {
                alert("PINs do not match. Try again.");
                userPinInput.value = "";
                userPinConfirmInput.value = "";
                stepPin.classList.add("active");
                stepPinConfirm.classList.remove("active");
                userPinInput.focus();
                return;
            }

            localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
                name: tempUserName,
                pin: tempUserPin
            }));

            stepPinConfirm.classList.remove("active");
            appContainer.classList.remove("hidden");
            initApp(tempUserPin);

        });

    } else {

        stepName.classList.remove("active");
        stepPin.classList.remove("active");
        stepPinConfirm.classList.remove("active");
        appContainer.classList.remove("hidden");
        initApp(userData.pin);

    }

    function initApp(userPin) {

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

        let existingEntries = [];
        const encryptedEntries = localStorage.getItem(STORAGE_KEY);
        if (encryptedEntries) {
            existingEntries = decryptData(encryptedEntries, userPin) || [];
        }

        existingEntries.forEach(addEntryToDOM);

        getUserLocation()
            .then(loc => getWeather(loc.latitude, loc.longitude))
            .then(updateWeatherBanner)
            .catch(err => console.error("Failed to fetch weather:", err));

        saveBtn.addEventListener("click", async () => {
            const notes = document.getElementById("entry-notes").value;
            if (!selectedMood) return alert("Please select a mood!");

            try {
                const loc = await getUserLocation();
                const weather = await getWeather(loc.latitude, loc.longitude);

                const entry = {
                    mood: selectedMood,
                    notes: notes || "-",
                    timestamp: new Date().toISOString(),
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    weatherData: weather
                };

                existingEntries.push(entry);
                localStorage.setItem(STORAGE_KEY, encryptData(existingEntries, userPin));

                addEntryToDOM(entry);

                modal.classList.add("hidden");
                moodButtons.forEach(b => b.classList.remove("selected"));
                document.getElementById("entry-notes").value = "";
                selectedMood = null;
            } catch (err) {
                console.error(err);
                alert("Could not get location or weather.");
            }
        });

        function addEntryToDOM(entry) {

            const weather = entry.weatherData || {name:"--", weather:"--", icon:"☁️", temp:"--", humidity:"--", wind:"--"};
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
                if (!navigator.geolocation) reject("Geolocation not supported");
                else navigator.geolocation.getCurrentPosition(
                    pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                    err => reject(err)
                );
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

            navigator.serviceWorker.register("./service-worker.js")
                .then(reg => console.log("SW registered", reg))
                .catch(err => console.error("SW registration failed:", err));
                
        }
    }
});
