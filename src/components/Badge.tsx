import clsx from "clsx";

type Tone = "green" | "red" | "orange" | "blue" | "neutral";

const TONE: Record<Tone, string> = {
  green: "bg-accent-green-muted/20 text-accent-green",
  red: "bg-accent-red-muted/20 text-accent-red",
  orange: "bg-accent-orange/20 text-accent-orange",
  blue: "bg-accent-blue-muted/20 text-accent-blue",
  neutral: "bg-background-tertiary text-text-secondary",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={clsx("badge", TONE[tone])}>{children}</span>;
}
