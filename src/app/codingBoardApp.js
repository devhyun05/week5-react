import { createElement } from "../runtime/index.js";

export const STORAGE_KEY = "wed-coding-board-tasks";

const TEAM_OPTIONS = ["플랫폼", "프론트", "백엔드", "디자인"];
const PRIORITY_LABELS = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};
const PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
};

let taskSequence = 1000;

function createTaskId() {
  taskSequence += 1;
  return `task-${taskSequence}`;
}

export function createSampleTasks() {
  return [
    {
      id: "task-101",
      title: "발표 시나리오 정리",
      team: "플랫폼",
      priority: "high",
      done: false,
    },
    {
      id: "task-102",
      title: "Hooks 테스트 보강",
      team: "프론트",
      priority: "medium",
      done: false,
    },
    {
      id: "task-103",
      title: "Diff 회귀 수정",
      team: "백엔드",
      priority: "high",
      done: true,
    },
    {
      id: "task-104",
      title: "디자인 QA 체크",
      team: "디자인",
      priority: "low",
      done: false,
    },
  ];
}

function isTask(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.team === "string" &&
    typeof value.priority === "string" &&
    typeof value.done === "boolean"
  );
}

export function readInitialTasks() {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return createSampleTasks();
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return createSampleTasks();
    }

    const savedTasks = parsed.filter(isTask);

    return savedTasks.length > 0 ? savedTasks : createSampleTasks();
  } catch {
    return createSampleTasks();
  }
}

export function summarizeTasks(tasks) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.done).length;
  const remaining = total - done;
  const completion = total === 0 ? 0 : Math.round((done / total) * 100);

  return {
    total,
    done,
    remaining,
    completion,
  };
}

export function filterTasks(tasks, { teamFilter, statusFilter, searchQuery, sortMode }) {
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filtered = tasks.filter((task) => {
    const teamMatched = teamFilter === "all" || task.team === teamFilter;
    const statusMatched =
      statusFilter === "all" ||
      (statusFilter === "done" && task.done) ||
      (statusFilter === "todo" && !task.done);
    const searchMatched =
      normalizedSearch === "" ||
      task.title.toLowerCase().includes(normalizedSearch) ||
      task.team.toLowerCase().includes(normalizedSearch);

    return teamMatched && statusMatched && searchMatched;
  });

  const sorted = [...filtered];

  if (sortMode === "priority") {
    sorted.sort((left, right) => {
      const priorityGap = PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority];

      if (priorityGap !== 0) {
        return priorityGap;
      }

      return left.title.localeCompare(right.title, "ko");
    });
  } else if (sortMode === "team") {
    sorted.sort((left, right) => {
      const teamGap = left.team.localeCompare(right.team, "ko");

      if (teamGap !== 0) {
        return teamGap;
      }

      return left.title.localeCompare(right.title, "ko");
    });
  }

  return sorted;
}

function optionNode(value, label) {
  return createElement("option", { value }, label);
}

function Header({ summary }) {
  return createElement(
    "header",
    { className: "app-hero" },
    createElement(
      "div",
      { className: "app-hero-copy" },
      createElement("p", { className: "eyebrow" }, "Week 5 Mini React"),
      createElement("h1", {}, "수요 코딩회 보드"),
      createElement(
        "p",
        { className: "hero-description" },
        "루트 state와 custom hooks, 기존 Virtual DOM diff/patch를 한 화면에서 검증하는 작업 보드입니다.",
      ),
    ),
    createElement(
      "div",
      { className: "hero-badges" },
      createElement("span", { className: "badge" }, `남은 작업 ${summary.remaining}개`),
      createElement("span", { className: "badge" }, `완료율 ${summary.completion}%`),
    ),
  );
}

function SummaryCards({ summary }) {
  const cards = [
    { id: "summary-total", label: "전체 작업", value: summary.total },
    { id: "summary-done", label: "완료", value: summary.done },
    { id: "summary-remaining", label: "진행 중", value: summary.remaining },
    { id: "summary-completion", label: "완료율", value: `${summary.completion}%` },
  ];

  return createElement(
    "section",
    { className: "summary-grid" },
    cards.map((card) =>
      createElement(
        "article",
        { className: "summary-card" },
        createElement("span", { className: "summary-label" }, card.label),
        createElement("strong", { id: card.id, className: "summary-value" }, String(card.value)),
      )),
  );
}

