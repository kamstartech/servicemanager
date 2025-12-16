# Documentation Guide

We maintain strict documentation standards to ensure knowledge transfer and maintainability.

## Directory Structure
Documentation lives in the `docs/` folder, organized by category:
- **`docs/features/`**: Explanations of specific business features (e.g., SMS, Passkeys, Checkbooks).
- **`docs/ops/`**: Operational guides, backups, deployment, containers.
- **`docs/guidelines/`**: General project rules, architectural decisions, tracked progress.
- **`docs/api/`**: API specifications and usage guides.

## Core Artifacts
These files in `.gemini/antigravity/brain/...` (or managed by the AI assistant) are critical:
1.  **`task.md`**: The source of truth for current tasks. Must be updated as work progresses.
2.  **`implementation_plan.md`**: Created BEFORE coding. Detailed plan of changes.
3.  **`walkthrough.md`**: Created AFTER coding. Proof of work, test results, screenshots.

## How to Document
*   **New Features**: Create a new `.md` file in `docs/features/` with a clear title (e.g., `LOAN_APPLICATION_FLOW.md`).
*   **Updates**: If you modify a feature, update its corresponding documentation.
*   **Root Folder**: Keep the root dirty-free. Do not create `.md` files in the root (except `README.md`). Move them to `docs/`.

## Writing Style
*   **Concise**: Get to the point.
*   **Code Blocks**: Use them for examples.
*   **Links**: Link to actual files where possible.
*   **Dates**: If a doc is time-sensitive, add a "Last Updated" date.
