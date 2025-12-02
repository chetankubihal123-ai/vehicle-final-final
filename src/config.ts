// src/config.ts

// Render backend URL
const PROD_BACKEND = "https://vehicle-final.onrender.com";

export const API_URL = import.meta.env.VITE_API_URL || PROD_BACKEND;
export const WS_URL = API_URL;

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
