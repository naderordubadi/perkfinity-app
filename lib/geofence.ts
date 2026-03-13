"use client";

// Simple geofencing simulation
// In a real app, this would use the Background Geolocation API or a Service Worker

export async function checkNearbyPerks(latitude: number, longitude: number) {
  console.log(`Checking geofence for position: ${latitude}, ${longitude}`);
  
  // Simulate a fetch from our database (lib/db.ts)
  // For demo, we'll return a hardcoded "detection" if the user is in a certain range
  
  // Distance calculation (Haversine formula placeholder)
  const isNearArtisanTailor = true; // Simulated detection

  if (isNearArtisanTailor) {
    triggerNotification(
      "Artisan Tailor Shop is Nearby!",
      "You have an exclusive 20% discount waiting. Tap to view."
    );
  }
}

function triggerNotification(title: string, body: string) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/assets/logo.png" });
  }
}
