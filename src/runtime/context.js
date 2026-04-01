let currentInstance = null;
let renderDepth = -1;

export function beginRootRender(instance) {
  currentInstance = instance;
  renderDepth = 0;
}

export function endRootRender() {
  currentInstance = null;
  renderDepth = -1;
}

export function getCurrentInstance() {
  return currentInstance;
}

export function canUseHooks() {
  return currentInstance !== null && renderDepth === 0;
}

export function renderChildComponent(component, props) {
  const previousDepth = renderDepth;
  renderDepth = previousDepth + 1;

  try {
    return component(props);
  } finally {
    renderDepth = previousDepth;
  }
}
