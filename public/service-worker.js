// Basic service worker for PWA

self.addEventListener("install", event => {
    console.log("Service Worker: Installed");
    self.skipWaiting(); // Activate SW immediately
});

self.addEventListener("activate", event => {
    console.log("Service Worker: Activated");
    clients.claim();
});

self.addEventListener("fetch", event => {
    // Default: just pass through requests
    // Later, caching strategies can be added here
});
