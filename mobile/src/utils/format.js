export const formatClock = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  return [hours, minutes, secs]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
};

export const formatDuration = (seconds) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

export const formatLoad = (value) => {
  const safeValue = Math.max(0, Number(value) || 0);
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}k kg`;
  return `${Math.round(safeValue)} kg`;
};

export const formatDistance = (value) => {
  const safeValue = Math.max(0, Number(value) || 0);
  return `${safeValue.toFixed(safeValue % 1 ? 1 : 0)} km`;
};
