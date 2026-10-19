import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { isAllowedCommand, isSafePath, type AgentResult, type FileMap } from "./files";

export const AgentResponse = z.object({
  message: z.string(),
  operations: z.array(
    z.object({
      type: z.enum(["write", "delete", "modify"]),
      path: z.string(),
      content: z.string().optional(),
    })
  ),
  commands: z.array(z.string()).max(10),
});

export const SYSTEM = `You are an expert software-development agent.

Rules:
- Inspect the existing project before changing it.
- Do not delete files unless explicitly requested.
- Return only valid JSON.
- Use the existing framework and coding style.
- Make the smallest safe change.
- Explain errors after attempting a build.
- Never expose secrets or environment variables.

Respond with exactly this JSON shape and nothing else:
{"message": string, "operations": [{"type": "write"|"modify"|"delete", "path": string, "content": string}], "commands": string[]}
For "write" and "modify", content is the COMPLETE new file content. Commands may only be: npm install, npm run dev, npm run build, npm run lint, npm test.`;

const SKIP = [/package-lock\.json$/, /yarn\.lock$/, /pnpm-lock\.yaml$/, /^node_modules\//];

/** Don't send the whole project: file tree + the most relevant files within a budget. */
export function pickRelevantFiles(files: FileMap, prompt: string, activeFile?: string, budget = 60000) {
  const words = prompt.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const scored = Object.entries(files)
    .filter(([p]) => !SKIP.some((r) => r.test(p)))
    .map(([path, content]) => {
      let score = 0;
      if (path === activeFile) score += 100;
      if (path === "package.json") score += 50;
      if (/^(src|app|components|lib)\//.test(path)) score += 10;
      const lp = path.toLowerCase();
      const lc = content.toLowerCase();
      for (const w of words) {
        if (lp.includes(w)) score += 20;
        if (lc.includes(w)) score += 5;
      }
      return { path, content, score };
    })
    .sort((a, b) => b.score - a.score);

  const picked: Record<string, string> = {};
  let used = 0;
  for (const f of scored) {
    if (used + f.content.length > budget) continue;
    picked[f.path] = f.content;
    used += f.content.length;
  }
  return picked;
}

function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in AI response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function runAgent(input: {
  prompt: string;
  files: FileMap;
  activeFile?: string;
  errorLog?: string;
}): Promise<AgentResult> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const tree = Object.keys(input.files).join("\n");
  const relevant = pickRelevantFiles(input.files, input.prompt, input.activeFile);
  const fileBlock = Object.entries(relevant)
    .map(([p, c]) => `--- ${p} ---\n${c}`)
    .join("\n\n");

  const userContent =
    `Project structure:\n${tree}\n\nRelevant files:\n${fileBlock}\n\n` +
    (input.errorLog ? `Latest build/runtime error log:\n${input.errorLog}\n\n` : "") +
    `Request: ${input.prompt}`;

  const res = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: "user", content: userContent }],
  });

  const text = res.content.map((b: any) => b.text ?? "").join("");
  const parsed = AgentResponse.safeParse(extractJson(text));
  if (!parsed.success) throw new Error("Bad AI output");

  return {
    message: parsed.data.message,
    operations: parsed.data.operations.filter((o) => isSafePath(o.path)),
    commands: parsed.data.commands.filter(isAllowedCommand),
  };
}
