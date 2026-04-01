import { createHistory } from "../history.js";
import { h, useEffect, useMemo, useState } from "../runtime/index.js";
import { FilterTabs } from "./components/FilterTabs.js";
import { HistoryControls } from "./components/HistoryControls.js";
import { StatsPanel } from "./components/StatsPanel.js";
import { TodoInput } from "./components/TodoInput.js";
import { TodoList } from "./components/TodoList.js";

const STORAGE_KEY = "week5-mini-react-todos";

const DEFAULT_STATE = {
  todos: [
    {
      id: 1,
      text: "Mini React runtime 구조 설명 정리하기",
      completed: false,
      createdAt: 1711910400000,
    },
    {
      id: 2,
      text: "useEffect 동작 흐름 팀원과 같이 검증하기",
      completed: true,
      createdAt: 1711914000000,
    },
  ],
  draft: "",
  filter: "all",
};

function cloneState(state) {
  return {
    ...state,
    todos: state.todos.map((todo) => ({ ...todo })),
  };
}

function sanitizeState(value) {
  if (!value || typeof value !== "object") {
    return cloneState(DEFAULT_STATE);
  }

  const todos = Array.isArray(value.todos)
    ? value.todos
        .filter((todo) => todo && typeof todo.text === "string")
        .map((todo, index) => ({
          id: Number.isFinite(todo.id) ? todo.id : Date.now() + index,
          text: todo.text,
          completed: Boolean(todo.completed),
          createdAt: Number.isFinite(todo.createdAt)
            ? todo.createdAt
            : Date.now() + index,
        }))
    : DEFAULT_STATE.todos.map((todo) => ({ ...todo }));

  const filter =
    value.filter === "active" || value.filter === "completed"
      ? value.filter
      : "all";

  return {
    todos,
    draft: typeof value.draft === "string" ? value.draft : "",
    filter,
  };
}

function loadInitialState() {
  if (typeof localStorage === "undefined") {
    return cloneState(DEFAULT_STATE);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return cloneState(DEFAULT_STATE);
    }

    return sanitizeState(JSON.parse(raw));
  } catch {
    return cloneState(DEFAULT_STATE);
  }
}

function nextId(todos) {
  return todos.reduce((maxId, todo) => Math.max(maxId, todo.id), 0) + 1;
}

function normalizeDraft(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function filterTodos(todos, filter) {
  if (filter === "active") {
    return todos.filter((todo) => !todo.completed);
  }

  if (filter === "completed") {
    return todos.filter((todo) => todo.completed);
  }

  return todos;
}

export function App() {
  const [appState, setAppState] = useState(() => loadInitialState());
  const [history] = useState(() => createHistory(loadInitialState()));

  const visibleTodos = useMemo(
    () => filterTodos(appState.todos, appState.filter),
    [appState.todos, appState.filter],
  );

  const stats = useMemo(() => {
    const total = appState.todos.length;
    const completed = appState.todos.filter((todo) => todo.completed).length;
    const active = total - completed;

    return { total, completed, active };
  }, [appState.todos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  useEffect(() => {
    document.title = `Mini React Todo (${stats.active} active)`;
  }, [stats.active]);

  function commitSnapshot(nextState) {
    const snapshot = cloneState(nextState);
    history.push(snapshot);
    setAppState(snapshot);
  }

  function handleDraftChange(event) {
    const nextDraft = event.target.value;

    setAppState((previousState) => ({
      ...previousState,
      draft: nextDraft,
    }));
  }

  function handleSubmit(event) {
    event?.preventDefault?.();

    const text = normalizeDraft(appState.draft);

    if (!text) {
      return;
    }

    commitSnapshot({
      ...appState,
      draft: "",
      todos: [
        {
          id: nextId(appState.todos),
          text,
          completed: false,
          createdAt: Date.now(),
        },
        ...appState.todos,
      ],
    });
  }

  function handleToggle(id) {
    commitSnapshot({
      ...appState,
      todos: appState.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    });
  }

  function handleRemove(id) {
    commitSnapshot({
      ...appState,
      todos: appState.todos.filter((todo) => todo.id !== id),
    });
  }

  function handleFilterChange(nextFilter) {
    if (nextFilter === appState.filter) {
      return;
    }

    commitSnapshot({
      ...appState,
      filter: nextFilter,
    });
  }

  function handleUndo() {
    const previousSnapshot = history.back();

    if (previousSnapshot) {
      setAppState(previousSnapshot);
    }
  }

  function handleRedo() {
    const nextSnapshot = history.forward();

    if (nextSnapshot) {
      setAppState(nextSnapshot);
    }
  }

  return h(
    "main",
    { className: "page" },
    h(
      "div",
      { className: "shell" },
      h(
        "section",
        { className: "hero" },
        h("p", { className: "eyebrow" }, "week 5 assignment"),
        h("h1", {}, "Mini React Todo Board"),
        h(
          "p",
          {},
          "직접 구현한 FunctionComponent, useState, useEffect, useMemo 위에서 돌아가는 간단한 Todo 앱입니다.",
        ),
      ),
      h(
        "div",
        { className: "dashboard" },
        h(
          "div",
          { className: "leftColumn" },
          h(TodoInput, {
            draft: appState.draft,
            onDraftChange: handleDraftChange,
            onSubmit: handleSubmit,
          }),
          h(
            "section",
            { className: "panel" },
            h(
              "div",
              { className: "subtleRow" },
              h("h2", {}, "Todo board"),
              h(FilterTabs, {
                filter: appState.filter,
                onFilterChange: handleFilterChange,
              }),
            ),
            h(TodoList, {
              todos: visibleTodos,
              onToggle: handleToggle,
              onRemove: handleRemove,
            }),
          ),
        ),
        h(
          "aside",
          { className: "rightColumn" },
          h(StatsPanel, stats),
          h(
            "section",
            { className: "panel" },
            h("h3", {}, "History"),
            h(
              "p",
              { className: "historySummary" },
              "추가, 토글, 삭제, 필터 변경은 snapshot으로 기록되고 Undo/Redo로 복원됩니다.",
            ),
            h(
              "div",
              { className: "subtleRow" },
              h(HistoryControls, {
                canUndo: history.canBack(),
                canRedo: history.canForward(),
                onUndo: handleUndo,
                onRedo: handleRedo,
              }),
              h(
                "span",
                { className: "historySummary", "data-testid": "history-meta" },
                `Snapshots: ${history.entries().length}`,
              ),
            ),
          ),
          h(
            "section",
            { className: "panel" },
            h("h3", {}, "What this demo shows"),
            h(
              "ol",
              { className: "noteList" },
              h("li", {}, "상태는 루트 컴포넌트 App 한 곳에서만 관리됩니다."),
              h("li", {}, "자식 컴포넌트는 props만 받아서 렌더링합니다."),
              h("li", {}, "setState 이후에는 새 vnode를 만들고 diff와 patch로 실제 DOM을 갱신합니다."),
              h("li", {}, "useMemo와 useEffect도 직접 구현한 Hook으로 동작합니다."),
            ),
          ),
        ),
      ),
    ),
  );
}
