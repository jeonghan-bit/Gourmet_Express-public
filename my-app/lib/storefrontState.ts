export type StorefrontNotice =
  | { type: "closure"; message: string }
  | { type: "maintenance" }
  | null;

export const getStorefrontNotice = (
  isClosed: boolean,
  closureMessage: string | null,
  isMaintenanceActive: boolean
): StorefrontNotice => {
  if (isClosed) {
    return {
      type: "closure",
      message: closureMessage || "The store is temporarily closed.",
    };
  }

  return isMaintenanceActive ? { type: "maintenance" } : null;
};

export const getEffectiveStoreOpen = (
  weeklyHoursOpen: boolean,
  isClosed: boolean
) => weeklyHoursOpen && !isClosed;

const CLOSURE_PREFIX = "We are temporarily closed because of ";
const REOPEN_SEPARATOR = ". We expect to reopen at ";

const trimSentenceEnd = (value: string) =>
  value.trim().replace(/[.!?]+$/, "");

export const buildClosureMessage = (reason: string, reopeningTime: string) =>
  `${CLOSURE_PREFIX}${trimSentenceEnd(reason)}${REOPEN_SEPARATOR}${trimSentenceEnd(reopeningTime)}.`;

export const parseClosureMessage = (message: string | null) => {
  if (!message?.startsWith(CLOSURE_PREFIX) || !message.endsWith(".")) {
    return { reason: "", reopeningTime: "" };
  }

  const content = message.slice(CLOSURE_PREFIX.length, -1);
  const separatorIndex = content.lastIndexOf(REOPEN_SEPARATOR);
  if (separatorIndex === -1) {
    return { reason: "", reopeningTime: "" };
  }

  return {
    reason: content.slice(0, separatorIndex),
    reopeningTime: content.slice(separatorIndex + REOPEN_SEPARATOR.length),
  };
};
