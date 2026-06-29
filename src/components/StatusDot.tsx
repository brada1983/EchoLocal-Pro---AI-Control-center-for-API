import clsx from "clsx";

type Status = "active" | "inactive" | "failed" | "unknown";

const COLOR: Record<Status, string> = {
  active: "bg-accent-green",
  inactive: "bg-text-muted",
  failed: "bg-accent-red",
  unknown: "bg-accent-orange",
};

export function StatusDot({ status, pulse = false }: { status: Status; pulse?: boolean }) {
  return (
    <span
      className={clsx("status-dot", COLOR[status], pulse && status === "active" && "animate-pulse-glow")}
      title={status}
    />
  );
}