function Composer({
  titleInput,
  teamInput,
  priorityInput,
  onTitleInput,
  onTeamInput,
  onPriorityInput,
  onAddTask,
}) {
  return createElement(
    "section",
    { className: "surface-card composer-card" },
    createElement("h2", {}, "작업 추가"),
    createElement(
      "div",
      { className: "field-grid" },
      createElement(
        "label",
        { className: "field" },
        createElement("span", {}, "작업명"),
        createElement("input", {
          id: "task-title-input",
          className: "text-input",
          placeholder: "예: useEffect cleanup 검증",
          value: titleInput,
          oninput: onTitleInput,
        }),
      ),
      createElement(
        "label",
        { className: "field" },
        createElement("span", {}, "담당 팀"),
        createElement(
          "select",
          {
            id: "task-team-select",
            className: "select-input",
            value: teamInput,
            onchange: onTeamInput,
          },
          TEAM_OPTIONS.map((team) => optionNode(team, team)),
        ),
      ),
      createElement(
        "label",
        { className: "field" },
        createElement("span", {}, "우선순위"),
        createElement(
          "select",
          {
            id: "task-priority-select",
            className: "select-input",
            value: priorityInput,
            onchange: onPriorityInput,
          },
          [
            optionNode("high", "높음"),
            optionNode("medium", "보통"),
            optionNode("low", "낮음"),
          ],
        ),
      ),
    ),
    createElement(
      "button",
      {
        id: "add-task-button",
        className: "primary-button",
        onclick: onAddTask,
      },
      "작업 등록",
    ),
  );
}

function FilterBar({
  teamFilter,
  statusFilter,
  sortMode,
  searchQuery,
  onTeamFilter,
  onStatusFilter,
  onSortMode,
  onSearch,
  visibleCount,
}) {
  return createElement(
    "section",
    { className: "surface-card filter-card" },
    createElement(
      "div",
      { className: "filter-header" },
      createElement("h2", {}, "보기 옵션"),
      createElement("span", { className: "filter-count" }, `${visibleCount}개 표시 중`),
    ),
    createElement(
      "div",
      { className: "field-grid compact" },
      createElement(
        "label",
        { className: "field" },
        createElement("span", {}, "팀"),
        createElement(
          "select",
          {
            id: "team-filter-select",
            className: "select-input",
            value: teamFilter,
            onchange: onTeamFilter,
          },
          [
            optionNode("all", "전체"),
            ...TEAM_OPTIONS.map((team) => optionNode(team, team)),
          ],
        ),
      ),
      createElement(
        "label",
        { className: "field" },
        createElement("span", {}, "상태"),
        createElement(
          "select",
          {
            id: "status-filter-select",
            className: "select-input",
            value: statusFilter,
            onchange: onStatusFilter,
          },
          [
            optionNode("all", "전체"),
            optionNode("todo", "진행 중"),
            optionNode("done", "완료"),
          ],
        ),
      ),
      createElement(
        "label",
        { className: "field" },
        createElement("span", {}, "정렬"),
        createElement(
          "select",
          {
            id: "sort-select",
            className: "select-input",
            value: sortMode,
            onchange: onSortMode,
          },
          [
            optionNode("latest", "최신순"),
            optionNode("priority", "우선순위"),
            optionNode("team", "팀순"),
          ],
        ),
      ),
      createElement(
        "label",
        { className: "field field-search" },
        createElement("span", {}, "검색"),
        createElement("input", {
          id: "search-input",
          className: "text-input",
          placeholder: "작업명 또는 팀명",
          value: searchQuery,
          oninput: onSearch,
        }),
      ),
    ),
  );
}

function TaskCard({ task, onToggle }) {
  const statusLabel = task.done ? "완료" : "진행 중";
  const toggleLabel = task.done ? "다시 열기" : "완료 처리";

  return createElement(
    "article",
    {
      className: task.done ? "task-card done" : "task-card",
      "data-task-card": "true",
    },
    createElement(
      "div",
      { className: "task-card-top" },
      createElement(
        "div",
        { className: "task-title-block" },
        createElement("strong", { "data-task-title": "true" }, task.title),
        createElement("span", { className: "task-meta" }, `${task.team} · ${statusLabel}`),
      ),
      createElement("span", { className: `priority-chip ${task.priority}` }, PRIORITY_LABELS[task.priority]),
    ),
    createElement(
      "div",
      { className: "task-card-bottom" },
      createElement(
        "button",
        {
          className: "ghost-button",
          "data-toggle-task": task.id,
          onclick: () => onToggle(task.id),
        },
        toggleLabel,
      ),
    ),
  );
}

