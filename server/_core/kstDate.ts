const KST_TIME_ZONE = "Asia/Seoul";

const kstDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type DateLike = Date | string | number | null | undefined;

function getKstParts(value: DateLike) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Map(
    kstDateTimeFormatter
      .formatToParts(date)
      .map(part => [part.type, part.value])
  );

  return {
    year: parts.get("year")!,
    month: parts.get("month")!,
    day: parts.get("day")!,
    hour: parts.get("hour")!,
    minute: parts.get("minute")!,
  };
}

export function formatKstDate(value: DateLike): string | null {
  const parts = getKstParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : null;
}

export function formatKstTime(value: DateLike): string | null {
  const parts = getKstParts(value);
  return parts ? `${parts.hour}:${parts.minute}` : null;
}
