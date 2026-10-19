import type { FileMap } from "./files";

const pkg = (o: object) => JSON.stringify(o, null, 2);

const reactVite: FileMap = {
  "package.json": pkg({
    name: "react-vite-app", private: true, version: "0.0.0", type: "module",
    scripts: { dev: "vite", build: "vite build" },
    dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
    devDependencies: { "@vitejs/plugin-react": "^4.3.1", vite: "^5.4.0" },
  }),
  "vite.config.js": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
`,
  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
  "src/main.jsx": `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
`,
  "src/App.jsx": `import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ fontFamily: "sans-serif", textAlign: "center", marginTop: 60 }}>
      <h1>Hello from AI Builder</h1>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
    </div>
  );
}
`,
};

const reactViteTs: FileMap = {
  "package.json": pkg({
    name: "react-vite-ts-app", private: true, version: "0.0.0", type: "module",
    scripts: { dev: "vite", build: "vite build" },
    dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
    devDependencies: {
      "@types/react": "^18.3.0", "@types/react-dom": "^18.3.0",
      "@vitejs/plugin-react": "^4.3.1", typescript: "^5.6.0", vite: "^5.4.0",
    },
  }),
  "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
`,
  "tsconfig.json": pkg({
    compilerOptions: {
      target: "ES2020", lib: ["ES2020", "DOM"], jsx: "react-jsx", module: "ESNext",
      moduleResolution: "bundler", strict: true, skipLibCheck: true, noEmit: true,
    },
    include: ["src"],
  }),
  "index.html": reactVite["index.html"].replace("/src/main.jsx", "/src/main.tsx"),
  "src/main.tsx": `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
`,
  "src/App.tsx": `import { useState } from "react";

export default function App() {
  const [count, setCount] = useState<number>(0);
  return (
    <div style={{ fontFamily: "sans-serif", textAlign: "center", marginTop: 60 }}>
      <h1>Hello from AI Builder (TypeScript)</h1>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
    </div>
  );
}
`,
};

const nextjs: FileMap = {
  "package.json": pkg({
    name: "nextjs-app", private: true,
    scripts: { dev: "next dev", build: "next build", start: "next start" },
    dependencies: { next: "14.2.15", react: "^18.3.1", "react-dom": "^18.3.1" },
  }),
  "app/layout.tsx": `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  "app/page.tsx": `export default function Home() {
  return (
    <main style={{ fontFamily: "sans-serif", textAlign: "center", marginTop: 60 }}>
      <h1>Hello from AI Builder (Next.js)</h1>
    </main>
  );
}
`,
};

const nodeHttp: FileMap = {
  "package.json": pkg({
    name: "node-app", private: true, type: "module",
    scripts: { dev: "node index.js", build: "node -e \"console.log('nothing to build')\"" },
  }),
  "index.js": `import http from "node:http";

http
  .createServer((req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.end("<h1>Hello from AI Builder (Node.js)</h1>");
  })
  .listen(3000, () => console.log("Server running on port 3000"));
`,
};

export const TEMPLATES: Record<string, { label: string; files: FileMap }> = {
  "react-vite": { label: "React (Vite)", files: reactVite },
  "react-vite-ts": { label: "React + TypeScript (Vite)", files: reactViteTs },
  nextjs: { label: "Next.js", files: nextjs },
  "node-http": { label: "Node.js", files: nodeHttp },
};

export function getTemplate(name: string): FileMap {
  const t = TEMPLATES[name] ?? TEMPLATES["react-vite"];
  return { ...t.files };
}
