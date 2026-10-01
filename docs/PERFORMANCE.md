# Performance

Modellr renders everything in the browser, so very large schemas are bounded by what the browser can
draw. This page records what was measured, how, and what is still slow, so that the numbers in the
README are not guesses.

## Method

- Production build of the real canvas component and store (not a mock), driven by Playwright/Chromium.
- Synthetic schemas: each table has 7–8 fields and about 1.5 foreign keys per table.
- Measured per size: import + first render, one field edit (median of 7, to the next painted frame),
  apply auto-layout, average frame time while dragging a table, JS heap.
- Environment: a 4-vCPU container with **software rendering (no GPU)**. A typical laptop with a GPU
  should do at least as well, but absolute numbers will differ. Treat the *before/after ratios* as the
  reliable part. Firefox and Safari were not tested.

## Results

Before this work (everything re-rendered on every store change, one history entry per moved table,
layout on the main thread):

| Tables | Import + render | One field edit | Apply auto-layout | Drag, avg frame | Heap |
|-------:|----------------:|---------------:|------------------:|----------------:|-----:|
| 50     | 0.45 s          | 0.33 s         | 0.27 s            | 18 ms           | 71 MB  |
| 200    | 1.5 s           | 1.1 s          | 1.4 s             | 25 ms           | 197 MB |
| 500    | 3.7 s           | 3.2 s          | 6.4 s             | 39 ms (worst frame 0.7 s) | 446 MB |

After:

| Tables | Import + render | One field edit | Apply auto-layout | Drag, avg frame | Heap |
|-------:|----------------:|---------------:|------------------:|----------------:|-----:|
| 50     | 0.31 s          | 33 ms          | 46 ms             | 17 ms           | 32 MB  |
| 200    | 1.0 s           | 100 ms         | 150 ms            | 17 ms           | 70 MB  |
| 500    | 2.3 s           | 183 ms         | 0.43 s            | 20 ms           | 193 MB |
| 1000   | 3.6 s           | 267 ms         | 0.84 s            | 19 ms           | 71 MB  |

Heap at 1,000 tables is low only because off-screen tables are not rendered; zoom out far enough to show
them all and memory and frame times rise accordingly.

Auto-layout (ELK) itself takes about 0.25 s / 0.7 s / 1.3 s / 4 s at 50 / 200 / 500 / 1000 tables, but it
now runs in a Web Worker, so it no longer freezes the page (main-thread blocking at 1,000 tables fell
from about 5 s to about 0.7 s, which is the cost of applying the result).

## What changed

1. Components subscribe to the slices of state they use instead of the whole store.
2. Unchanged tables/edges keep their object identity, so React Flow only re-renders what changed.
3. `onlyRenderVisibleElements`: off-screen tables are not in the DOM.
4. Auto-layout results are applied in one store update (one render, one undo step) instead of one per table.
5. Layout runs in a Web Worker.
6. Undo history ignores bookkeeping state (autosave flags), which used to evict real edits.

## Still slow / not done

- Initial import + render of 500+ tables takes seconds (all tables are measured once).
- Layout of 1,000+ tables takes several seconds (in the background, but still).
- Very long share links: a big schema compresses to a very long URL; export a file instead.
- No virtualization of the code panel for huge exports.

Reasonable expectation: smooth editing up to a few hundred tables; usable for viewing and light edits at
1,000. Beyond that, split the schema into several projects.
