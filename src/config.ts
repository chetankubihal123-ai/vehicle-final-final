// src/config.ts

// Laptop IPv4 + backend port
const LOCAL_BACKEND = "https://vehicle-final.onrender.com";

export const API_URL = import.meta.env.VITE_API_URL || LOCAL_BACKEND;
export const WS_URL = API_URL;

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
