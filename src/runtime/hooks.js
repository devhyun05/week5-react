import { canUseHooks, getCurrentInstance } from "./context.js";

function getHookInstance() {
  if (!canUseHooks()) {
    throw new Error(
      "Hooks can only be used in the root component for this assignment.",
    );
  }

  return getCurrentInstance();
}

function assertHookType(hook, expectedType) {
  if (hook && hook.type !== expectedType) {
    throw new Error("Hook order changed between renders.");
  }
}

function areDepsEqual(previousDeps, nextDeps) {
  if (!Array.isArray(previousDeps) || !Array.isArray(nextDeps)) {
    return false;
  }

  if (previousDeps.length !== nextDeps.length) {
    return false;
  }

  return previousDeps.every((value, index) => Object.is(value, nextDeps[index]));
}

export function useState(initialValue) {
  const instance = getHookInstance();
  const index = instance.hookIndex++;
  const existingHook = instance.hooks[index];

  assertHookType(existingHook, "state");

  if (!existingHook) {
    const value =
      typeof initialValue === "function" ? initialValue() : initialValue;
    const hook = {
      type: "state",
      value,
      setValue: null,
    };

    hook.setValue = (nextValue) => {
      const resolvedValue =
        typeof nextValue === "function" ? nextValue(hook.value) : nextValue;

      if (Object.is(resolvedValue, hook.value)) {
        return;
      }

      hook.value = resolvedValue;
      instance.scheduleUpdate();
    };

    instance.hooks[index] = hook;
  }

  return [instance.hooks[index].value, instance.hooks[index].setValue];
}

export function useEffect(effect, deps) {
  const instance = getHookInstance();
  const index = instance.hookIndex++;
  const existingHook = instance.hooks[index];

  assertHookType(existingHook, "effect");

  if (!existingHook) {
    instance.hooks[index] = {
      type: "effect",
      deps: undefined,
      cleanup: null,
    };
  }

  const hook = instance.hooks[index];
  const normalizedDeps = Array.isArray(deps) ? [...deps] : undefined;
  const shouldRun =
    normalizedDeps === undefined || !areDepsEqual(hook.deps, normalizedDeps);

  if (shouldRun) {
    instance.registerEffect({
      index,
      effect,
      deps: normalizedDeps,
    });
  }
}

export function useMemo(factory, deps) {
  const instance = getHookInstance();
  const index = instance.hookIndex++;
  const existingHook = instance.hooks[index];

  assertHookType(existingHook, "memo");

  const normalizedDeps = Array.isArray(deps) ? [...deps] : undefined;

  if (!existingHook) {
    const value = factory();

    instance.hooks[index] = {
      type: "memo",
      deps: normalizedDeps,
      value,
    };

    return value;
  }

  if (normalizedDeps === undefined || !areDepsEqual(existingHook.deps, normalizedDeps)) {
    existingHook.value = factory();
    existingHook.deps = normalizedDeps;
  }

  return existingHook.value;
}
