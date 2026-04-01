import { elementNode, textNode } from "../constants.js";
import { applyPatches } from "../lib/applyPatches.js";
import { diff } from "../lib/diff.js";
import { renderTo } from "../lib/renderTo.js";

const HOOK_ERROR = "Hooks can only be used in the root component.";

const renderContext = {
  currentInstance: null,
  hookIndex: 0,
  componentDepth: 0,
};

function isVNode(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.nodeType === "string"
  );
}

function normalizeChild(child, bucket) {
  if (Array.isArray(child)) {
    child.forEach((nestedChild) => normalizeChild(nestedChild, bucket));
    return;
  }

  if (child == null || typeof child === "boolean") {
    return;
  }

  if (typeof child === "string" || typeof child === "number") {
    bucket.push(textNode(String(child)));
    return;
  }

  if (isVNode(child)) {
    bucket.push(child);
    return;
  }

  throw new TypeError("Invalid child.");
}

function normalizeChildren(children) {
  const normalized = [];
  children.forEach((child) => normalizeChild(child, normalized));
  return normalized;
}

function normalizeComponentOutput(output) {
  if (isVNode(output)) {
    return output;
  }

  if (typeof output === "string" || typeof output === "number") {
    return textNode(String(output));
  }

  throw new TypeError("Component must return a vnode.");
}

function withChildDepth(callback) {
  renderContext.componentDepth += 1;

  try {
    return callback();
  } finally {
    renderContext.componentDepth -= 1;
  }
}

function depsChanged(previousDeps, nextDeps) {
  if (previousDeps === undefined || nextDeps === undefined) {
    return true;
  }

  if (previousDeps.length !== nextDeps.length) {
    return true;
  }

  return nextDeps.some((value, index) => !Object.is(value, previousDeps[index]));
}

function assertRootHookAccess() {
  if (
    !renderContext.currentInstance ||
    renderContext.componentDepth !== 0
  ) {
    throw new Error(HOOK_ERROR);
  }
}

function getHook(kind, initializer) {
  assertRootHookAccess();

  const instance = renderContext.currentInstance;
  const hookIndex = renderContext.hookIndex;
  const existingHook = instance.hooks[hookIndex];

  renderContext.hookIndex += 1;

  if (!existingHook) {
    const createdHook = initializer(hookIndex, instance);
    instance.hooks[hookIndex] = createdHook;
    return [createdHook, hookIndex];
  }

  if (existingHook.kind !== kind) {
    throw new Error(`Hook order mismatch at index ${hookIndex}.`);
  }

  return [existingHook, hookIndex];
}

