// src/config.ts

// Production backend (Render)
const PROD_BACKEND = "https://vehicle-final-final.onrender.com";

// Use VITE_API_URL if provided, otherwise fallback to Render backend
export const API_URL = import.meta.env.VITE_API_URL || PROD_BACKEND;

// WebSocket will run on same backend
export const WS_URL = API_URL;

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
