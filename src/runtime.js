import { elementNode, textNode } from "./constants.js";
import { applyPatches } from "./lib/applyPatches.js";
import { diff } from "./lib/diff.js";
import { renderTo } from "./lib/renderTo.js";

let currentComponent = null;

export class FunctionComponent {
  constructor(componentFn, container = null) {
    if (typeof componentFn !== "function") {
      throw new TypeError("FunctionComponent는 함수형 컴포넌트를 받아야 합니다.");
    }

    this.componentFn = componentFn;
    this.container = container;
    this.hooks = [];
    this.hookIndex = 0;
    this.pendingEffects = [];
    this.prevVdom = null;
    this.rootDom = null;
    this.updateScheduled = false;
    this.renderCount = 0;
    this.lastPatchCount = 0;
  }

  mount(container = this.container) {
    if (!(container instanceof Element)) {
      throw new TypeError("mount 대상은 Element여야 합니다.");
    }

    this.container = container;
    this.hookIndex = 0;
    this.pendingEffects = [];
    currentComponent = this;
    let newVdom;

    try {
      newVdom = this.componentFn();
    } finally {
      currentComponent = null;
    }

    renderTo(this.container, newVdom);
    this.prevVdom = newVdom;
    this.rootDom = this.container.firstChild;
    this.renderCount += 1;
    this.lastPatchCount = 0;
    this.runEffects();

    return this.rootDom;
  }

  update() {
    if (!(this.container instanceof Element)) {
      throw new Error("update() 전에 mount()가 먼저 호출되어야 합니다.");
    }

    if (this.prevVdom == null) {
      return this.mount();
    }

    this.hookIndex = 0;
    this.pendingEffects = [];
    currentComponent = this;
    let newVdom;

    try {
      newVdom = this.componentFn();
    } finally {
      currentComponent = null;
    }

    const patches = diff(this.prevVdom, newVdom);

    if (!this.rootDom) {
      renderTo(this.container, newVdom);
      this.rootDom = this.container.firstChild;
    } else if (patches.length > 0) {
      this.rootDom = applyPatches(this.rootDom, patches);

      if (this.rootDom == null) {
        this.container.replaceChildren();
      }
    }

    this.prevVdom = newVdom;
    this.renderCount += 1;
    this.lastPatchCount = patches.length;
    this.runEffects();

    return this.rootDom;
  }

  scheduleUpdate() {
    if (this.updateScheduled) {
      return;
    }

    this.updateScheduled = true;

    queueMicrotask(() => {
      this.updateScheduled = false;

      if (this.container) {
        this.update();
      }
    });
  }

  runEffects() {
    for (const effectJob of this.pendingEffects) {
      const hook = this.hooks[effectJob.index];

      if (typeof hook.cleanup === "function") {
        hook.cleanup();
      }

      const cleanup = effectJob.callback();
      hook.cleanup = typeof cleanup === "function" ? cleanup : null;
      hook.deps = cloneDependencies(effectJob.deps);
    }

    this.pendingEffects = [];
  }

  unmount() {
    for (const hook of this.hooks) {
      if (hook?.kind === "effect" && typeof hook.cleanup === "function") {
        hook.cleanup();
      }
    }

    this.container?.replaceChildren();
    this.prevVdom = null;
    this.rootDom = null;
    this.pendingEffects = [];
    this.updateScheduled = false;
  }
}

export function useState(initialValue) {
  const { component, hook } = getHookSlot("state");

  if (!hook.initialized) {
    hook.initialized = true;
    hook.value =
      typeof initialValue === "function" ? initialValue() : initialValue;
    hook.setState = (nextValue) => {
      const resolvedValue =
        typeof nextValue === "function" ? nextValue(hook.value) : nextValue;

      if (Object.is(hook.value, resolvedValue)) {
        return;
      }

      hook.value = resolvedValue;
      component.scheduleUpdate();
    };
  }

  return [hook.value, hook.setState];
}

export function useEffect(callback, deps) {
  if (typeof callback !== "function") {
    throw new TypeError("useEffect는 effect 함수를 받아야 합니다.");
  }

  const { component, index, hook } = getHookSlot("effect");
  const nextDeps = normalizeDependencies(deps, "useEffect");

  if (!hook.initialized) {
    hook.initialized = true;
    hook.cleanup = null;
  }

  if (haveDependenciesChanged(hook.deps, nextDeps)) {
    component.pendingEffects.push({
      index,
      callback,
      deps: nextDeps,
    });
  }
}

export function useMemo(factory, deps) {
  if (typeof factory !== "function") {
    throw new TypeError("useMemo는 계산 함수를 받아야 합니다.");
  }

  const { hook } = getHookSlot("memo");
  const nextDeps = normalizeDependencies(deps, "useMemo");

  if (!hook.initialized || haveDependenciesChanged(hook.deps, nextDeps)) {
    hook.initialized = true;
    hook.value = factory();
    hook.deps = cloneDependencies(nextDeps);
  }

  return hook.value;
}

export function h(type, props, ...children) {
  if (typeof type !== "string") {
    throw new TypeError("이 Mini React 구현은 문자열 태그만 지원합니다.");
  }

  return elementNode(type, props ?? {}, normalizeChildren(children));
}

function getHookSlot(kind) {
  const component = getCurrentComponent(kind);
  const index = component.hookIndex;
  component.hookIndex += 1;

  if (!component.hooks[index]) {
    component.hooks[index] = { kind };
  }

  const hook = component.hooks[index];

  if (hook.kind !== kind) {
    throw new Error("Hook은 모든 렌더에서 같은 순서로 호출되어야 합니다.");
  }

  return { component, index, hook };
}

function getCurrentComponent(hookName) {
  if (!currentComponent) {
    throw new Error(`${hookName}은 루트 App 렌더 중에만 사용할 수 있습니다.`);
  }

  return currentComponent;
}

function normalizeChildren(children) {
  const normalized = [];

  for (const child of children.flat(Infinity)) {
    if (child == null || child === false || child === true) {
      continue;
    }

    if (typeof child === "string" || typeof child === "number") {
      normalized.push(textNode(String(child)));
      continue;
    }

    normalized.push(child);
  }

  return normalized;
}

function normalizeDependencies(deps, hookName) {
  if (deps === undefined) {
    return undefined;
  }

  if (!Array.isArray(deps)) {
    throw new TypeError(`${hookName}의 dependency는 배열이어야 합니다.`);
  }

  return [...deps];
}

function haveDependenciesChanged(previousDeps, nextDeps) {
  if (nextDeps === undefined || previousDeps === undefined) {
    return true;
  }

  if (previousDeps.length !== nextDeps.length) {
    return true;
  }

  for (let index = 0; index < previousDeps.length; index += 1) {
    if (!Object.is(previousDeps[index], nextDeps[index])) {
      return true;
    }
  }

  return false;
}

function cloneDependencies(deps) {
  return deps === undefined ? undefined : [...deps];
}
