# Next.js Migration (Clean Web App)

This folder contains a clean Next.js migration of the coding playground UI.

## What is included

- LeetCode-style split layout UI
- `TopBar`, `ProblemPanel`, `EditorPanel`
- Run/Submit official LeetCode execution flow via browser extension bridge

## Setup

1. Install dependencies:

```bash
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

3. Start dev server:

```bash
npm run dev
```

Then open `http://localhost:3000`.
