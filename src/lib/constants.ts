import type { ResponseType } from "./database.types";

export const SIGNALS = [
  {
    id: "understood" as ResponseType,
    emoji: "\u2705",
    label: "이해됨",
    color: "bg-success",
    hoverColor: "hover:bg-success/90",
    ringColor: "ring-success/30",
    hex: "#22c55e",
  },
  {
    id: "confused" as ResponseType,
    emoji: "\uD83E\uDD14",
    label: "헷갈림",
    color: "bg-warning",
    hoverColor: "hover:bg-warning/90",
    ringColor: "ring-warning/30",
    hex: "#f59e0b",
  },
  {
    id: "lost" as ResponseType,
    emoji: "\u274C",
    label: "모르겠음",
    color: "bg-danger",
    hoverColor: "hover:bg-danger/90",
    ringColor: "ring-danger/30",
    hex: "#ef4444",
  },
] as const;

export const CLUSTER_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
  "bg-cyan-100 text-cyan-800",
];
