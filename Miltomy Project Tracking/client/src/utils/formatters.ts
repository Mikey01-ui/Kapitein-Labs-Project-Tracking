export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function formatHours(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}h`;
}
