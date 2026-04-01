import { h } from "../../runtime/index.js";

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TodoItem({ todo, onToggle, onRemove }) {
  return h(
    "li",
    {
      className: todo.completed ? "todoCard done" : "todoCard",
      "data-todo-id": String(todo.id),
    },
    h("input", {
      className: "todoCheck",
      type: "checkbox",
      checked: todo.completed,
      onChange: () => onToggle(todo.id),
    }),
    h(
      "div",
      { className: "todoText" },
      h("strong", {}, todo.text),
      h(
        "span",
        { className: "todoMeta" },
        todo.completed ? "완료됨" : "진행 중",
        " · ",
        formatDate(todo.createdAt),
      ),
    ),
    h(
      "button",
      {
        type: "button",
        className: "dangerButton",
        onClick: () => onRemove(todo.id),
      },
      "삭제",
    ),
  );
}
