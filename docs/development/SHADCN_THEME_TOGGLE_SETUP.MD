# shadcn Theme Toggle Setup

This note records the integration status for the requested React `ThemeToggle` component.

## Current Production Root

The active production root at `/Users/natthaphon/Desktop/AiX Website` is not a React/shadcn project.

Observed root status:
- Framework: static HTML plus Node/Express.
- App entry: `server.js`.
- Public pages: root-level `.html`, `.css`, and `.js` files.
- `npx shadcn@latest info --json`: `framework` is `Manual`, `typescript` is `false`, `tailwindVersion` is `null`, and `config` is `null`.
- Root `package.json` has no `react`, `react-dom`, `typescript`, `tailwindcss`, or `lucide-react` dependency.

Because of that, a `.tsx` component copied into the production root would not be compiled or rendered by the current website.

## Existing shadcn App

The workspace also contains an ignored legacy app at `old aix-club/`. That app does support the requested structure:

- Framework: Vite.
- TypeScript: enabled.
- Tailwind: v4.
- shadcn config: `old aix-club/components.json`.
- Global styles: `old aix-club/client/src/index.css`.
- Utilities alias: `@/lib/utils`.
- UI alias: `@/components/ui`.
- UI filesystem path: `old aix-club/client/src/components/ui`.
- `lucide-react` is already listed in `old aix-club/package.json` and `old aix-club/pnpm-lock.yaml`.

The requested files were added there:

- `old aix-club/client/src/components/ui/theme-toggle.tsx`
- `old aix-club/client/src/components/ui/theme-toggle-demo.tsx`

This does not affect the live production root until the production site is migrated to the React app or the component is ported to vanilla HTML/CSS/JS.

## Import

Use the component in the shadcn app with:

```tsx
import { ThemeToggle } from "@/components/ui/theme-toggle";
```

Use the demo with:

```tsx
import { DefaultToggle } from "@/components/ui/theme-toggle-demo";
```

## Path Note

The user-facing alias is `@/components/ui`, but in the existing Vite app that alias resolves to `old aix-club/client/src/components/ui`.

Do not create `/components/ui` at the production root for this app. The current `tsconfig.json` in `old aix-club/` maps `@/*` to `./client/src/*`, so a root-level `/components/ui` folder would not satisfy imports like `@/components/ui/theme-toggle`.

If a new shadcn app is created without a `src` or `client/src` source directory, `/components/ui` is the usual default. The important rule is that `components.json`, `tsconfig.json`, and imports must agree on the same UI path.

## If Production Must Use React/shadcn Later

Use one of these approaches instead of dropping TSX files into the current static root:

1. Promote the existing `old aix-club/` app into the production root, then update Render/Cloudflare build commands to use the Vite app.
2. Create a fresh React TypeScript app, initialize Tailwind and shadcn, then migrate the existing static pages into React routes.
3. Port the toggle to vanilla HTML/CSS/JS for the current production root.

For a new React TypeScript shadcn app:

```bash
npm create vite@latest aix-react -- --template react-ts
cd aix-react
npm install
npm install lucide-react clsx tailwind-merge
npx shadcn@latest init
```

Then keep the shadcn UI files in the configured `resolvedPaths.ui` path from:

```bash
npx shadcn@latest info --json
```
