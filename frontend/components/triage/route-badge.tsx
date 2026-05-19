import { Badge } from "../ui/badge";
import { type RecipientType } from "../../lib/api";

export function RouteBadge({ recipientType }: { recipientType?: RecipientType | null }) {
  if (recipientType === "after_sales_team") {
    return <Badge className="rounded-full bg-blue-100 text-blue-800 hover:bg-blue-100">After-sales</Badge>;
  }
  if (recipientType === "customer") {
    return <Badge className="rounded-full bg-green-100 text-green-800 hover:bg-green-100">Customer Action</Badge>;
  }
  if (recipientType === "none") {
    return <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">Identification Only</Badge>;
  }
  return <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">Needs Review</Badge>;
}
