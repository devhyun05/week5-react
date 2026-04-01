export function setDomProp(element, key, value) {
  const normalizedKey = key === "class" ? "className" : key;
  const attributeName = normalizedKey === "className" ? "class" : normalizedKey;

  if (isEventProp(normalizedKey)) {
    setEventProp(element, normalizedKey, value);
    return;
  }

  if (normalizedKey === "style" && value && typeof value === "object") {
    Object.assign(element.style, value);
    return;
  }

  if (value === false || value == null) {
    removeDomProp(element, normalizedKey);
    return;
  }

  if (value === true) {
    element.setAttribute(attributeName, "");
    return;
  }

  if (
    normalizedKey in element &&
    typeof value !== "object" &&
    !attributeName.startsWith("data-") &&
    !attributeName.startsWith("aria-")
  ) {
    element[normalizedKey] = value;
    return;
  }

  element.setAttribute(attributeName, String(value));
}

export function removeDomProp(element, key) {
  const normalizedKey = key === "class" ? "className" : key;
  const attributeName = normalizedKey === "className" ? "class" : normalizedKey;

  if (isEventProp(normalizedKey)) {
    removeEventProp(element, normalizedKey);
    return;
  }

  if (normalizedKey === "className") {
    element.className = "";
  } else if (normalizedKey === "value") {
    element.value = "";
  } else if (normalizedKey === "checked") {
    element.checked = false;
  } else if (normalizedKey === "style") {
    element.removeAttribute("style");
    return;
  }

  element.removeAttribute(attributeName);
}

function isEventProp(key) {
  return /^on[A-Z]/.test(key);
}

function setEventProp(element, key, listener) {
  const eventName = key.slice(2).toLowerCase();
  const store = getListenerStore(element);
  const previousListener = store[eventName];

  if (previousListener) {
    element.removeEventListener(eventName, previousListener);
  }

  if (typeof listener === "function") {
    element.addEventListener(eventName, listener);
    store[eventName] = listener;
    return;
  }

  delete store[eventName];
}

function removeEventProp(element, key) {
  const eventName = key.slice(2).toLowerCase();
  const store = getListenerStore(element);
  const previousListener = store[eventName];

  if (previousListener) {
    element.removeEventListener(eventName, previousListener);
    delete store[eventName];
  }
}

function getListenerStore(element) {
  if (!element.__miniReactListeners) {
    Object.defineProperty(element, "__miniReactListeners", {
      value: {},
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }

  return element.__miniReactListeners;
}
