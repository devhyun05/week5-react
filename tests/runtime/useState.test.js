// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  FunctionComponent,
  createElement,
  useState,
} from "../../src/runtime/index.js";

describe("useState", () => {
  it("state를 유지하고 functional update로 화면을 다시 그린다", () => {
    let increment = () => {};

    function App() {
      const [count, setCount] = useState(0);
      increment = () => setCount((value) => value + 1);

      return createElement("button", { id: "count" }, String(count));
    }

    const container = document.createElement("div");
    const instance = new FunctionComponent(App);

    instance.mount(container);
    increment();
    increment();

    expect(container.querySelector("#count")?.textContent).toBe("2");
    expect(instance.getDebugSnapshot().renderCount).toBe(3);
  });

  it("같은 값을 다시 설정하면 재렌더링하지 않는다", () => {
    let setValue = () => {};

    function App() {
      const [value, setState] = useState(3);
      setValue = setState;

      return createElement("p", { id: "value" }, String(value));
    }

    const container = document.createElement("div");
    const instance = new FunctionComponent(App);

    instance.mount(container);
    setValue(3);

    expect(container.querySelector("#value")?.textContent).toBe("3");
    expect(instance.getDebugSnapshot().renderCount).toBe(1);
  });

  it("반복 렌더된 자식 컴포넌트가 key 기준으로 독립 state를 유지한다", () => {
    let addTask = () => {};
    const toggles = new Map();

    function TodoItem({ task }) {
      const [done, setDone] = useState(false);
      toggles.set(task.id, () => setDone((value) => !value));

      return createElement(
        "button",
        { id: `task-${task.id}` },
        `${task.title}:${done ? "done" : "todo"}`,
      );
    }

    function App() {
      const [tasks, setTasks] = useState([
        { id: "a", title: "첫 번째" },
        { id: "b", title: "두 번째" },
      ]);

      addTask = () =>
        setTasks((currentTasks) => [
          ...currentTasks,
          {
            id: `task-${currentTasks.length + 1}`,
            title: `추가 ${currentTasks.length + 1}`,
          },
        ]);

      return createElement(
        "div",
        {},
        tasks.map((task) =>
          createElement(TodoItem, { key: task.id, task })),
      );
    }

    const container = document.createElement("div");
    const instance = new FunctionComponent(App);

    instance.mount(container);
    addTask();
    toggles.get("b")();

    expect(container.querySelector("#task-a")?.textContent).toBe("첫 번째:todo");
    expect(container.querySelector("#task-b")?.textContent).toBe("두 번째:done");
    expect(container.querySelector("#task-task-3")?.textContent).toBe("추가 3:todo");

    const childHooks = instance
      .getDebugSnapshot()
      .hooks.filter((hook) => hook.componentLabel.startsWith("TodoItem"));

    expect(childHooks).toHaveLength(3);
    expect(new Set(childHooks.map((hook) => hook.componentLabel)).size).toBe(3);
  });

  it("렌더 바깥에서 useState를 호출하면 에러를 던진다", () => {
    expect(() => useState(0)).toThrowError(
      new Error("Hooks can only be used while rendering a component."),
    );
  });
});