function EmptyState() {
  return createElement(
    "div",
    { className: "empty-state" },
    createElement("strong", {}, "조건에 맞는 작업이 없습니다."),
    createElement("p", {}, "필터를 풀거나 새 작업을 추가해 흐름을 다시 확인해 보세요."),
  );
}

function TaskList({ tasks, onToggle }) {
  if (tasks.length === 0) {
    return createElement(EmptyState, {});
  }

  return createElement(
    "section",
    { className: "task-list" },
    tasks.map((task) => createElement(TaskCard, { task, onToggle })),
  );
}

function DebugSection({ title, sectionId, items }) {
  return createElement(
    "section",
    { className: "debug-section" },
    createElement("h3", {}, title),
    createElement(
      "ul",
      { id: sectionId, className: "debug-list" },
      items.length > 0
        ? items.map((item) => createElement("li", {}, item))
        : [createElement("li", {}, "기록 없음")],
    ),
  );
}

function formatHookSummary(hook) {
  if (hook.kind === "state") {
    return `state #${hook.index}: ${JSON.stringify(hook.value)}`;
  }

  if (hook.kind === "memo") {
    return `memo #${hook.index}: ${JSON.stringify(hook.value)}`;
  }

  if (hook.kind === "effect") {
    return `effect #${hook.index}: deps=${JSON.stringify(hook.deps ?? [])}`;
  }

  return `${hook.kind} #${hook.index}`;
}

export function buildDebugPanelVdom(snapshot) {
  const hookItems = snapshot.hooks.map(formatHookSummary);

  return createElement(
    "div",
    { className: "debug-panel" },
    createElement(
      "div",
      { className: "debug-header" },
      createElement("h2", {}, "Runtime Debug"),
      createElement("strong", { id: "debug-render-count" }, `Render Count ${snapshot.renderCount}`),
    ),
    createElement(DebugSection, {
      title: "Hook Slots",
      sectionId: "debug-hooks",
      items: hookItems,
    }),
    createElement(DebugSection, {
      title: "Patch Log",
      sectionId: "debug-last-patches",
      items: snapshot.patchLog,
    }),
    createElement(DebugSection, {
      title: "Effect Log",
      sectionId: "debug-effect-log",
      items: snapshot.effectLog,
    }),
  );
}

export function CodingBoardApp({
  tasks,
  titleInput,
  teamInput,
  priorityInput,
  teamFilter,
  statusFilter,
  sortMode,
  searchQuery,
  summary,
  visibleTasks,
  onTitleInput,
  onTeamInput,
  onPriorityInput,
  onAddTask,
  onTeamFilter,
  onStatusFilter,
  onSortMode,
  onSearch,
  onToggleTask,
}) {
  return createElement(
    "div",
    { className: "board-app" },
    createElement(Header, { summary }),
    createElement(SummaryCards, { summary }),
    createElement(
      "div",
      { className: "board-content" },
      createElement(
        "div",
        { className: "board-left" },
        createElement(Composer, {
          titleInput,
          teamInput,
          priorityInput,
          onTitleInput,
          onTeamInput,
          onPriorityInput,
          onAddTask,
        }),
        createElement(FilterBar, {
          teamFilter,
          statusFilter,
          sortMode,
          searchQuery,
          onTeamFilter,
          onStatusFilter,
          onSortMode,
          onSearch,
          visibleCount: visibleTasks.length,
        }),
      ),
      createElement(
        "div",
        { className: "board-right" },
        createElement(
          "section",
          { className: "surface-card task-panel" },
          createElement(
            "div",
            { className: "task-panel-header" },
            createElement("h2", {}, "작업 현황"),
            createElement("span", { className: "task-panel-meta" }, `총 ${tasks.length}개 작업`),
          ),
          createElement(TaskList, { tasks: visibleTasks, onToggle: onToggleTask }),
        ),
      ),
    ),
  );
}

export function createBoardProps(state, actions) {
  return {
    ...state,
    ...actions,
  };
}

export function createTaskDraft(title, team, priority) {
  return {
    id: createTaskId(),
    title: title.trim(),
    team,
    priority,
    done: false,
  };
}
