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
        label = "Marked fixed (beta)";
        colorClass = "bg-green-500/20 text-green-400 border-green-500/30";
        break;
      case "unresolved":
      default:
        label = "Still an issue (beta)";
        colorClass = "bg-amber-500/20 text-amber-400 border-amber-500/30";
        break;
    }
  } else {
    switch (status) {
      case "closed":
        label = "Closed in city data";
        colorClass = "bg-green-500/20 text-green-400 border-green-500/30";
        break;
      case "pending":
        label = "Pending in city data";
        colorClass = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        break;
      case "open":
      default:
        label = "Open in city data";
        colorClass = "bg-amber-500/20 text-amber-400 border-amber-500/30";
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}
    >
      {label}
    </span>
  );
}
