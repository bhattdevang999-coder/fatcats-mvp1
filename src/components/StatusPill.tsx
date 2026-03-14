interface StatusPillProps {
  status: string;
  source: string;
}

export default function StatusPill({ status, source }: StatusPillProps) {
  let label = "";
  let colorClass = "";

  if (source === "citizen") {
    switch (status) {
      case "fixed":
        label = "Fixed";
        colorClass = "bg-green-500/15 text-green-400 border-green-500/20";
        break;
      case "unresolved":
      default:
        label = "Unresolved";
        colorClass = "bg-amber-500/15 text-amber-400 border-amber-500/20";
        break;
    }
  } else {
    switch (status) {
      case "closed":
        label = "Closed";
        colorClass = "bg-green-500/15 text-green-400 border-green-500/20";
        break;
      case "pending":
        label = "Pending";
        colorClass = "bg-yellow-500/15 text-yellow-400 border-yellow-500/20";
        break;
      case "open":
      default:
        label = "Open";
        colorClass = "bg-amber-500/15 text-amber-400 border-amber-500/20";
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${colorClass}`}
    >
      {label}
    </span>
  );
}
