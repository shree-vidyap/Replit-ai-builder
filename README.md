# AI Builder — Replit-like AI development platform (MVP starter)

Follows the plan from the PDF: **Describe a React application, edit the generated files in the browser, run it instantly, and deploy it.**

## Stack (as in the PDF)
Next.js · React · TypeScript · Tailwind · Monaco Editor · WebContainers · PostgreSQL + Prisma · Anthropic API (swappable) · Zod validation

## Folder structure
```
app/
  dashboard/            project list + create from template
  workspace/[projectId]/ editor + file tree + chat + preview + terminal
  api/ai/               AI agent endpoint (Zod-validated JSON, rate-limited)
  api/projects/         create/list projects
  api/files/            load, save (+ Version checkpoint), restore
components/  Editor, FileTree, ChatPanel, Preview, Terminal
lib/         db, ai-agent, files, sandbox (WebContainers), templates
prisma/      schema.prisma (User, Project, ProjectFile, Version)
```

## Run it (VS Code terminal)
```bash
npm install
cp .env.example .env        # add ANTHROPIC_API_KEY
npm run dev
```
Open **http://localhost:3000/workspace/local** in **Chrome or Edge**.
Phase 1 (local prototype) needs no database: files persist in localStorage.

### Phase 2: database (dashboard, cloud save, version history)
```bash
docker compose up -d
npm run db:migrate
```
Then open http://localhost:3000/dashboard.

## What works
- Monaco editor, file tree (new/delete with confirmation)
- Run → writes files into WebContainer → `npm install` → `npm run dev` → preview in iframe
- Edits sync live into the running container
- AI chat: sends file tree + only relevant files, returns structured JSON operations, shows a diff, you Apply/Reject, then allowlisted commands run; if a build fails, "Auto-fix errors" sends the log back
- Every AI change and save creates a `Version` row; restore from the Versions panel
- Safety: path validation (no `..`, absolute paths, `.env`, `node_modules`), command allowlist, AI rate limit

## Next (per PDF roadmap)
- Phase 2: replace `getCurrentUser()` in `lib/db.ts` with Auth.js / Clerk / Supabase Auth; usage limits; deploy
- Deploy: build the project and publish static output to S3/R2 (`projectId.yourdomain.com`)
- Phase 3+: Docker sandboxes for Python/Java/Go (non-root, CPU/memory/time limits), Redis + BullMQ
- Phase 4: Expo templates, Expo web preview, QR via Expo Go, EAS Android/iOS builds
- Phase 5: Stripe, Sentry/OpenTelemetry, collaboration, GitHub integration, custom domains
