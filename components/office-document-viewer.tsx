import type { RepositoryItem } from "@/lib/items";

function getOfficeViewerUrl(fileUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

export function OfficeDocumentViewer({
  assetUrl,
  fileName,
  itemType,
}: {
  assetUrl: string;
  fileName: string;
  itemType: RepositoryItem["item_type"];
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70">
      <iframe
        src={getOfficeViewerUrl(assetUrl)}
        title={`${fileName} preview`}
        className="h-[70vh] w-full bg-white"
      />

      <div className="border-t border-white/10 bg-slate-950/80 px-6 py-4">
        <p className="text-sm leading-7 text-slate-300">
          Savr is trying to show a read-only {itemType} preview using the web
          viewer. If the document does not render here, use Download to open
          the original file in its native app.
        </p>
      </div>
    </div>
  );
}
