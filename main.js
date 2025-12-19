const OPENWEATHER_API_KEY = "600f88efdf077eb6a2dcc291eea460d3";
const STORAGE_KEY = "mindAppEntries";
const ONBOARDING_KEY = "mindAppUser";

document.addEventListener("DOMContentLoaded", () => {

    /* -------------------- ELEMENTS -------------------- */

    const stepName = document.getElementById("step-name");
    const stepPin = document.getElementById("step-pin");
    const stepPinConfirm = document.getElementById("step-pin-confirm");

    const userNameInput = document.getElementById("user-name-input");
    const userPinInput = document.getElementById("user-pin-input");
    const userPinConfirmInput = document.getElementById("user-pin-confirm-input");

    const nameNextBtn = document.getElementById("name-next-btn");
    const pinNextBtn = document.getElementById("pin-next-btn");
    const pinConfirmBtn = document.getElementById("pin-confirm-btn");

    const appContainer = document.getElementById("app");
    const loadingOverlay = document.getElementById("loading-overlay");

    const storedUser = JSON.parse(localStorage.getItem(ONBOARDING_KEY));

    let tempUserName = "";
    let tempUserPin = "";

    /* -------------------- LOADING HELPERS -------------------- */

    function showLoading() {
        loadingOverlay.classList.remove("hidden");
    }

    function hideLoading() {
        loadingOverlay.classList.add("hidden");
    }

    /* -------------------- ENCRYPTION -------------------- */

    function encryptData(data, key) {
        return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
    }

    function decryptData(cipher, key) {
        try {
            const bytes = CryptoJS.AES.decrypt(cipher, key);
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } catch {
            return null;
        }
    }

    /* -------------------- ONBOARDING -------------------- */

    if (!storedUser) {

        nameNextBtn.onclick = () => {
            const name = userNameInput.value.trim();
            if (!name) return alert("Enter your name");
            tempUserName = name;
            stepName.classList.remove("active");
            stepPin.classList.add("active");
        };

        pinNextBtn.onclick = () => {
            const pin = userPinInput.value.trim();
            if (!/^\d{6}$/.test(pin)) return alert("PIN must be 6 digits");
            tempUserPin = pin;
            stepPin.classList.remove("active");
            stepPinConfirm.classList.add("active");
        };

        pinConfirmBtn.onclick = () => {
            if (userPinConfirmInput.value !== tempUserPin) {
                return alert("PINs do not match");
            }

            localStorage.setItem(
                ONBOARDING_KEY,
                JSON.stringify({ name: tempUserName, pin: tempUserPin })
            );

            stepPinConfirm.classList.remove("active");
            appContainer.classList.remove("hidden");
            initApp(tempUserPin);
        };

    } else {
        stepName.classList.remove("active");
        stepPin.classList.remove("active");
        stepPinConfirm.classList.remove("active");
        appContainer.classList.remove("hidden");
        initApp(storedUser.pin);
    }

    /* -------------------- MAIN APP -------------------- */

    function initApp(userPin) {

        const modal = document.getElementById("add-entry-modal");
        const addBtn = document.getElementById("add-entry-btn");
        const cancelBtn = document.getElementById("cancel-entry-btn");
        const saveBtn = document.getElementById("save-entry-btn");
        const shareBtn = document.getElementById("share-data-btn");
        const entriesList = document.getElementById("entries-list");

        const moodButtons = document.querySelectorAll(".mood-btn");
        let selectedMood = null;

        addBtn.onclick = () => modal.classList.remove("hidden");
        cancelBtn.onclick = () => {
            modal.classList.add("hidden");
            selectedMood = null;
            moodButtons.forEach(b => b.classList.remove("selected"));
            document.getElementById("entry-notes").value = "";
        };

        moodButtons.forEach(btn => {
            btn.onclick = () => {
                moodButtons.forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                selectedMood = btn.dataset.mood;
            };
        });

        /* -------------------- LOAD ENTRIES -------------------- */

        let entries = [];
        const encrypted = localStorage.getItem(STORAGE_KEY);
        if (encrypted) {
            entries = decryptData(encrypted, userPin) || [];
            entries.forEach(addEntryToDOM);
        }

        /* -------------------- SAVE ENTRY -------------------- */

        saveBtn.onclick = async () => {
            if (!selectedMood) return alert("Select a mood");

            const notes = document.getElementById("entry-notes").value || "-";
            
            // Show loading immediately
            showLoading();

            try {
                const loc = await getUserLocation();
                const weather = await getWeather(loc.latitude, loc.longitude);

                const entry = {
                    mood: selectedMood,
                    notes,
                    timestamp: new Date().toISOString(),
                    weatherData: weather
                };

                entries.push(entry);
                localStorage.setItem(STORAGE_KEY, encryptData(entries, userPin));
                addEntryToDOM(entry);

                modal.classList.add("hidden");
                selectedMood = null;
                moodButtons.forEach(b => b.classList.remove("selected"));
                document.getElementById("entry-notes").value = "";

            } catch (error) {
                console.error("Error:", error);
                alert("Could not get location or weather. Please enable location access.");
            } finally {
                hideLoading();
            }
        };

        /* -------------------- SHARE -------------------- */

        shareBtn.onclick = async () => {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return alert("No data");

            if (navigator.share) {
                try {
                    await navigator.share({ title: "Encrypted Data", text: data });
                } catch (error) {
                    console.error("Share error:", error);
                }
            } else {
                await navigator.clipboard.writeText(data);
                alert("Copied to clipboard");
            }
        };

        /* -------------------- WEATHER -------------------- */

        showLoading();
        getUserLocation()
            .then(loc => getWeather(loc.latitude, loc.longitude))
            .then(w => updateWeather(w))
            .catch((error) => {
                console.error("Weather error:", error);
            })
            .finally(() => hideLoading());

        function updateWeather(w) {
            document.getElementById("weather-location").textContent = w.name;
            document.getElementById("weather-icon").textContent = w.icon;
            document.getElementById("weather-desc").textContent = w.weather;
            document.getElementById("weather-temp").textContent = `${w.temp}°C`;
            document.getElementById("weather-humidity").textContent = `${w.humidity}%`;
            document.getElementById("weather-wind").textContent = `${w.wind} m/s`;
        }

        function addEntryToDOM(entry) {
            const card = document.createElement("div");
            card.className = "entry-card";
            card.innerHTML = `
                <div class="entry-notes">${entry.notes}</div>
                <div class="entry-row">
                    <div class="entry-box">${moodToEmoji(entry.mood)}</div>
                    <div class="entry-box">${entry.weatherData.icon} ${entry.weatherData.temp}°C</div>
                    <div class="entry-box">💧 ${entry.weatherData.humidity}%</div>
                    <div class="entry-box">🌬️ ${entry.weatherData.wind} m/s</div>
                </div>
                <div class="entry-meta">${entry.weatherData.name} • ${new Date(entry.timestamp).toLocaleString()}</div>
            `;
            entriesList.prepend(card);
        }

        function moodToEmoji(m) {
            return {
                ecstatic: "🤣",
                happy: "😊",
                neutral: "😐",
                sad: "☹️",
                depressed: "😭"
            }[m];
        }

        function getUserLocation() {
            return new Promise((res, rej) =>
                navigator.geolocation.getCurrentPosition(
                    p => res(p.coords),
                    e => rej(e),
                    { enableHighAccuracy: true, timeout: 10000 }
                )
            );
        }

        async function getWeather(lat, lon) {
            const r = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
            );
            const d = await r.json();
            return {
                name: d.name,
                weather: d.weather[0].description,
                icon: mapIcon(d.weather[0].icon),
                temp: Math.round(d.main.temp),
                humidity: d.main.humidity,
                wind: d.wind.speed.toFixed(1)
            };
        }

        function mapIcon(i) {
            if (i.startsWith("01")) return "☀️";
            if (i.startsWith("02")) return "⛅";
            if (i.startsWith("03") || i.startsWith("04")) return "☁️";
            if (i.startsWith("09") || i.startsWith("10")) return "🌧️";
            if (i.startsWith("11")) return "⛈️";
            if (i.startsWith("13")) return "❄️";
            return "🌫️";
        }

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("./service-worker.js").catch(err => {
                console.error("Service worker registration failed:", err);
            });
        }
    }
});