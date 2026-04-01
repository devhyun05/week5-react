import { h } from "../../runtime/index.js";

function StatCard({ label, value }) {
  return h(
    "article",
    { className: "statCard" },
    h("span", { className: "statLabel" }, label),
    h("strong", { className: "statValue" }, String(value)),
  );
}

export function StatsPanel({ total, active, completed }) {
  return h(
    "section",
    { className: "panel" },
    h("h3", {}, "Current stats"),
    h(
      "div",
      { className: "statsGrid" },
      h(StatCard, { label: "Total", value: total }),
      h(StatCard, { label: "Active", value: active }),
      h(StatCard, { label: "Completed", value: completed }),
    ),
  );
}
