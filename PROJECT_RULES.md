# Admin Project Rules

## UI & Components

- Always use **shadcn/ui** for UI components when a suitable component exists.
- **Do not** copy component code manually from the shadcn website.
- **Preferred way to add components:**
  - Run `npx shadcn@latest add <component-name>` from the `admin` folder.
  - Example: `npx shadcn@latest add button card input dialog table`.

## shadcn/ui & Tailwind

- This project uses **Next.js App Router**, **React 19**, and **Tailwind CSS v4**.
- Install and configure shadcn/ui using the **official CLI**:
  - `npx shadcn@latest init` in the `admin` folder.
  - Follow prompts for Next.js + TypeScript + Tailwind CSS + App Router.

## Forms & Validation

- **Standard approach:** Use **React 19 Server Actions** with **zod** for validation.
- **Do NOT use** `react-hook-form` or `@hookform/resolvers` - they are legacy patterns.
- Server Actions provide:
  - Progressive enhancement (works without JavaScript)
  - Built-in pending states with `useActionState`
  - Type-safe form handling
  - Server-side validation with zod

### Form Implementation Pattern

1. **Create Server Action** in `lib/actions/`:
```typescript
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export type FormState = {
  errors?: { name?: string[]; email?: string[]; _form?: string[] };
  success?: boolean;
};

export async function createItem(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = schema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  try {
    // Database operations
    revalidatePath('/items');
  } catch (error) {
    return { errors: { _form: ['Failed to create item'] } };
  }

  redirect('/items');
}
```

2. **Use in Component**:
```typescript
'use client';
import { useActionState } from 'react';

export function ItemForm({ action }) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction}>
      {state.errors?._form && <div className="text-red-600">{state.errors._form}</div>}
      
      <input name="name" required />
      {state.errors?.name && <p className="text-red-600">{state.errors.name}</p>}
      
      <button disabled={pending}>{pending ? 'Saving...' : 'Submit'}</button>
    </form>
  );
}
```

3. **Benefits**:
   - No client-side dependencies for basic forms
   - Type-safe with zod schemas
   - Works with and without JavaScript
   - Built-in error handling and pending states
   - Simpler than react-hook-form patterns

## GraphQL & Backend Architecture

- The **GraphQL server lives inside the Next.js admin app** at `/api/graphql`.
- GraphQL is implemented using:
  - `graphql-yoga`
  - `@graphql-tools/schema`
- GraphQL resolvers access the database **directly via Prisma** (no Phoenix in this path, for now).

## Database & Prisma

- All tables owned by this admin app are **prefixed with `fdh_`** in Postgres.
  - Example: `fdh_mobile_users`.
- Prisma models use clean names and map to `fdh_` tables using `@@map` and `@map`.
- `MobileUser` model (`fdh_mobile_users`) rules:
  - Enum `MobileUserContext` values:
    - `MOBILE_BANKING`, `WALLET`, `VILLAGE_BANKING`, `AGENT`, `MERCHANT`.
  - Supports different login requirements per context, for example:
    - `MOBILE_BANKING`: `username` + `passwordHash`.
    - `WALLET`: `phoneNumber` + `pinHash`.

## Docker & Development Workflow

- The `adminpanel` service is for **development**:
  - Uses `image: node:20-alpine`.
  - Mounts the local `./admin` directory into `/app` in the container.
  - Runs `npm install && npm run dev`.
- Nginx proxies `/adminpanel` to `adminpanel:3000`.
- Any changes under `admin/` are reflected live via the Next.js dev server.

## Documentation Organization

### Directory Structure

All documentation must be organized in the `docs/` directory with the following structure:

```
docs/
├── README.md                    # Main documentation hub with indexes
├── t24/                         # T24 Core Banking Integration
├── features/                    # Feature implementations
├── infrastructure/              # Infrastructure & DevOps
├── api/                         # API documentation (GraphQL, REST)
├── guides/                      # Development guides & tutorials
├── quick-references/            # Quick reference guides
├── architecture/                # System architecture & design
└── archive/                     # Historical/deprecated documentation
```

### File Naming Conventions

1. **Use SCREAMING_SNAKE_CASE.md** for documentation files
   - Example: `AUTHENTICATION_SYSTEM.md`, `BACKUP_SYSTEM_SUMMARY.md`

