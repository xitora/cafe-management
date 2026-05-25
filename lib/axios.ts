import axios from "axios";

export const apiClient = axios.create();

let intervalId: NodeJS.Timeout | null = null;
let currentProgress = 0;
let activeRequests = 0;

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    activeRequests++;
    
    if (activeRequests === 1) {
      currentProgress = 0;
      if (intervalId) clearInterval(intervalId);
      
      intervalId = setInterval(() => {
        // 부드럽게 증가하되 90%에서 멈춤
        currentProgress += (90 - currentProgress) * 0.15;
        if (currentProgress > 90) currentProgress = 90;
        window.dispatchEvent(
          new CustomEvent("api-progress", { detail: { progress: Math.round(currentProgress) } })
        );
      }, 200);
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (typeof window !== "undefined") {
      activeRequests--;
      if (activeRequests === 0) {
        if (intervalId) clearInterval(intervalId);
        currentProgress = 100;
        window.dispatchEvent(
          new CustomEvent("api-progress", { detail: { progress: 100 } })
        );
      }
    }
    return response;
  },
  (error) => {
    if (typeof window !== "undefined") {
      activeRequests--;
      if (activeRequests === 0) {
        if (intervalId) clearInterval(intervalId);
        currentProgress = 100;
        window.dispatchEvent(
          new CustomEvent("api-progress", { detail: { progress: 100 } })
        );
      }
    }
    return Promise.reject(error);
  }
);
