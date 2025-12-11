document.addEventListener("DOMContentLoaded", () => {
    // Modal Elements
    const modal = document.getElementById("add-entry-modal");
    const openBtn = document.getElementById("add-entry-btn");
    const cancelBtn = document.getElementById("cancel-entry-btn");
    const saveBtn = document.getElementById("save-entry-btn");
    const entriesList = document.getElementById("entries-list");

    // Open modal
    openBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
    });

    // Close modal
    cancelBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // Mood selection
    const moodButtons = document.querySelectorAll(".mood-btn");
    let selectedMood = null;

    moodButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            moodButtons.forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            selectedMood = btn.dataset.mood;
        });
    });

    // Save Entry (placeholder logic)
    saveBtn.addEventListener("click", () => {
        const notes = document.getElementById("entry-notes").value;

        if (!selectedMood) {
            alert("Please select a mood!");
            return;
        }

        // Create a simple entry card (later we will encrypt & store)
        const entryDiv = document.createElement("div");
        entryDiv.className = "entry-card";
        entryDiv.innerHTML = `
            <strong>Mood:</strong> ${selectedMood} <br/>
            <strong>Notes:</strong> ${notes || "-"} <br/>
            <small>${new Date().toLocaleString()}</small>
        `;
        entriesList.prepend(entryDiv);

        // Reset modal
        modal.classList.add("hidden");
        moodButtons.forEach(b => b.classList.remove("selected"));
        document.getElementById("entry-notes").value = "";
        selectedMood = null;
    });

    // Register Service Worker
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/service-worker.js")
            .then(reg => console.log("SW registered", reg))
            .catch(err => console.error("SW registration failed:", err));
    }
});
