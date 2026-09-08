/**
 * Notification helpers
 * Simple event-based trigger to refresh notification counts after user actions.
 */
export const triggerNotificationRefresh = (): void => {
  window.dispatchEvent(new CustomEvent('notification-refresh'));
};