function formatDebugValue(value) {
  if (typeof value === "function") {
    return "[Function]";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function createElement(type, props = {}, ...children) {
  const normalizedProps = props ?? {};
  const normalizedChildren = normalizeChildren(children);

  if (typeof type === "function") {
    return withChildDepth(() =>
      normalizeComponentOutput(
        type({
          ...normalizedProps,
          children: normalizedChildren,
        }),
      ),
    );
  }

  return elementNode(type, normalizedProps, normalizedChildren);
}

export class FunctionComponent {
  constructor(Component, props = {}, options = {}) {
    this.Component = Component;
    this.props = props;
    this.options = options;
    this.hooks = [];
    this.pendingEffects = [];
    this.container = null;
    this.rootDom = null;
    this.currentVdom = null;
    this.renderCount = 0;
    this.lastPatches = [];
    this.patchLog = [];
    this.effectLog = [];
  }

  mount(container) {
    this.container = container;

    const nextVdom = this.renderComponent();
    renderTo(container, nextVdom);

    this.currentVdom = nextVdom;
    this.rootDom = container.firstChild;
    this.lastPatches = [];
    this.renderCount += 1;

    this.flushEffects();
    this.notifyCommit();

    return this.rootDom;
  }

  update(nextProps = this.props) {
    this.props = nextProps;

    const nextVdom = this.renderComponent();
    let patches = [];

    if (!this.currentVdom || !this.rootDom) {
      renderTo(this.container, nextVdom);
      this.rootDom = this.container.firstChild;
    } else {
      patches = diff(this.currentVdom, nextVdom);

      if (patches.length > 0) {
        const nextRootDom = applyPatches(this.rootDom, patches);
        this.rootDom = nextRootDom ?? this.container.firstChild;
        this.pushPatchLog(patches);
      }
    }

    this.currentVdom = nextVdom;
    this.lastPatches = patches;
    this.renderCount += 1;

    this.flushEffects();
    this.notifyCommit();

    return this.rootDom;
  }

  renderComponent() {
    this.pendingEffects = [];
    renderContext.currentInstance = this;
    renderContext.hookIndex = 0;
    renderContext.componentDepth = 0;

    try {
      return normalizeComponentOutput(this.Component(this.props ?? {}));
    } finally {
      renderContext.currentInstance = null;
      renderContext.hookIndex = 0;
      renderContext.componentDepth = 0;
    }
  }

  flushEffects() {
    for (const effectRecord of this.pendingEffects) {
      const hook = this.hooks[effectRecord.index];

      if (typeof hook.cleanup === "function") {
        hook.cleanup();
        this.pushEffectLog(`cleanup[${effectRecord.index}]`);
      }

      const cleanup = effectRecord.effect();

      hook.cleanup = typeof cleanup === "function" ? cleanup : null;
      hook.deps = effectRecord.deps === undefined
        ? undefined
        : [...effectRecord.deps];

      this.pushEffectLog(
        `run[${effectRecord.index}] deps=${formatDebugValue(hook.deps)}`,
      );
    }
  }

  pushPatchLog(patches) {
    const summaries = patches.map((patch) =>
      `${patch.type} [${(patch.path ?? []).join(", ")}]`,
    );

    this.patchLog.push(...summaries);
    this.patchLog = this.patchLog.slice(-40);
  }

  pushEffectLog(entry) {
    this.effectLog.push(entry);
    this.effectLog = this.effectLog.slice(-20);
  }

  notifyCommit() {
    this.options.onCommit?.(this.getDebugSnapshot());
  }

  getDebugSnapshot() {
    return {
      renderCount: this.renderCount,
      lastPatches: this.lastPatches.map((patch) => ({ ...patch })),
      patchLog: [...this.patchLog],
      effectLog: [...this.effectLog],
      hooks: this.hooks.map((hook, index) => {
        switch (hook.kind) {
          case "state":
            return { index, kind: "state", value: hook.value };
          case "memo":
            return { index, kind: "memo", value: hook.value, deps: hook.deps };
          case "effect":
            return { index, kind: "effect", deps: hook.deps };
          default:
            return { index, kind: hook.kind };
        }
      }),
    };
  }
}

export function useState(initialValue) {
  const [hook, hookIndex] = getHook("state", (_, instance) => ({
    kind: "state",
    value: typeof initialValue === "function" ? initialValue() : initialValue,
    setter: null,
    owner: instance,
  }));

  if (!hook.setter) {
    hook.setter = (nextValue) => {
      const resolvedValue = typeof nextValue === "function"
        ? nextValue(hook.value)
        : nextValue;

      if (Object.is(hook.value, resolvedValue)) {
        return hook.value;
      }

      hook.value = resolvedValue;
      const instance = hook.owner ?? null;

      if (!instance) {
        throw new Error(`Missing state owner for hook ${hookIndex}.`);
      }

      instance.update();
      return hook.value;
    };
    hook.owner = renderContext.currentInstance;
  }

  return [hook.value, hook.setter];
}

export function useEffect(effect, deps) {
  const [hook, hookIndex] = getHook("effect", () => ({
    kind: "effect",
    deps: undefined,
    cleanup: null,
  }));

  if (depsChanged(hook.deps, deps)) {
    renderContext.currentInstance.pendingEffects.push({
      index: hookIndex,
      effect,
      deps,
    });
  }
}

export function useMemo(factory, deps) {
  const [hook] = getHook("memo", () => ({
    kind: "memo",
    deps: undefined,
    value: undefined,
  }));

  if (depsChanged(hook.deps, deps)) {
    hook.value = factory();
    hook.deps = deps === undefined ? undefined : [...deps];
  }

  return hook.value;
}
