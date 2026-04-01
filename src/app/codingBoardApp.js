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

function getTaskSequenceFromId(taskId) {
  const matched = /^task-(\d+)$/.exec(taskId);

  if (!matched) {
    return null;
  }

  const parsed = Number.parseInt(matched[1], 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function syncTaskSequence(tasks) {
  for (const task of tasks) {
    const sequence = getTaskSequenceFromId(task.id);

    if (sequence === null) {
      continue;
    }

    taskSequence = Math.max(taskSequence, sequence);
  }
}

function createUniqueTaskId(existingIds) {
  let nextId = createTaskId();

  while (existingIds.has(nextId)) {
    nextId = createTaskId();
  }

  existingIds.add(nextId);
  return nextId;
}

function ensureUniqueTaskIds(tasks) {
  syncTaskSequence(tasks);

  const seenIds = new Set();

  return tasks.map((task) => {
    if (!seenIds.has(task.id)) {
      seenIds.add(task.id);
      return task;
    }

    return {
      ...task,
      id: createUniqueTaskId(seenIds),
    };
  });
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
      return ensureUniqueTaskIds(createSampleTasks());
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return createSampleTasks();
    }

    const savedTasks = parsed.filter(isTask);

    return savedTasks.length > 0
      ? ensureUniqueTaskIds(savedTasks)
      : ensureUniqueTaskIds(createSampleTasks());
  } catch {
    return ensureUniqueTaskIds(createSampleTasks());
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

function Composer({ onAddTask }) {
  return createElement(
    "form",
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
          name: "taskTitle",
          className: "text-input",
          placeholder: "예: useEffect cleanup 검증",
          defaultValue: "",
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
            name: "taskTeam",
            className: "select-input",
            defaultValue: "플랫폼",
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
            name: "taskPriority",
            className: "select-input",
            defaultValue: "medium",
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
        type: "button",
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
    tasks.map((task) => createElement(TaskCard, { key: task.id, task, onToggle })),
  );
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function safeSerializeDebugValue(value, spacing = 0) {
  if (typeof value === "function") {
    return "[Function]";
  }

  try {
    return JSON.stringify(value, null, spacing) ?? "undefined";
  } catch {
    return String(value);
  }
}

function createArraySample(value) {
  if (value.length === 0) {
    return "[]";
  }

  return truncateText(safeSerializeDebugValue(value.slice(0, 2), 2), 220);
}

function createObjectSample(value) {
  const sample = {};

  Object.keys(value)
    .slice(0, 4)
    .forEach((key) => {
      sample[key] = value[key];
    });

  return truncateText(safeSerializeDebugValue(sample, 2), 220);
}

function summarizeDebugValue(value) {
  if (Array.isArray(value)) {
    return {
      preview: `Array(${value.length})`,
      meta: ["array", `${value.length} items`],
      detailLabel: "Sample items",
      detail: createArraySample(value),
    };
  }

  if (value === null) {
    return {
      preview: "null",
      meta: ["null"],
      detailLabel: "Snapshot",
      detail: "null",
    };
  }

  if (typeof value === "string") {
    return {
      preview: `"${truncateText(value, 64)}"`,
      meta: ["string", `${value.length} chars`],
      detailLabel: "String value",
      detail: truncateText(value, 220),
    };
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return {
      preview: String(value),
      meta: [typeof value],
      detailLabel: "Value",
      detail: String(value),
    };
  }

  if (typeof value === "undefined") {
    return {
      preview: "undefined",
      meta: ["empty"],
      detailLabel: "Snapshot",
      detail: "undefined",
    };
  }

  if (typeof value === "function") {
    return {
      preview: "[Function]",
      meta: ["callable"],
      detailLabel: "Snapshot",
      detail: "[Function]",
    };
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    const keyPreview = keys.length > 0
      ? truncateText(keys.slice(0, 4).join(", "), 48)
      : "";

    return {
      preview: keys.length > 0 ? `Object { ${keyPreview}${keys.length > 4 ? ", ..." : ""} }` : "Object {}",
      meta: ["object", `${keys.length} keys`],
      detailLabel: "Shape preview",
      detail: createObjectSample(value),
    };
  }

  const serialized = safeSerializeDebugValue(value);

  return {
    preview: truncateText(serialized, 64),
    meta: [typeof value],
    detailLabel: "Snapshot",
    detail: truncateText(serialized, 220),
  };
}

function summarizeDependencies(deps) {
  if (deps === undefined) {
    return {
      preview: "No dependency array",
      metaLabel: "runs every render",
      detail: "undefined",
    };
  }

  const summary = summarizeDebugValue(deps);

  return {
    preview: summary.preview,
    metaLabel: `${deps.length} deps`,
    detail: summary.detail,
  };
}

function formatHookKind(kind) {
  return `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
}

function summarizeHook(hook) {
  if (hook.kind === "state") {
    const valueSummary = summarizeDebugValue(hook.value);

    return {
      componentLabel: hook.componentLabel,
      kind: hook.kind,
      index: hook.index,
      preview: valueSummary.preview,
      meta: valueSummary.meta,
      details: [
        {
          label: valueSummary.detailLabel,
          value: valueSummary.detail,
        },
      ],
    };
  }

  if (hook.kind === "memo") {
    const valueSummary = summarizeDebugValue(hook.value);
    const depsSummary = summarizeDependencies(hook.deps);

    return {
      componentLabel: hook.componentLabel,
      kind: hook.kind,
      index: hook.index,
      preview: valueSummary.preview,
      meta: [...valueSummary.meta, depsSummary.metaLabel],
      details: [
        {
          label: valueSummary.detailLabel,
          value: valueSummary.detail,
        },
        {
          label: "Deps snapshot",
          value: depsSummary.detail,
        },
      ],
    };
  }

  if (hook.kind === "effect") {
    const depsSummary = summarizeDependencies(hook.deps);

    return {
      componentLabel: hook.componentLabel,
      kind: hook.kind,
      index: hook.index,
      preview: depsSummary.preview,
      meta: [depsSummary.metaLabel],
      details: [
        {
          label: "Deps snapshot",
          value: depsSummary.detail,
        },
      ],
    };
  }

  return {
    componentLabel: hook.componentLabel,
    kind: hook.kind,
    index: hook.index,
    preview: "Unsupported debug shape",
    meta: [],
    details: [],
  };
}

function DebugSectionFrame({ title, caption, children }) {
  return createElement(
    "section",
    { className: "debug-section" },
    createElement(
      "div",
      { className: "debug-section-header" },
      createElement("h3", {}, title),
      caption ? createElement("span", { className: "debug-section-caption" }, caption) : null,
    ),
    children,
  );
}

function HookSlotCard({ hook }) {
  return createElement(
    "article",
    {
      className: `debug-hook-card ${hook.kind}`,
      "data-hook-card": "true",
      "data-hook-kind": hook.kind,
      "data-hook-index": String(hook.index),
    },
    createElement(
      "div",
      { className: "debug-hook-card-header" },
      createElement(
        "div",
        { className: "debug-hook-card-title" },
        createElement("span", { className: `debug-kind-badge ${hook.kind}` }, formatHookKind(hook.kind)),
        createElement("strong", { className: "debug-hook-slot" }, `Slot #${hook.index}`),
      ),
      createElement("span", { className: "debug-hook-owner" }, hook.componentLabel),
    ),
    createElement("p", { className: "debug-hook-preview", "data-hook-preview": "true" }, hook.preview),
    hook.meta.length > 0
      ? createElement(
        "div",
        { className: "debug-meta-list" },
        hook.meta.map((item) =>
          createElement("span", { className: "debug-meta-pill" }, item)),
      )
      : null,
    hook.details.length > 0
      ? createElement(
        "div",
        { className: "debug-hook-details" },
        hook.details.map((detail) =>
          createElement(
            "div",
            { className: "debug-detail-block" },
            createElement("span", { className: "debug-detail-label" }, detail.label),
            createElement("pre", { className: "debug-detail-code", "data-hook-detail": "true" }, detail.value),
          )),
      )
      : null,
  );
}

