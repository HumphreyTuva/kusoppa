import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth";
import Boundary from "./components/Boundary";
import { InfoProvider } from "./info";
import "./styles.css";
import "./admin/admin.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("KUSOPPA service worker registration failed:", error);
    });
  });
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Boundary>
      <BrowserRouter>
        <AuthProvider>
          <InfoProvider>
            <App />
          </InfoProvider>
        </AuthProvider>
      </BrowserRouter>
    </Boundary>
  </React.StrictMode>
);
