import type {
  AppInventoryStatus,
  DeviceStatus,
  RecommendationSeverity,
  SecuritySignal,
  StartupImpactLevel
} from "@omnia-watch/types";
import { Badge } from "@omnia-watch/ui";

type StatusValue =
  | AppInventoryStatus
  | DeviceStatus
  | RecommendationSeverity
  | SecuritySignal["status"]
  | StartupImpactLevel;

export function StatusBadge({ value }: { value: StatusValue }) {
  const criticalValues: StatusValue[] = ["critical", "error", "offline"];
  const warningValues: StatusValue[] = ["high", "manual", "warning", "updatable"];
  const positiveValues: StatusValue[] = ["healthy", "current", "low", "ok"];

  const tone = criticalValues.includes(value)
    ? "critical"
    : warningValues.includes(value)
      ? "warning"
      : positiveValues.includes(value)
        ? "positive"
        : "neutral";

  return <Badge tone={tone}>{value.replaceAll("-", " ")}</Badge>;
}
