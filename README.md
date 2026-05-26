# Next.js Migration (Clean Web App)

This folder contains a clean Next.js migration of the coding playground UI.

## What is included

- LeetCode-style split layout UI
- `TopBar`, `ProblemPanel`, `EditorPanel`
- Judge0 backend proxy at `app/api/judge0/route.js`
- Run/Submit testcase validation flow

## What is intentionally excluded

- Legacy framework-specific plumbing from the old `apps/web`
- Unused integrations and unrelated app modules

## Setup

1. Install dependencies:

```bash
cd apps/web-next
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Add your real RapidAPI key in `.env`:

```env
JUDGE0_BASE_URL=https://judge029.p.rapidapi.com
JUDGE0_RAPIDAPI_HOST=judge029.p.rapidapi.com
JUDGE0_RAPIDAPI_KEY=your_rapidapi_key_here
```

4. Start dev server:

```bash
npm run dev
```

Then open `http://localhost:3000`.
