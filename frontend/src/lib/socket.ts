import { io } from "socket.io-client";

// Make sure your backend is running on 8080!
export const socket = io("http://localhost:8080");