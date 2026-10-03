---
name: new-component
description: Create a reusable React component with typed props, Tailwind styling, and a test.
---

# New Component

Ask (if not given): name, purpose, props, whether it is generic (`ui/`) or feature-specific (`features/`).

1. Create `src/components/<ui|features>/<Name>.tsx` with typed props (`interface <Name>Props`), a named export, and Tailwind styling.
2. Keep it Server-compatible unless it needs state or events (then add `"use client"`).
3. Cover accessibility: semantic elements, labels, focus states, aria attributes where needed.
4. Create `<Name>.test.tsx` covering render, key props, and interactions.
5. Run `/test`.
