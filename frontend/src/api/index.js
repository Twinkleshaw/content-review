import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// Attach the current user's ID to every request (role switcher)
api.interceptors.request.use((config) => {
  const userId = localStorage.getItem("currentUserId");
  if (userId) {
    config.headers["x-user-id"] = userId;
  }
  return config;
});

export default api;
