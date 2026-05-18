import { Badge } from "../ui/badge";

interface ConfidencePillProps {
  score: number;
}

export function ConfidencePill({ score }: ConfidencePillProps) {
  const percent = Math.round(score * 100);
  let label = "Low";
  let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" = "destructive";

  if (score >= 0.75) {
    label = "High";
    variant = "success";
  } else if (score >= 0.55) {
    label = "Medium";
    variant = "warning";
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        Observation Confidence
      </span>
      <Badge variant={variant} className="rounded-full px-3 shadow-none">
        {label} - {percent}%
      </Badge>
    </div>
  );
}
