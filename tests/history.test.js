import { describe, expect, it } from "vitest";
import { createHistory } from "../src/history.js";
import { elementNode, textNode } from "../src/lib.js";

describe("history", () => {
  it("createHistory 함수가 export된다", () => {
    // given

    // when
    const actual = typeof createHistory;

    // then
    expect(actual).toBe("function");
  });

  it("초기 스냅샷으로 히스토리를 생성하면 첫 항목이 현재 상태가 된다", () => {
    // given
    const initialVdom = elementNode("section", { id: "intro" }, [
      textNode("hello"),
    ]);

    // when
    const history = createHistory(initialVdom);

    // then
    expect(history.current()).toEqual(initialVdom);
    expect(history.currentIndex()).toBe(0);
    expect(history.entries()).toEqual([initialVdom]);
    expect(history.canBack()).toBe(false);
    expect(history.canForward()).toBe(false);
  });

  it("여러 스냅샷이 쌓인 상태에서 뒤로가기와 앞으로가기가 현재 포인터를 이동시킨다", () => {
    // given
    const history = createHistory(elementNode("section", { id: "one" }, []));
    const second = elementNode("section", { id: "two" }, []);
    const third = elementNode("section", { id: "three" }, []);

    // when
    history.push(second);
    history.push(third);
    const previous = history.back();
    const next = history.forward();

    // then
    expect(history.currentIndex()).toBe(2);
    expect(history.canBack()).toBe(true);
    expect(previous).toEqual(second);
    expect(next).toEqual(third);
    expect(history.canForward()).toBe(false);
  });

  it("뒤로간 뒤 새 스냅샷을 push하면 앞으로 갈 기록이 잘린다", () => {
    // given
    const history = createHistory(elementNode("section", { id: "one" }, []));
    const second = elementNode("section", { id: "two" }, []);
    const third = elementNode("section", { id: "three" }, []);
    const replacement = elementNode("section", { id: "replacement" }, []);

    // when
    history.push(second);
    history.push(third);
    history.back();
    history.push(replacement);

    // then
    expect(history.entries()).toEqual([
      elementNode("section", { id: "one" }, []),
      second,
      replacement,
    ]);
    expect(history.canForward()).toBe(false);
    expect(history.current()).toEqual(replacement);
  });

  it("현재값과 엔트리 복사본을 외부에서 수정해도 내부 히스토리는 변하지 않는다", () => {
    // given
    const initialVdom = elementNode("section", { id: "safe" }, [
      elementNode("p", {}, [textNode("immutable")]),
    ]);
    const history = createHistory(initialVdom);

    // when
    const current = history.current();
    const entries = history.entries();

    current.props.id = "mutated";
    entries[0].children[0].children[0].value = "changed";

    // then
    expect(history.current()).toEqual(initialVdom);
    expect(history.entries()).toEqual([initialVdom]);
  });
});
