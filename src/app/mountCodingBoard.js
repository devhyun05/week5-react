import { renderTo } from "../lib/renderTo.js";
import {
  FunctionComponent,
  useEffect,
  useMemo,
  useState,
} from "../runtime/index.js";
import {
  STORAGE_KEY,
  CodingBoardApp,
  buildDebugPanelVdom,
  createBoardProps,
  createTaskDraft,
  filterTasks,
  readInitialTasks,
  summarizeTasks,
} from "./codingBoardApp.js";

function BoardRoot() {
  const [tasks, setTasks] = useState(() => readInitialTasks());
  const [titleInput, setTitleInput] = useState("");
  const [teamInput, setTeamInput] = useState("플랫폼");
  const [priorityInput, setPriorityInput] = useState("medium");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");

  const summary = useMemo(() => summarizeTasks(tasks), [tasks]);
  const visibleTasks = useMemo(
    () =>
      filterTasks(tasks, {
        teamFilter,
        statusFilter,
        searchQuery,
        sortMode,
      }),
    [tasks, teamFilter, statusFilter, searchQuery, sortMode],
  );

  useEffect(() => {
    document.title = `남은 작업 ${summary.remaining}개 | 수요 코딩회 보드`;
  }, [summary.remaining]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const actions = {
    onTitleInput: (event) => setTitleInput(event.target.value),
    onTeamInput: (event) => setTeamInput(event.target.value),
    onPriorityInput: (event) => setPriorityInput(event.target.value),
    onTeamFilter: (event) => setTeamFilter(event.target.value),
    onStatusFilter: (event) => setStatusFilter(event.target.value),
    onSortMode: (event) => setSortMode(event.target.value),
    onSearch: (event) => setSearchQuery(event.target.value),
    onToggleTask: (taskId) => {
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId
            ? { ...task, done: !task.done }
            : task,
        ),
      );
    },
    onAddTask: () => {
      const normalizedTitle = titleInput.trim();

      if (!normalizedTitle) {
        return;
      }

      setTasks((currentTasks) => [
        ...currentTasks,
        createTaskDraft(normalizedTitle, teamInput, priorityInput),
      ]);
      setTitleInput("");
    },
  };

  return CodingBoardApp(
    createBoardProps(
      {
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
      },
      actions,
    ),
  );
}

export function mountCodingBoard({ appRoot, debugRoot }) {
  const instance = new FunctionComponent(BoardRoot, {}, {
    onCommit(snapshot) {
      if (debugRoot) {
        renderTo(debugRoot, buildDebugPanelVdom(snapshot));
      }
    },
  });

  instance.mount(appRoot);

  return { instance };
}

export { STORAGE_KEY };
