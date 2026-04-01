import { h } from "../../runtime/index.js";

export function TodoInput({ draft, onDraftChange, onSubmit }) {
  return h(
    "section",
    { className: "panel composer" },
    h("h2", {}, "Add a new task"),
    h(
      "p",
      { className: "historySummary" },
      "루트 컴포넌트의 state가 바뀌면 diff와 patch를 통해 필요한 DOM만 갱신됩니다.",
    ),
    h(
      "div",
      {
        className: "composer-row",
      },
      h("input", {
        id: "todo-input",
        className: "input",
        type: "text",
        value: draft,
        placeholder: "예: 발표 리허설 2번 더 해보기",
        "data-testid": "draft-input",
        onInput: onDraftChange,
        onKeyDown: (event) => {
          if (event.key === "Enter") {
            onSubmit(event);
          }
        },
      }),
      h(
        "button",
        {
          type: "button",
          className: "primaryButton",
          "data-testid": "add-button",
          onClick: onSubmit,
        },
        "추가",
      ),
    ),
  );
}
