import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { router } from "./router";
import { AuthProvider } from "./state/authStore";
import { HotelStoreProvider } from "./state/hotelStore";
import "./styles.css";

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });
} else {
  registerSW({ immediate: true });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <HotelStoreProvider>
        <RouterProvider router={router} />
      </HotelStoreProvider>
    </AuthProvider>
  </React.StrictMode>,
);
