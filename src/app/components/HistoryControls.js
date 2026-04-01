import { h } from "../../runtime/index.js";

export function HistoryControls({ canUndo, canRedo, onUndo, onRedo }) {
  return h(
    "div",
    { className: "historyGroup" },
    h(
      "button",
      {
        type: "button",
        className: "ghostButton",
        disabled: !canUndo,
        "data-testid": "undo-button",
        onClick: onUndo,
      },
      "Undo",
    ),
    h(
      "button",
      {
        type: "button",
        className: "ghostButton",
        disabled: !canRedo,
        "data-testid": "redo-button",
        onClick: onRedo,
      },
      "Redo",
    ),
  );
}
