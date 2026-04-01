import { elementNode, textNode } from "../constants.js";
import { applyPatches } from "../lib/applyPatches.js";
import { diff } from "../lib/diff.js";
import { renderTo } from "../lib/renderTo.js";

const HOOK_ERROR = "Hooks can only be used while rendering a component.";

const renderContext = {
  currentComponent: null,
  hookIndex: 0,
};

const componentTypeIds = new WeakMap();
let componentTypeSequence = 0;

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

function depsChanged(previousDeps, nextDeps) {
  if (previousDeps === undefined || nextDeps === undefined) {
    return true;
  }

  if (previousDeps.length !== nextDeps.length) {
    return true;
  }

  return nextDeps.some((value, index) => !Object.is(value, previousDeps[index]));
}

function getComponentTypeId(type) {
  if (!componentTypeIds.has(type)) {
    componentTypeSequence += 1;
    componentTypeIds.set(type, componentTypeSequence);
  }

  return componentTypeIds.get(type);
}

function getComponentName(type) {
  return type.displayName || type.name || "Anonymous";
}

function formatComponentLabel(instance) {
  const name = instance.displayName;

  if (!instance.parent) {
    return name;
  }

  if (instance.key !== null && instance.key !== undefined) {
    return `${name}[key=${String(instance.key)}]`;
  }

  return `${name}[index=${instance.renderSlot}]`;
}

function updateComponentIdentity(instance, { key, renderSlot }) {
  instance.key = key ?? null;
  instance.renderSlot = renderSlot ?? 0;
  instance.debugLabel = formatComponentLabel(instance);
  instance.debugPath = instance.parent
    ? `${instance.parent.debugPath} > ${instance.debugLabel}`
    : instance.debugLabel;
}

function createComponentInstance(type, root, parent, identity) {
  const instance = {
    type,
    displayName: getComponentName(type),
    root,
    parent,
    hooks: [],
    childInstances: new Map(),
    nextChildInstances: null,
    pendingEffects: [],
    key: null,
    renderSlot: 0,
    debugLabel: "",
    debugPath: "",
    childCursor: 0,
  };

  updateComponentIdentity(instance, identity);

  return instance;
}

function getChildInstanceId(type, key, renderSlot) {
  const typeId = getComponentTypeId(type);
  const identity = key === null || key === undefined
    ? `index:${renderSlot}`
    : `key:${String(key)}`;

  return `${typeId}:${identity}`;
}

function prepareComponentRender(instance) {
  instance.pendingEffects = [];
  instance.nextChildInstances = new Map();
  instance.childCursor = 0;
}

function finishComponentRender(instance) {
  for (const [childId, childInstance] of instance.childInstances) {
    if (!instance.nextChildInstances.has(childId)) {
      instance.root.pendingUnmounts.push(childInstance);
    }
  }

  instance.childInstances = instance.nextChildInstances;
  instance.nextChildInstances = null;
}

function cancelComponentRender(instance) {
  instance.pendingEffects = [];
  instance.nextChildInstances = null;
}

function renderWithComponentContext(instance, props) {
  const previousComponent = renderContext.currentComponent;
  const previousHookIndex = renderContext.hookIndex;

  renderContext.currentComponent = instance;
  renderContext.hookIndex = 0;
  prepareComponentRender(instance);

  let completed = false;

  try {
    const output = normalizeComponentOutput(instance.type(props ?? {}));
    completed = true;
    return output;
  } finally {
    if (completed) {
      finishComponentRender(instance);
    } else {
      cancelComponentRender(instance);
    }

    renderContext.currentComponent = previousComponent;
    renderContext.hookIndex = previousHookIndex;
  }
}

function extractComponentProps(props = {}) {
  if (!Object.hasOwn(props, "key")) {
    return {
      componentProps: props,
      key: null,
    };
  }

  const { key, ...componentProps } = props;

  return {
    componentProps,
    key: key ?? null,
  };
}

function renderChildComponent(type, props, children) {
  const parentInstance = renderContext.currentComponent;

  if (!parentInstance) {
    return normalizeComponentOutput(type({
      ...(props ?? {}),
      children,
    }));
  }

  const { componentProps, key } = extractComponentProps(props ?? {});
  const renderSlot = parentInstance.childCursor;

  parentInstance.childCursor += 1;

  const childId = getChildInstanceId(type, key, renderSlot);
  let childInstance = parentInstance.childInstances.get(childId);

  if (!childInstance) {
    childInstance = createComponentInstance(
      type,
      parentInstance.root,
      parentInstance,
      { key, renderSlot },
    );
  } else {
    updateComponentIdentity(childInstance, { key, renderSlot });
  }

  parentInstance.nextChildInstances.set(childId, childInstance);

  return renderWithComponentContext(childInstance, {
    ...componentProps,
    children,
  });
}

function assertHookAccess() {
  if (!renderContext.currentComponent) {
    throw new Error(HOOK_ERROR);
  }
}

