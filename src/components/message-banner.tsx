import { cn } from "@/lib/utils";

export function MessageBanner({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "error" && "border-red-200 bg-red-50 text-red-800",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        tone === "info" && "border-stone-300 bg-stone-50 text-stone-700",
      )}
    >
      {children}
    </div>
  );
}
