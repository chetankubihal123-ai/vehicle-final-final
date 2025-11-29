// API Configuration
// Using local IP address for mobile testing
//export const API_URL = "http://localhost:5000/api";
export const API_URL = import.meta.env.VITE_API_URL || "https://vehicle-final-final.onrender.com/api";
// WebSocket URL
export const WS_URL = API_URL;

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
