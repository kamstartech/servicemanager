# Development Rules

These rules are STRICT. Violating them will break the application or the build. All developers must adhere to them.

## 1. Type Safety & TypeScript
*   **NO `any`**: Do not use `any` unless absolutely necessary and documented with a comment explaining why.
*   **Strict Interfaces**: Define properly typed interfaces for all props, API responses, and database models.
*   **Sync with Prisma**: Regenerate Prisma client (`npx prisma generate`) whenever `schema.prisma` changes.
*   **Enums**: Use Prisma enums or const objects for fixed sets of values. Do not use magic strings.

## 2. Next.js 16 & React Server Components
*   **Suspense Boundaries**: Any Component using `useSearchParams`, `headers()`, or cookies directly or indirectly in a Client Component MUST be wrapped in a `Suspense` boundary.
    *   *Why*: This is required for Static Exports and correct Prerendering.
*   **Database Access**: Database calls (`prisma.*`) MUST happen in Server Components or Server Actions/API Routes. Never in Client Components.
*   **Dynamic Rendering**: If a page is static but accesses dynamic data (like headers or DB) without Suspense, it will fail build. Use `export const dynamic = 'force-dynamic'` if static generation is not needed.

## 3. Tailwind CSS v4
*   **No Standard Config**: We use Tailwind v4. It does not use `tailwind.config.ts` by default. Configuration happens in CSS (`@theme`).
*   **No Conflicting Libraries**: Do not install `tw-animate-css` or old plugins incompatible with v4.
*   **Theme Variables**: Use CSS variables defined in `globals.css` for theming (radius, colors).

## 4. Linting & Formatting
*   **Zero Errors**: The build command `npm run build` runs linting. It must pass.
*   **Unused Imports**: Remove them.
*   **Implicit Any**: Fix all implicit any errors in `tsconfig.json` (strict mode should be enabled).

## 5. Security
*   **Environment Variables**: Never commit `.env`. Access public vars via `NEXT_PUBLIC_`.
*   **Authentication**: All protected routes must verify the session/token.
*   **Sensitive Data**: Never expose `secretHash`, passwords, or PII in client-side responses.

## 6. Directory Structure
*   **`app`**: Routes and pages.
*   **`components`**: Reusable UI components.
*   **`lib`**: Logic, utilities, DB clients.
*   **`docs`**: Documentation only.

Follow these rules to ensure stability and maintainability.
