import { ReactNode } from "react";
import { Card } from "../ui/card";

interface CaptureTipCardProps {
  icon: ReactNode;
  text: string;
}

export function CaptureTipCard({ icon, text }: CaptureTipCardProps) {
  return (
    <Card className="flex items-center gap-4 p-4 shadow-sm bg-white border-slate-200 hover:bg-slate-50 transition-colors group">
      <div className="flex-shrink-0 text-green-700 p-2 bg-green-50 rounded-lg group-hover:scale-110 group-hover:bg-green-100 transition-all">
        {icon}
      </div>
      <span className="text-sm font-medium text-slate-800 leading-snug">
        {text}
      </span>
    </Card>
  );
}
