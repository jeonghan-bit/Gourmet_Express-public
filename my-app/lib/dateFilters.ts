import { DateTime } from "luxon";
import { STORE_CONFIG } from "@/lib/storeConfig";

export const STORE_TIME_ZONE = STORE_CONFIG.timeZone;

export function getTorontoTodayStart(): Date {
  return DateTime.now().setZone(STORE_TIME_ZONE).startOf("day").toJSDate();
}

export function getNextTorontoDayStart(date: Date): Date {
  return DateTime.fromJSDate(date)
    .setZone(STORE_TIME_ZONE)
    .startOf("day")
    .plus({ days: 1 })
    .toJSDate();
}

export function parseTorontoDateFilter(value: string | null): Date | undefined {
  if (!value) return undefined;

  const datePart = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!datePart) return undefined;

  const date = DateTime.fromISO(datePart, {
    zone: STORE_TIME_ZONE,
  }).startOf("day");

  return date.isValid ? date.toJSDate() : undefined;
}
