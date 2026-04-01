import { h } from "../../runtime/index.js";
import { TodoItem } from "./TodoItem.js";

export function TodoList({ todos, onToggle, onRemove }) {
  if (todos.length === 0) {
    return h(
      "div",
      { className: "emptyState", "data-testid": "empty-state" },
      "현재 필터에 해당하는 작업이 없습니다. 새 할 일을 추가해 보세요.",
    );
  }

  return h(
    "ul",
    { className: "todoList", "data-testid": "todo-list" },
    todos.map((todo) =>
      h(TodoItem, {
        todo,
        onToggle,
        onRemove,
      }),
    ),
  );
}
