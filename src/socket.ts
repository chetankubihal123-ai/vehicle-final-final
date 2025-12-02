import { io } from "socket.io-client";
import { API_URL } from "./config";

// Use backend for WebSocket
export const socket = io(API_URL, {
  autoConnect: false,
  transports: ["websocket"],
  auth: (cb) => {
    const token = localStorage.getItem("token");
    cb({ token });
  },
  extraHeaders: {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`
  }
});
