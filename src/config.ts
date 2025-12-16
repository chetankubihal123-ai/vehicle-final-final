// src/config.ts

// Your deployed backend URL on Render
// Automatically switch between localhost and Render based on environment
export const API_URL = import.meta.env.DEV
    ? "http://localhost:5000"
    : "https://vehicle-final.onrender.com";

// WebSocket URL (same as API_URL)
export const WS_URL = API_URL;

// Mode flags
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
