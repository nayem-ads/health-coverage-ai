declare global {
  interface Window {
    dataLayer?: any[];
  }
}

/**
 * Utility to safely push custom events and parameters to Google Tag Manager's dataLayer.
 * Works seamlessly in React / Single Page Applications.
 */
export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...eventParams,
    });
    console.log(`[Tracking] Event: ${eventName}`, eventParams);
  }
};
