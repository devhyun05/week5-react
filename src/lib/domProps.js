export function setDomProp(element, key, value) {
  const normalizedKey = key === "class" ? "className" : key;
  const propertyKey = normalizedKey.startsWith("on")
    ? normalizedKey.toLowerCase()
    : normalizedKey;
  const attributeName = propertyKey === "className" ? "class" : propertyKey;

  if (propertyKey === "style" && value && typeof value === "object") {
    Object.assign(element.style, value);
    return;
  }

  if (propertyKey.startsWith("on")) {
    element[propertyKey] = typeof value === "function" ? value : null;
    return;
  }

  if (value === false || value == null) {
    removeDomProp(element, propertyKey);
    return;
  }

  if (value === true) {
    element.setAttribute(attributeName, "");
    return;
  }

  if (
    propertyKey in element &&
    typeof value !== "object" &&
    !attributeName.startsWith("data-") &&
    !attributeName.startsWith("aria-")
  ) {
    element[propertyKey] = value;
    return;
  }

  element.setAttribute(attributeName, String(value));
}

export function removeDomProp(element, key) {
  const normalizedKey = key === "class" ? "className" : key;
  const propertyKey = normalizedKey.startsWith("on")
    ? normalizedKey.toLowerCase()
    : normalizedKey;
  const attributeName = propertyKey === "className" ? "class" : propertyKey;

  if (propertyKey.startsWith("on")) {
    element[propertyKey] = null;
    element.removeAttribute(attributeName);
    return;
  }

  if (propertyKey === "className") {
    element.className = "";
  } else if (propertyKey === "value") {
    element.value = "";
  } else if (propertyKey === "checked") {
    element.checked = false;
  } else if (propertyKey === "style") {
    element.removeAttribute("style");
    return;
  }

  element.removeAttribute(attributeName);
}