function getHook(kind, initializer) {
  assertHookAccess();

  const instance = renderContext.currentComponent;
  const hookIndex = renderContext.hookIndex;
  const existingHook = instance.hooks[hookIndex];

  renderContext.hookIndex += 1;

  if (!existingHook) {
    const createdHook = initializer(hookIndex, instance);
    instance.hooks[hookIndex] = createdHook;
    return [createdHook, hookIndex, instance];
  }

  if (existingHook.kind !== kind) {
    throw new Error(`Hook order mismatch at index ${hookIndex}.`);
  }

  return [existingHook, hookIndex, instance];
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

function collectComponentHooks(instance, bucket) {
  if (instance.hooks.length > 0) {
    bucket.push({
      componentLabel: instance.debugLabel,
      componentPath: instance.debugPath,
      hooks: instance.hooks.map((hook, index) => {
        switch (hook.kind) {
          case "state":
            return {
              index,
              kind: "state",
              value: hook.value,
              componentLabel: instance.debugLabel,
              componentPath: instance.debugPath,
            };
          case "memo":
            return {
              index,
              kind: "memo",
              value: hook.value,
              deps: hook.deps,
              componentLabel: instance.debugLabel,
              componentPath: instance.debugPath,
            };
          case "effect":
            return {
              index,
              kind: "effect",
              deps: hook.deps,
              componentLabel: instance.debugLabel,
              componentPath: instance.debugPath,
            };
          default:
            return {
              index,
              kind: hook.kind,
              componentLabel: instance.debugLabel,
              componentPath: instance.debugPath,
            };
        }
      }),
    });
  }

  for (const childInstance of instance.childInstances.values()) {
    collectComponentHooks(childInstance, bucket);
  }
}

function runUnmountEffects(rootInstance, componentInstance) {
  for (const childInstance of componentInstance.childInstances.values()) {
    runUnmountEffects(rootInstance, childInstance);
  }

  componentInstance.childInstances = new Map();

  componentInstance.hooks.forEach((hook, index) => {
    if (hook.kind !== "effect" || typeof hook.cleanup !== "function") {
      return;
    }

    hook.cleanup();
    hook.cleanup = null;

    rootInstance.pushEffectLog(
      `${componentInstance.debugLabel} cleanup[${index}] (unmount)`,
    );
  });
}

function flushComponentEffects(rootInstance, componentInstance) {
  for (const effectRecord of componentInstance.pendingEffects) {
    const hook = componentInstance.hooks[effectRecord.index];

    if (typeof hook.cleanup === "function") {
      hook.cleanup();
      rootInstance.pushEffectLog(
        `${componentInstance.debugLabel} cleanup[${effectRecord.index}]`,
      );
    }

    const cleanup = effectRecord.effect();

    hook.cleanup = typeof cleanup === "function" ? cleanup : null;
    hook.deps = effectRecord.deps === undefined
      ? undefined
      : [...effectRecord.deps];

    rootInstance.pushEffectLog(
      `${componentInstance.debugLabel} run[${effectRecord.index}] deps=${formatDebugValue(hook.deps)}`,
    );
  }

  componentInstance.pendingEffects = [];

  for (const childInstance of componentInstance.childInstances.values()) {
    flushComponentEffects(rootInstance, childInstance);
  }
}

export function createElement(type, props = {}, ...children) {
  const normalizedProps = props ?? {};
  const normalizedChildren = normalizeChildren(children);

  if (typeof type === "function") {
    return renderChildComponent(type, normalizedProps, normalizedChildren);
  }

  return elementNode(type, normalizedProps, normalizedChildren);
}

export class FunctionComponent {
  constructor(Component, props = {}, options = {}) {
    this.Component = Component;
    this.props = props;
    this.options = options;
    this.rootInstance = createComponentInstance(Component, this, null, {
      key: null,
      renderSlot: 0,
    });
    this.hooks = this.rootInstance.hooks;
    this.pendingUnmounts = [];
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
    this.pendingUnmounts = [];
    return renderWithComponentContext(this.rootInstance, this.props ?? {});
  }

  flushEffects() {
    if (this.pendingUnmounts.length > 0) {
      for (const componentInstance of this.pendingUnmounts) {
        runUnmountEffects(this, componentInstance);
      }

      this.pendingUnmounts = [];
    }

    flushComponentEffects(this, this.rootInstance);
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
    const components = [];
    collectComponentHooks(this.rootInstance, components);

    return {
      renderCount: this.renderCount,
      lastPatches: this.lastPatches.map((patch) => ({ ...patch })),
      patchLog: [...this.patchLog],
      effectLog: [...this.effectLog],
      components,
      hooks: components.flatMap((component) => component.hooks),
    };
  }
}

export function useState(initialValue) {
  const [hook, hookIndex, componentInstance] = getHook(
    "state",
    (_, instance) => ({
      kind: "state",
      value: typeof initialValue === "function" ? initialValue() : initialValue,
      setter: null,
      owner: instance,
    }),
  );

  if (!hook.setter) {
    hook.setter = (nextValue) => {
      const resolvedValue = typeof nextValue === "function"
        ? nextValue(hook.value)
        : nextValue;

      if (Object.is(hook.value, resolvedValue)) {
        return hook.value;
      }

      hook.value = resolvedValue;

      if (!hook.owner?.root) {
        throw new Error(`Missing state owner for hook ${hookIndex}.`);
      }

      hook.owner.root.update();
      return hook.value;
    };
    hook.owner = componentInstance;
  }

  return [hook.value, hook.setter];
}

export function useEffect(effect, deps) {
  const [hook, hookIndex, componentInstance] = getHook("effect", () => ({
    kind: "effect",
    deps: undefined,
    cleanup: null,
  }));

  if (depsChanged(hook.deps, deps)) {
    componentInstance.pendingEffects.push({
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
