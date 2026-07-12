// Plain style constants shared by kanban.tsx (a "use client" module) and by
// Server Components that render kanban layout markup directly. Kept out of
// kanban.tsx itself because Server Components importing a value from a
// "use client" file get a client-reference proxy instead of the real string.
export const kanbanBoardColumnClassNames =
  "w-64 flex-shrink-0 rounded-lg border flex flex-col border-border bg-sidebar py-2 max-h-full";

export const kanbanBoardCardClassNames =
  "rounded-lg border border-border bg-background p-3 text-start text-foreground shadow-sm";
