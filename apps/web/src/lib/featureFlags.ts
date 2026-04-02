export const azhotelFullEnabled =
  (import.meta.env.VITE_AZHOTEL_FULL ?? "true").toLowerCase() !== "false";

function isEnabled(value: string | undefined) {
  return (value ?? "true").toLowerCase() !== "false";
}

export const azhotelRoomsEnabled =
  azhotelFullEnabled && isEnabled(import.meta.env.VITE_AZHOTEL_ROOMS_ENABLED);

export const azhotelBookingsEnabled =
  azhotelFullEnabled && isEnabled(import.meta.env.VITE_AZHOTEL_BOOKINGS_ENABLED);

export const azhotelFrontdeskEnabled =
  azhotelFullEnabled && isEnabled(import.meta.env.VITE_AZHOTEL_FRONTDESK_ENABLED);

export const azhotelHousekeepingEnabled =
  azhotelFullEnabled && isEnabled(import.meta.env.VITE_AZHOTEL_HOUSEKEEPING_ENABLED);

export const azhotelDashboardEnabled =
  azhotelFullEnabled && isEnabled(import.meta.env.VITE_AZHOTEL_DASHBOARD_ENABLED);

export const azhotelReportsEnabled =
  azhotelFullEnabled && isEnabled(import.meta.env.VITE_AZHOTEL_REPORTS_ENABLED);

export const azhotelChannelManagerEnabled =
  azhotelFullEnabled && isEnabled(import.meta.env.VITE_AZHOTEL_CHANNEL_MANAGER_ENABLED);
