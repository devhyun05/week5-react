// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STORAGE_KEY,
  mountCodingBoard,
} from "../../src/app/mountCodingBoard.js";

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function changeValue(element, value, type = "input") {
  element.value = value;
  element.dispatchEvent(new Event(type, { bubbles: true }));
}

function click(element) {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function getTaskCards(root) {
  return Array.from(root.querySelectorAll("[data-task-card]"));
}

function findTaskCard(root, title) {
  return getTaskCards(root).find((card) => card.textContent.includes(title));
}

function getHookCards(root) {
  return Array.from(root.querySelectorAll("[data-hook-card]"));
}

function getHookCard(root, kind, index) {
  return root.querySelector(
    `[data-hook-kind="${kind}"][data-hook-index="${String(index)}"]`,
  );
}

describe("수요 코딩회 보드", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
    });
    document.body.innerHTML = `
      <div id="app-root"></div>
      <div id="debug-root"></div>
    `;
    localStorage.clear();
    document.title = "before";
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("초기 렌더에서 요약 카드, 작업 카드, 디버그 패널을 보여준다", () => {
    const appRoot = document.querySelector("#app-root");
    const debugRoot = document.querySelector("#debug-root");

    mountCodingBoard({ appRoot, debugRoot });

    expect(appRoot.querySelector("h1")?.textContent).toContain("수요 코딩회");
    expect(getTaskCards(appRoot).length).toBeGreaterThan(0);
    expect(debugRoot.textContent).toContain("Render Count");
    expect(document.title).toContain("남은 작업");
  });

  it("Hook Slots를 카드 구조로 보여주고 hook 종류와 slot index를 분리해 표시한다", () => {
    const appRoot = document.querySelector("#app-root");
    const debugRoot = document.querySelector("#debug-root");

    mountCodingBoard({ appRoot, debugRoot });

    const hookCards = getHookCards(debugRoot);
    const stateCard = getHookCard(debugRoot, "state", 0);
    const memoCard = getHookCard(debugRoot, "memo", 5);
    const effectCard = getHookCard(debugRoot, "effect", 7);

    expect(hookCards.length).toBeGreaterThan(0);
    expect(debugRoot.querySelector("#debug-hooks")?.classList.contains("debug-hook-grid")).toBe(true);
    expect(stateCard?.querySelector(".debug-kind-badge")?.textContent).toBe("State");
    expect(stateCard?.querySelector(".debug-hook-slot")?.textContent).toBe("Slot #0");
    expect(stateCard?.querySelector(".debug-hook-owner")?.textContent).toBe("BoardRoot");
    expect(stateCard?.querySelector("[data-hook-preview]")?.textContent).toContain("Array(");
    expect(memoCard?.querySelector(".debug-kind-badge")?.textContent).toBe("Memo");
    expect(effectCard?.querySelector(".debug-kind-badge")?.textContent).toBe("Effect");
  });

  it("새 작업을 추가하고 완료 처리하면 요약, title, localStorage, debug 패널이 함께 갱신된다", () => {
    const appRoot = document.querySelector("#app-root");
    const debugRoot = document.querySelector("#debug-root");

    mountCodingBoard({ appRoot, debugRoot });

    changeValue(appRoot.querySelector("#task-title-input"), "API 문서 정리");
    changeValue(appRoot.querySelector("#task-team-select"), "플랫폼", "change");
    changeValue(appRoot.querySelector("#task-priority-select"), "high", "change");
    click(appRoot.querySelector("#add-task-button"));

    const addedCard = getTaskCards(appRoot).find((card) =>
      card.textContent.includes("API 문서 정리"),
    );

    expect(addedCard).toBeTruthy();
    click(addedCard.querySelector("[data-toggle-task]"));

    expect(appRoot.querySelector("#summary-total")?.textContent).not.toBe("0");
    expect(document.title).toContain("남은 작업");
    expect(localStorage.getItem(STORAGE_KEY)).toContain("API 문서 정리");
    expect(debugRoot.textContent).toContain("ADD");
  });

  it("팀 필터, 상태 필터, 검색, 정렬을 조합해 표시 목록을 바꾼다", () => {
    const appRoot = document.querySelector("#app-root");
    const debugRoot = document.querySelector("#debug-root");

    mountCodingBoard({ appRoot, debugRoot });

    changeValue(appRoot.querySelector("#team-filter-select"), "플랫폼", "change");
    changeValue(appRoot.querySelector("#status-filter-select"), "todo", "change");
    changeValue(appRoot.querySelector("#search-input"), "발표");
    changeValue(appRoot.querySelector("#sort-select"), "priority", "change");

    const cards = getTaskCards(appRoot);

    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain("발표");
    expect(getHookCard(debugRoot, "memo", 6)?.textContent).toContain("Slot #6");
  });

  it("긴 state는 요약 preview와 detail block으로 나누고 Patch Log와 Effect Log를 유지한다", () => {
    const appRoot = document.querySelector("#app-root");
    const debugRoot = document.querySelector("#debug-root");

    mountCodingBoard({ appRoot, debugRoot });

    changeValue(appRoot.querySelector("#task-title-input"), "아주 긴 디버그 패널 제목 검증용 작업입니다");
    click(appRoot.querySelector("#add-task-button"));
    changeValue(appRoot.querySelector("#task-title-input"), "두 번째 긴 작업으로 hook summary sample을 넓혀봅니다");
    click(appRoot.querySelector("#add-task-button"));

    const stateCard = getHookCard(debugRoot, "state", 0);

    expect(stateCard?.querySelector("[data-hook-preview]")?.textContent).toContain("Array(");
    expect(stateCard?.textContent).not.toContain("state #0:");
    expect(stateCard?.querySelectorAll("[data-hook-detail]").length).toBeGreaterThan(0);
    expect(debugRoot.querySelector("#debug-last-patches")?.textContent).toContain("ADD");
    expect(debugRoot.querySelector("#debug-effect-log")?.textContent).toContain("run[8]");
  });

  it("저장된 task id가 중복되어 있어도 mount 시 정리되어 완료 상태가 섞이지 않는다", () => {
    const savedTasks = [
      {
        id: "task-1001",
        title: "사용자 작업 A",
        team: "플랫폼",
        priority: "medium",
        done: false,
      },
      {
        id: "task-1001",
        title: "사용자 작업 B",
        team: "프론트",
        priority: "high",
        done: false,
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTasks));

    const appRoot = document.querySelector("#app-root");
    const debugRoot = document.querySelector("#debug-root");

    mountCodingBoard({ appRoot, debugRoot });

    click(findTaskCard(appRoot, "사용자 작업 A").querySelector("[data-toggle-task]"));

    expect(findTaskCard(appRoot, "사용자 작업 A")?.textContent).toContain("완료");
    expect(findTaskCard(appRoot, "사용자 작업 B")?.textContent).toContain("진행 중");

    const persistedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY));

    expect(new Set(persistedTasks.map((task) => task.id)).size).toBe(persistedTasks.length);
  });

  it("새 작업은 저장된 사용자 작업 다음 고유 id를 사용한다", async () => {
    vi.resetModules();

    const persistedTasks = [
      {
        id: "task-1001",
        title: "저장된 사용자 작업",
        team: "플랫폼",
        priority: "medium",
        done: false,
      },
    ];

    const { createTaskDraft } = await import("../../src/app/codingBoardApp.js");

    const draft = createTaskDraft("새 작업", "프론트", "high", persistedTasks);

    expect(draft.id).toBe("task-1002");
  });

  it("localStorage에 저장된 작업이 있으면 그 값으로 시작한다", () => {
    const savedTasks = [
      {
        id: "saved-1",
        title: "저장된 작업",
        team: "플랫폼",
        priority: "medium",
        done: false,
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTasks));

    const appRoot = document.querySelector("#app-root");
    const debugRoot = document.querySelector("#debug-root");

    mountCodingBoard({ appRoot, debugRoot });

    expect(getTaskCards(appRoot)).toHaveLength(1);
    expect(appRoot.textContent).toContain("저장된 작업");
    expect(debugRoot.textContent).toContain("Render Count");
  });
});
