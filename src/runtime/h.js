import { elementNode, textNode } from "../constants.js";
import { renderChildComponent } from "./context.js";

function flattenChildren(children, target = []) {
  for (const child of children) {
    if (Array.isArray(child)) {
      flattenChildren(child, target);
      continue;
    }

    if (child === null || child === undefined || child === false) {
      continue;
    }

    if (
      typeof child === "string" ||
      typeof child === "number" ||
      typeof child === "boolean"
    ) {
      target.push(textNode(String(child)));
      continue;
    }

    target.push(child);
  }

  return target;
}

export function h(type, props = {}, ...children) {
  const normalizedChildren = flattenChildren(children);

  if (typeof type === "function") {
    return renderChildComponent(type, {
      ...(props ?? {}),
      children: normalizedChildren,
    });
  }

  return elementNode(type, props ?? {}, normalizedChildren);
}
