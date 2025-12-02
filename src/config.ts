// src/config.ts

// Laptop IPv4 + backend port
const LOCAL_BACKEND = "http://10.29.71.71:5000";

export const API_URL = import.meta.env.VITE_API_URL || LOCAL_BACKEND;
export const WS_URL = API_URL;

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