2. **Prefix with domain/feature** for clarity
   - T24: `T24_ACCOUNTS_ENDPOINT.md`
   - Workflow: `WORKFLOW_IMPLEMENTATION_SUMMARY.md`
   - Billers: `BILLERS_QUICK_START.md`

3. **Use descriptive, meaningful names**
   - Good: `FORGOT_PASSWORD_IMPLEMENTATION.md`
   - Bad: `IMPL.md`, `DOC1.md`

### Documentation Categories

#### `/t24` - T24 Integration
All T24 ESB API integrations, core banking features, and T24-specific implementations.

#### `/features` - Feature Documentation
Group by feature area:
- **Authentication**: `AUTHENTICATION_SYSTEM.md`, `LOGIN_*.md`, `REGISTRATION_*.md`
- **Workflows**: `WORKFLOW_*.md`
- **Billers**: `BILLERS_*.md`
- **Transactions**: `TRANSACTION_*.md`, `CHECKBOOK_*.md`
- **Alerts**: `ALERT_*.md`, `ACCOUNT_ALERTS_*.md`

#### `/infrastructure` - Infrastructure & DevOps
- Backups: `BACKUP_*.md`
- Storage: `MINIO_*.md`
- Caching: `REDIS_*.md`
- Email: `EMAIL_*.md`
- Migrations: `MIGRATION*.md`

#### `/api` - API Documentation
- GraphQL schema, security, rate limiting
- REST API endpoints
- API versioning and changes

#### `/guides` - Development Guides
- Quick start guides
- Coding standards: `ICON_USAGE_STANDARDS.md`, `THEME_COLORS_ANALYSIS.md`
- Seeder scripts: `ADMIN_SEEDER_README.md`
- Testing guides

#### `/quick-references` - Quick References
Concise cheat sheets for common tasks (1-2 pages max):
- `BILLERS_QUICK_START.md`
- `GRAPHQL_SECURITY_QUICK_REFERENCE.md`
- `TRANSACTION_QUICK_REFERENCE.md`

#### `/architecture` - Architecture Documentation
- System design documents
- Architecture diagrams
- Technical decisions (ADRs)
- High-level overviews

#### `/archive` - Archived Documentation
- Deprecated implementations
- Superseded documentation
- Session summaries from development
- Historical reference materials

### Standard Document Structure

Every documentation file should follow this template:

```markdown
# Title

## Summary
Brief overview (2-3 sentences) of what this document covers.

## Problem/Context
What problem does this solve? Why was this needed?

## Solution
How was it solved? High-level approach.

## Implementation Details
- Technical details
- Code examples
- Configuration steps
- Integration points

## Usage
How to use this feature/system with examples.

## Testing
How to test or verify the implementation.

## Files Changed
List of modified/created files with brief descriptions.

## Related Documentation
Links to related docs within the docs/ directory.

## Notes
Any caveats, limitations, or future improvements.

---
*Last Updated: YYYY-MM-DD*
```

### When to Create New Documentation

Create documentation when:
1. Implementing a new feature
2. Making significant architectural changes
3. Adding new integrations
4. Documenting APIs or services
5. Creating reusable solutions to complex problems

### When to Update Existing Documentation

Update documentation when:
1. Fixing bugs that affect documented behavior
2. Adding new functionality to existing features
3. Changing APIs or interfaces
4. Discovering new edge cases or limitations
5. Improving clarity based on user feedback

### When to Archive Documentation

Move documentation to `/archive` when:
1. Implementation has been completely replaced
2. Feature is deprecated or removed
3. Documentation is superseded by newer version
4. Keeping for historical reference only

**Always add a note at the top explaining why it's archived:**
```markdown
> ⚠️ **ARCHIVED** - Superseded by [NEW_DOC.md](../features/NEW_DOC.md)
> This implementation was replaced on YYYY-MM-DD.
```

### Documentation Best Practices

1. **Keep it current** - Update docs when code changes
2. **Be specific** - Include exact commands, file paths, and examples
3. **Cross-reference** - Link to related documentation
4. **Use examples** - Show real code snippets and usage
5. **Include context** - Explain why, not just how
6. **Keep it organized** - One doc per feature/topic
7. **Version important changes** - Note breaking changes prominently
8. **Test your examples** - Ensure code examples actually work

### Root Directory Files

Only these files should remain in the project root:
- `README.md` - Project overview and setup
- `PROJECT_RULES.md` - This file (development guidelines)

All other documentation belongs in `docs/` subdirectories.
