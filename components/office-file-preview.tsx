import type { RepositoryItem } from "@/lib/items";

export function OfficeFilePreview({
  itemType,
}: {
  itemType: RepositoryItem["item_type"];
}) {
  const previewTheme = {
    DOCX: {
      badge: "W",
      badgeClass: "bg-blue-600",
      frameClass: "from-blue-950 via-slate-900 to-slate-950",
    },
    PPTX: {
      badge: "P",
      badgeClass: "bg-orange-500",
      frameClass: "from-orange-950 via-slate-900 to-slate-950",
    },
    XLSX: {
      badge: "X",
      badgeClass: "bg-emerald-600",
      frameClass: "from-emerald-950 via-slate-900 to-slate-950",
    },
  }[itemType as "DOCX" | "PPTX" | "XLSX"];

  if (!previewTheme) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br px-6 py-10 ${previewTheme.frameClass}`}
    >
      <div className="relative h-36 w-28 rounded-[2rem] bg-white shadow-2xl shadow-black/30">
        <div className="absolute right-0 top-0 h-10 w-10 rounded-bl-3xl rounded-tr-[2rem] bg-slate-200" />
        <div className="absolute left-5 top-6 space-y-2">
          <div className="h-2 w-12 rounded-full bg-slate-200" />
          <div className="h-2 w-10 rounded-full bg-slate-200" />
          <div className="h-2 w-8 rounded-full bg-slate-200" />
        </div>
        <div
          className={`absolute -left-4 bottom-5 flex h-16 w-16 items-center justify-center rounded-3xl text-3xl font-black text-white shadow-xl ${previewTheme.badgeClass}`}
        >
          {previewTheme.badge}
        </div>
      </div>
    </div>
  );
}
