import { useEffect } from 'react';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  useEffect(() => {
    // Ensure frameworkReady is defined as a function if it doesn't exist
    if (typeof window.frameworkReady !== 'function') {
      window.frameworkReady = () => {};
    }
    
    // Call frameworkReady to signal Expo Router that the app is ready
    window.frameworkReady();
  }, []); // Empty dependency array ensures this runs only once
}