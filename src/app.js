import { FunctionComponent, h, useEffect, useMemo, useState } from "./runtime.js";

const STORAGE_KEY = "mini-react-todo-task-manager";
const INITIAL_TODOS = [
  createTodo(1, "Virtual DOM 엔진과 Mini React 런타임 연결하기", true),
  createTodo(2, "Todo Task Manager UI 다듬기", false),
  createTodo(3, "useMemo로 완료 개수 계산하기", false),
];

export function startTodoTaskManager(container) {
  const app = new FunctionComponent(App, container);
  app.mount();
  window.todoTaskManagerApp = app;
  return app;
}

function App() {
  const [todos, setTodos] = useState(loadTodos);
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    console.log("Todos updated!", todos);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    }

    document.title = `Todo Task Manager · ${todos.length} tasks`;
  }, [todos]);

  const completedCount = useMemo(() => {
    return todos.filter((todo) => todo.completed).length;
  }, [todos]);

  const currentDate = formatDate(new Date());

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedValue = inputText.trim();

    if (!trimmedValue) {
      return;
    }

    setTodos((previousTodos) => [
      createTodo(Date.now(), trimmedValue, false),
      ...previousTodos,
    ]);
    setInputText("");
  };

  const handleInputChange = (nextValue) => {
    setInputText(nextValue);
  };

  const handleToggleTodo = (todoId) => {
    setTodos((previousTodos) =>
      previousTodos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  };

  const handleDeleteTodo = (todoId) => {
    setTodos((previousTodos) =>
      previousTodos.filter((todo) => todo.id !== todoId),
    );
  };

  return h("div", { className: "app-shell" }, [
    Header({
      title: "Todo Task Manager",
      subtitle: "Mini React runtime 위에서 동작하는 바닐라 JavaScript 할 일 관리 앱",
      currentDate,
    }),
    h("main", { className: "app-main" }, [
      h("section", { className: "todo-column" }, [
        TodoInput({
          inputText,
          onInputChange: handleInputChange,
          onSubmit: handleSubmit,
        }),
        TodoList({
          todos,
          onToggleTodo: handleToggleTodo,
          onDeleteTodo: handleDeleteTodo,
        }),
      ]),
      Summary({
        totalCount: todos.length,
        completedCount,
      }),
    ]),
  ]);
}

function Header({ title, subtitle, currentDate }) {
  return h("header", { className: "header-card" }, [
    h("div", { className: "header-copy" }, [
      h("span", { className: "header-badge" }, "Mini React Runtime"),
      h("h1", { className: "header-title" }, title),
      h("p", { className: "header-subtitle" }, subtitle),
    ]),
    h("div", { className: "header-date-card" }, [
      h("span", { className: "header-date-label" }, "Today"),
      h("strong", { className: "header-date-value" }, currentDate),
      h("span", { className: "header-date-note" }, "상태는 App(root)에서만 관리됩니다."),
    ]),
  ]);
}

function TodoInput({ inputText, onInputChange, onSubmit }) {
  return h("section", { className: "card input-card" }, [
    h("div", { className: "section-head" }, [
      h("h2", { className: "section-title" }, "새 할 일 추가"),
      h("p", { className: "section-copy" }, "입력 폼은 props만 받아서 렌더링하는 순수 함수 컴포넌트입니다."),
    ]),
    h("form", { className: "todo-form", onsubmit: onSubmit }, [
      h("input", {
        className: "todo-input",
        type: "text",
        placeholder: "예: useEffect cleanup 흐름 설명 준비하기",
        value: inputText,
        oninput: (event) => onInputChange(event.target.value),
      }),
      h("button", { className: "primary-button", type: "submit" }, "Add Task"),
    ]),
  ]);
}

