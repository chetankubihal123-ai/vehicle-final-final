// src/socket.ts
import { io } from "socket.io-client";
import { WS_URL } from "./config";

// WebSocket connection to backend on Render
export const socket = io(WS_URL, {
  autoConnect: false,
  transports: ["websocket"],
  auth: {
    token: localStorage.getItem("token") || "",
  },
  extraHeaders: {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  },
});
