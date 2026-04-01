import { h } from "../../runtime/index.js";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export function FilterTabs({ filter, onFilterChange }) {
  return h(
    "div",
    { className: "filterGroup" },
    FILTERS.map(({ value, label }) =>
      h(
        "button",
        {
          type: "button",
          className: value === filter ? "chip active" : "chip",
          "data-filter": value,
          onClick: () => onFilterChange(value),
        },
        label,
      ),
    ),
  );
}
