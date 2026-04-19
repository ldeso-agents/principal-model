// @ts-expect-error — markdown-it-katex ships no types.
import MarkdownItKatex from "markdown-it-katex";
import type MarkdownIt from "markdown-it";

export default {
  title: "Klima Protocol — Fee vs. Principal",
  pages: [
    { path: "/phase-a",     name: "Phase A — Note" },
    { path: "/phase-b",     name: "Phase B — Simulator" },
    { path: "/phase-c",     name: "Phase C — Interactive" },
    { path: "/conclusions", name: "Conclusions" },
  ],
  theme: ["air", "alt"],
  toc: true,
  pager: false,
  style: "components/phase-styles.css",
  head: `
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  `,
  markdownIt: (md: MarkdownIt) => md.use(MarkdownItKatex),
};
