// src/config.ts

// Your deployed backend URL on Render
export const API_URL = "https://vehicle-final.onrender.com";

// WebSocket URL (same as API_URL)
export const WS_URL = API_URL;

// Mode flags
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
