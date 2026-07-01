interface ScreenshotPreviewProps {
  screenshotDataUrl?: string;
}

export function ScreenshotPreview({ screenshotDataUrl }: ScreenshotPreviewProps) {
  if (!screenshotDataUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">
        Capture the active tab to preview the screenshot here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <img
        alt="Captured browser tab screenshot"
        className="aspect-video w-full object-contain"
        src={screenshotDataUrl}
      />
    </div>
  );
}
