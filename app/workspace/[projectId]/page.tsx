"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Play, Save, History } from "lucide-react";
import CodeEditor from "@/components/Editor";
import FileTree from "@/components/FileTree";
import ChatPanel from "@/components/ChatPanel";
import Preview from "@/components/Preview";
import Terminal from "@/components/Terminal";
import { applyOperations, languageFor, type FileMap, type Operation } from "@/lib/files";
import { getTemplate } from "@/lib/templates";
import { isBooted, setHandlers, startProject, syncFiles } from "@/lib/sandbox";

type VersionRow = { id: string; message: string; createdAt: string };
const LOCAL_KEY = "ai-builder:local-files";

export default function Workspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const isLocal = projectId === "local";

  const [files, setFiles] = useState<FileMap>({});
  const [active, setActive] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const synced = useRef<FileMap>({});

  // Load project (Phase 1: local template, Phase 2: from Postgres)
  useEffect(() => {
    setHandlers({ onLog: (s) => setLogs((l) => l + s), onUrl: setUrl });
    (async () => {
      let loaded: FileMap | null = null;
      if (isLocal) {
        try {
          const raw = localStorage.getItem(LOCAL_KEY);
          if (raw) loaded = JSON.parse(raw);
        } catch {}
        loaded ??= getTemplate("react-vite");
      } else {
        const r = await fetch(`/api/files?projectId=${projectId}`);
        if (!r.ok) return setStatus("Could not load project");
        const data = await r.json();
        loaded = data.files;
        setVersions(data.versions);
      }
      setFiles(loaded!);
      setActive(Object.keys(loaded!).find((p) => /App\.(jsx|tsx)$|page\.tsx$|index\.js$/.test(p)) ?? Object.keys(loaded!)[0]);
    })();
  }, [projectId, isLocal]);

  // Live-sync edits into the running container (Vite HMR refreshes the preview)
  useEffect(() => {
    if (!isBooted() || !Object.keys(files).length) return;
    const t = setTimeout(async () => {
      await syncFiles(synced.current, files);
      synced.current = files;
    }, 500);
    return () => clearTimeout(t);
  }, [files]);

  const save = useCallback(async (next: FileMap, message = "Manual save") => {
    if (isLocal) {
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); setStatus("Saved locally"); } catch {}
      return;
    }
    const r = await fetch("/api/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, files: next, message }),
    });
    setStatus(r.ok ? "Saved (new version)" : "Save failed");
    if (r.ok) {
      const d = await (await fetch(`/api/files?projectId=${projectId}`)).json();
      setVersions(d.versions);
    }
  }, [isLocal, projectId]);

  async function run() {
    setRunning(true);
    setUrl(null);
    synced.current = files;
    const res = await startProject(files);
    if (res.code !== 0) setRunning(false);
  }
  useEffect(() => { if (url) setRunning(false); }, [url]);

  // Every meaningful AI change creates a version checkpoint
  function applyAi(ops: Operation[], message: string) {
    const next = applyOperations(files, ops);
    setFiles(next);
    const firstWritten = ops.find((o) => o.type !== "delete")?.path;
    if (firstWritten) setActive(firstWritten);
    save(next, `AI: ${message}`);
  }

  async function restore(versionId: string) {
    const r = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, versionId }),
    });
    if (!r.ok) return setStatus("Restore failed");
    const { files: restored } = await r.json();
    setFiles(restored);
    setActive(Object.keys(restored)[0]);
    setShowVersions(false);
    save(restored, "Restored earlier version");
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-gray-800 px-4 py-2 text-sm">
        <Link href="/" className="font-semibold">AI Builder</Link>
        <span className="text-gray-500">{isLocal ? "Local workspace" : `Project ${projectId.slice(0, 8)}`}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">{status}</span>
          {!isLocal && (
            <button onClick={() => setShowVersions(!showVersions)}
              className="flex items-center gap-1 rounded border border-gray-700 px-3 py-1 hover:bg-gray-800">
              <History size={14} /> Versions
            </button>
          )}
          <button onClick={() => save(files)}
            className="flex items-center gap-1 rounded border border-gray-700 px-3 py-1 hover:bg-gray-800">
            <Save size={14} /> Save
          </button>
          <button onClick={run} disabled={running}
            className="flex items-center gap-1 rounded bg-green-600 px-3 py-1 font-medium hover:bg-green-500 disabled:opacity-50">
            <Play size={14} /> {running ? "Running…" : "Run"}
          </button>
        </div>
      </header>

      {showVersions && (
        <div className="max-h-40 overflow-auto border-b border-gray-800 bg-gray-900 px-4 py-2 text-sm">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between py-1">
              <span>{v.message} <span className="text-xs text-gray-500">{new Date(v.createdAt).toLocaleString()}</span></span>
              <button onClick={() => restore(v.id)} className="rounded border border-gray-600 px-2 text-xs hover:bg-gray-800">Restore</button>
            </div>
          ))}
        </div>
      )}

      <div className="grid flex-1 grid-cols-[220px_1fr_340px] overflow-hidden">
        <aside className="border-r border-gray-800">
          <FileTree files={files} active={active}
            onSelect={setActive}
            onCreate={(p) => { setFiles({ ...files, [p]: "" }); setActive(p); }}
            onDelete={(p) => {
              const { [p]: _, ...rest } = files;
              setFiles(rest);
              if (active === p) setActive(Object.keys(rest)[0] ?? "");
            }} />
        </aside>

        <main className="grid grid-rows-[1fr_1fr] overflow-hidden">
          <div className="grid grid-cols-2 overflow-hidden border-b border-gray-800">
            <div className="border-r border-gray-800">
              {active && (
                <CodeEditor code={files[active] ?? ""} language={languageFor(active)}
                  onChange={(v) => setFiles((prev) => ({ ...prev, [active]: v }))} />
              )}
            </div>
            <Preview url={url} running={running} />
          </div>
          <Terminal logs={logs} onClear={() => setLogs("")} />
        </main>

        <aside className="border-l border-gray-800">
          <ChatPanel files={files} activeFile={active} onApply={applyAi} />
        </aside>
      </div>
    </div>
  );
}