function TodoList({ todos, onToggleTodo, onDeleteTodo }) {
  return h("section", { className: "card list-card" }, [
    h("div", { className: "section-head" }, [
      h("h2", { className: "section-title" }, "할 일 목록"),
      h("p", { className: "section-copy" }, "각 TodoItem은 상태 없이 props와 이벤트 핸들러만 전달받습니다."),
    ]),
    h(
      "ul",
      { className: "todo-list" },
      todos.length === 0
        ? [
            h("li", { className: "empty-state" }, [
              h("strong", { className: "empty-title" }, "아직 등록된 할 일이 없습니다."),
              h("p", { className: "empty-copy" }, "위 입력창에서 첫 작업을 추가해 보세요."),
            ]),
          ]
        : todos.map((todo) =>
            TodoItem({
              todo,
              onToggleTodo,
              onDeleteTodo,
            }),
          ),
    ),
  ]);
}

function TodoItem({ todo, onToggleTodo, onDeleteTodo }) {
  return h("li", { className: todo.completed ? "todo-item is-completed" : "todo-item" }, [
    h("button", {
      className: todo.completed ? "toggle-button is-completed" : "toggle-button",
      type: "button",
      onclick: () => onToggleTodo(todo.id),
      "aria-label": todo.completed ? "할 일 미완료로 변경" : "할 일 완료로 변경",
    }, todo.completed ? "완료" : "진행"),
    h("div", { className: "todo-content" }, [
      h("strong", { className: "todo-text" }, todo.text),
      h("span", { className: "todo-meta" }, todo.completed ? "완료된 작업" : "진행 중인 작업"),
    ]),
    h("button", {
      className: "delete-button",
      type: "button",
      onclick: () => onDeleteTodo(todo.id),
      "aria-label": "할 일 삭제",
    }, "Delete"),
  ]);
}

function Summary({ totalCount, completedCount }) {
  const pendingCount = totalCount - completedCount;
  const progressValue =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return h("aside", { className: "card summary-card" }, [
    h("div", { className: "section-head" }, [
      h("h2", { className: "section-title" }, "Summary"),
      h("p", { className: "section-copy" }, "완료 개수는 App(root)의 useMemo가 계산하고 props로 내려보냅니다."),
    ]),
    h("div", { className: "summary-stack" }, [
      SummaryMetric("전체 할 일", `${totalCount}`),
      SummaryMetric("완료된 할 일", `${completedCount}`),
      SummaryMetric("남은 할 일", `${pendingCount}`),
    ]),
    h("div", { className: "progress-block" }, [
      h("div", { className: "progress-head" }, [
        h("span", { className: "progress-label" }, "진행률"),
        h("strong", { className: "progress-value" }, `${progressValue}%`),
      ]),
      h("div", { className: "progress-track" }, [
        h("div", {
          className: "progress-fill",
          style: {
            width: `${progressValue}%`,
          },
        }),
      ]),
    ]),
    h("p", { className: "summary-note" }, "상태 변경이 일어나면 App이 새 VDOM을 만들고, 기존 diff + patch 흐름으로 바뀐 DOM만 갱신합니다."),
  ]);
}

function SummaryMetric(label, value) {
  return h("div", { className: "summary-metric" }, [
    h("span", { className: "summary-label" }, label),
    h("strong", { className: "summary-value" }, value),
  ]);
}

function createTodo(id, text, completed) {
  return {
    id,
    text,
    completed,
  };
}

function loadTodos() {
  if (typeof window === "undefined") {
    return cloneInitialTodos();
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return cloneInitialTodos();
  }

  try {
    const parsed = JSON.parse(storedValue);

    if (Array.isArray(parsed)) {
      return parsed.map((todo) => ({
        id: todo.id,
        text: String(todo.text ?? ""),
        completed: Boolean(todo.completed),
      }));
    }
  } catch (error) {
    console.warn("저장된 todo를 읽지 못해 기본 목록을 사용합니다.", error);
  }

  return cloneInitialTodos();
}

function cloneInitialTodos() {
  return INITIAL_TODOS.map((todo) => ({ ...todo }));
}

function formatDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}
