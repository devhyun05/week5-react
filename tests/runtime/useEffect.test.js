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

  it("자식 컴포넌트에서 useEffect를 호출하면 루트 전용 에러를 던진다", () => {
    function Child() {
      useEffect(() => {}, []);
      return createElement("span", {}, "child");
    }

    function App() {
      return createElement("div", {}, createElement(Child, {}));
    }

    const container = document.createElement("div");
    const instance = new FunctionComponent(App);

    expect(() => instance.mount(container)).toThrowError(
      new Error("Hooks can only be used in the root component."),
    );
  });
});
