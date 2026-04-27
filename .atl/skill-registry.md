# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When user asks about libraries, frameworks, API references | context7-mcp | C:/Users/lucsadev/.agents/skills/context7-mcp/SKILL.md |
| Writing frontend code with InsForge SDK (DB, auth, storage, AI, functions, realtime) | insforge | C:/Users/lucsadev/.agents/skills/insforge/SKILL.md |
| Backend infrastructure (tables, SQL, functions, storage, deploys, secrets, cron) | insforge-cli | C:/Users/lucsadev/.agents/skills/insforge-cli/SKILL.md |
| Errors, bugs, performance in InsForge projects | insforge-debug | C:/Users/lucsadev/.agents/skills/insforge-debug/SKILL.md |
| Third-party auth (Clerk, Auth0, WorkOS) or payment (OKX x402) integration | insforge-integrations | C:/Users/lucsadev/.claude/skills/insforge-integrations/SKILL.md |
| When user asks to find/install skills | find-skills | C:/Users/lucsadev/.agents/skills/find-skills/SKILL.md |
| Adversarial code review | judgment-day | C:/Users/lucsadev/.config/opencode/skills/judgment-day/SKILL.md |
| Creating pull requests | branch-pr | C:/Users/lucsadev/.config/opencode/skills/branch-pr/SKILL.md |
| Creating GitHub issues | issue-creation | C:/Users/lucsadev/.config/opencode/skills/issue-creation/SKILL.md |

## Compact Rules

### insforge
- Fetch docs via `insforge_fetch-docs` or `insforge_fetch-sdk-docs` BEFORE writing any SDK code
- Database inserts require array format: `insert([{...}])` not `insert({...})`
- SDK returns `{data, error}` — always destructure and check error
- Session token: capture from `signIn` response via `data.accessToken`, pass to `createClient({ accessToken })`
- **Use Tailwind CSS v3.4** — do not upgrade to v4
- Deprecated packages: `@insforge/react`, `@insforge/nextjs`, `@insforge/react-router` — do NOT use

### insforge-cli
- **Always use `npx @insforge/cli`** — never install the CLI globally
- Session start: `npx @insforge/cli whoami` + `npx @insforge/cli current` to verify auth + project
- Functions invoke URL: `{oss_host}/functions/{slug}` (NOT `/api/functions/{slug}`)
- Deploy frontend: always verify local build (`npm run build`) succeeds first
- Secrets delete is soft (marks inactive) — restore with `secrets update --active true`

### insforge-debug
- Always use `npx @insforge/cli` — never install the CLI globally
- 401/403 errors: check `insforge.logs` for auth errors, `postgREST.logs` for RLS violations
- SDK errors: `npx @insforge/cli diagnose logs` → then drill by error code prefix (PGRST* → postgREST.logs)
- Slow queries: `npx @insforge/cli diagnose db --check slow-queries,connections,locks`

### context7-mcp
- Use `resolve-library-id` first, then `query-docs` with the selected library ID
- Be specific: pass the user's full question as the query for better relevance
- Version awareness: use version-specific IDs when the user mentions a version

### judgment-day
- Launch TWO judges in parallel via `delegate` (async) — never sequential
- Synthesize verdict: confirmed (both agree), suspect (one only), contradiction (disagree)
- WARNING classification: "Can a normal user trigger this?" YES → real, NO → theoretical
- After 2 fix iterations: ASK user before continuing (escalate or stop)

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| Agent instructions | D:\IA Project\krear\AGENTS.md | Index — references InsForge SDK patterns |
| Project entry point | D:\IA Project\krear\CLAUDE.md | Alias for AGENTS.md |
| ESLint config | D:\IA Project\krear\eslint.config.mjs | Next.js core-web-vitals + TypeScript |
| TypeScript config | D:\IA Project\krear\tsconfig.json | Strict mode, path alias `@/*` |
| Env config | D:\IA Project\krear\.env.local | NEXT_PUBLIC_INSFORGE_URL, NEXT_PUBLIC_INSFORGE_ANON_KEY |
| MCP config | D:\IA Project\krear\opencode.json | InsForge MCP configured |