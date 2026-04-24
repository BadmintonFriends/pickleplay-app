/**
 * 종목별 색상 유틸리티
 * CSS 변수: event-mixed(혼복:보라), event-women(여복:분홍), event-men(남복:파랑)
 */

export type EventType = "남복" | "여복" | "혼복" | "남단" | "여단";

interface EventColorConfig {
  bg: string;
  text: string;
  border: string;
  bgSubtle: string;
  label: string;
}

const EVENT_COLORS: Record<string, EventColorConfig> = {
  혼복: {
    bg: "bg-event-mixed",
    text: "text-event-mixed",
    border: "border-event-mixed",
    bgSubtle: "bg-event-mixed/15",
    label: "혼합복식",
  },
  여복: {
    bg: "bg-event-women",
    text: "text-event-women",
    border: "border-event-women",
    bgSubtle: "bg-event-women/15",
    label: "여자복식",
  },
  남복: {
    bg: "bg-event-men",
    text: "text-event-men",
    border: "border-event-men",
    bgSubtle: "bg-event-men/15",
    label: "남자복식",
  },
  남단: {
    bg: "bg-event-men",
    text: "text-event-men",
    border: "border-event-men",
    bgSubtle: "bg-event-men/15",
    label: "남자단식",
  },
  여단: {
    bg: "bg-event-women",
    text: "text-event-women",
    border: "border-event-women",
    bgSubtle: "bg-event-women/15",
    label: "여자단식",
  },
};

const DEFAULT_COLOR: EventColorConfig = {
  bg: "bg-primary",
  text: "text-primary",
  border: "border-primary",
  bgSubtle: "bg-primary/15",
  label: "기타",
};

export function getEventColor(eventType: string): EventColorConfig {
  return EVENT_COLORS[eventType] ?? DEFAULT_COLOR;
}

/**
 * 종목 타입에 따른 배지 클래스 반환
 * @param eventType - 종목 타입 (남복, 여복, 혼복, 남단, 여단)
 * @param variant - "solid" (배경색 채움) | "outline" (테두리만) | "subtle" (연한 배경)
 */
export function getEventBadgeClass(
  eventType: string,
  variant: "solid" | "outline" | "subtle" = "solid"
): string {
  const color = getEventColor(eventType);
  switch (variant) {
    case "solid":
      return `${color.bg} ${color.text.replace("text-", "text-")}-foreground`;
    case "outline":
      return `${color.border} ${color.text} border bg-transparent`;
    case "subtle":
      return `${color.bgSubtle} ${color.text}`;
    default:
      return `${color.bg} text-white`;
  }
}
