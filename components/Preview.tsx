"use client";

export default function Preview({ url, running }: { url: string | null; running: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-800 px-3 py-2 text-xs uppercase tracking-wide text-gray-500">
        Live preview {url && <span className="ml-2 normal-case text-gray-600">{url}</span>}
      </div>
      {url ? (
        <iframe src={url} className="flex-1 bg-white" title="Live preview" />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
          {running ? "Starting dev server…" : "Press Run to see your app here."}
        </div>
      )}
    </div>
  );
}
