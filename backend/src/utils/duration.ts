import dayjs from "dayjs";

const unitMap = {
  m: "minute",
  h: "hour",
  d: "day"
} satisfies Record<string, dayjs.ManipulateType>;

export function addDurationFromNow(ttl: string, fallbackDays = 30) {
  const match = ttl.match(/^(\d+)([mhd])$/i);
  if (!match) {
    return dayjs().add(fallbackDays, "day").toDate();
  }

  const amount = Number(match[1]);
  const unitKey = match[2].toLowerCase() as keyof typeof unitMap;
  return dayjs().add(amount, unitMap[unitKey]).toDate();
}

export function durationToMilliseconds(ttl: string, fallbackDays = 30) {
  const expiryDate = addDurationFromNow(ttl, fallbackDays);
  return Math.max(0, expiryDate.getTime() - Date.now());
}
