// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  FunctionComponent,
  createElement,
  useEffect,
  useState,
} from "../../src/runtime/index.js";

describe("useEffect", () => {
  it("deps가 바뀌면 cleanup 후 effect를 다시 실행한다", () => {
    const calls = [];
    let setCount = () => {};
    let setFlag = () => {};

    function App() {
      const [count, updateCount] = useState(0);
      const [flag, updateFlag] = useState(false);

      setCount = updateCount;
      setFlag = updateFlag;

      useEffect(() => {
        calls.push(`run:${count}`);
        return () => calls.push(`cleanup:${count}`);
      }, [count]);

      return createElement("div", {}, `${count}-${flag}`);
    }

    const container = document.createElement("div");
    const instance = new FunctionComponent(App);

    instance.mount(container);
    setFlag(true);
    setCount(1);

    expect(calls).toEqual(["run:0", "cleanup:0", "run:1"]);
  });

  it("자식 컴포넌트의 effect가 deps 변경과 unmount에서 cleanup된다", () => {
    const calls = [];
    let updateLabel = () => {};
    let hideChild = () => {};

    function Child({ label }) {
      useEffect(() => {
        calls.push(`run:${label}`);
        return () => calls.push(`cleanup:${label}`);
      }, [label]);

      return createElement("span", { id: "child" }, label);
    }

    function App() {
      const [label, setLabel] = useState("alpha");
      const [visible, setVisible] = useState(true);

      updateLabel = setLabel;
      hideChild = () => setVisible(false);

      return createElement(
        "div",
        {},
        visible ? createElement(Child, { key: "child", label }) : null,
      );
    }

    const container = document.createElement("div");
    const instance = new FunctionComponent(App);

    instance.mount(container);
    updateLabel("beta");
    hideChild();

    expect(calls).toEqual([
      "run:alpha",
      "cleanup:alpha",
      "run:beta",
      "cleanup:beta",
    ]);
  });
});