function renderHookSlots(hooks) {
  const summarizedHooks = hooks.map(summarizeHook);

  return createElement(
    DebugSectionFrame,
    {
      title: "Hook Slots",
      caption: `${hooks.length} slots`,
    },
    summarizedHooks.length > 0
      ? createElement(
        "div",
        { id: "debug-hooks", className: "debug-hook-grid" },
        summarizedHooks.map((hook) => createElement(HookSlotCard, { hook })),
      )
      : createElement("p", { id: "debug-hooks", className: "debug-empty" }, "활성 hook 없음"),
  );
}

function renderDebugLogSection({ title, sectionId, items }) {
  return createElement(
    DebugSectionFrame,
    {
      title,
      caption: items.length > 0 ? `${items.length} entries` : "No entries",
    },
    items.length > 0
      ? createElement(
        "ol",
        { id: sectionId, className: "debug-log-list" },
        items.map((item, index) =>
          createElement(
            "li",
            { className: "debug-log-item" },
            createElement("span", { className: "debug-log-order" }, String(index + 1).padStart(2, "0")),
            createElement("code", { className: "debug-log-text" }, item),
          )),
      )
      : createElement("p", { id: sectionId, className: "debug-empty" }, "기록 없음"),
  );
}

export function buildDebugPanelVdom(snapshot) {
  return createElement(
    "div",
    { className: "debug-panel" },
    createElement(
      "div",
      { className: "debug-header" },
      createElement(
        "div",
        { className: "debug-header-copy" },
        createElement("h2", {}, "Runtime Debug"),
        createElement("p", { className: "debug-header-description" }, "render 흐름과 hook 상태를 발표용으로 읽기 쉽게 정리한 인스펙터입니다."),
      ),
      createElement(
        "div",
        { className: "debug-header-metrics" },
        createElement("strong", { id: "debug-render-count", className: "debug-metric" }, `Render Count ${snapshot.renderCount}`),
        createElement("span", { className: "debug-metric subtle" }, `Hook Slots ${snapshot.hooks.length}`),
      ),
    ),
    renderHookSlots(snapshot.hooks),
    renderDebugLogSection({
      title: "Patch Log",
      sectionId: "debug-last-patches",
      items: snapshot.patchLog,
    }),
    renderDebugLogSection({
      title: "Effect Log",
      sectionId: "debug-effect-log",
      items: snapshot.effectLog,
    }),
  );
}

export function CodingBoardApp({
  tasks,
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
        createElement(Composer, { onAddTask }),
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

export function createTaskDraft(title, team, priority, existingTasks = []) {
  syncTaskSequence(existingTasks);
  const existingIds = new Set(existingTasks.map((task) => task.id));

  return {
    id: createUniqueTaskId(existingIds),
    title: title.trim(),
    team,
    priority,
    done: false,
  };
}
