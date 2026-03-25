import { NodeType } from "./constants.js";

function formatPath(path = []) {
  return `[${path.join(", ")}]`;
}

function formatValue(value, indentLevel = 0) {
  const indent = "  ".repeat(indentLevel);
  const nextIndent = "  ".repeat(indentLevel + 1);

  if (value === null) {
    return `${indent}null`;
  }

  if (value === undefined) {
    return `${indent}undefined`;
  }

  if (typeof value === "string") {
    return `${indent}${JSON.stringify(value)}`;
  }

  if (typeof value !== "object") {
    return `${indent}${String(value)}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${indent}[]`;
    }

    const lines = [`${indent}[`];

    for (const item of value) {
      lines.push(`${nextIndent}${formatValue(item, indentLevel + 1).trimStart()},`);
    }

    lines.push(`${indent}]`);
    return lines.join("\n");
  }

  const entries = Object.entries(value);

  if (entries.length === 0) {
    return `${indent}{}`;
  }

  const lines = [`${indent}{`];

  for (const [key, entryValue] of entries) {
    lines.push(`${nextIndent}${key}: ${formatValue(entryValue, indentLevel + 1).trimStart()},`);
  }

  lines.push(`${indent}}`);
  return lines.join("\n");
}

export function formatPatchTitle(patch, index) {
  return `${index + 1}. ${patch?.type ?? "PATCH"} ${formatPath(patch?.path ?? [])}`;
}

export function formatPatch(patch) {
  return formatValue(patch);
}

function describeVdom(vnode) {
  if (!vnode) {
    return "";
  }

  if (vnode.nodeType === NodeType.TEXT) {
    return JSON.stringify(vnode.value ?? "");
  }

  const props = Object.entries(vnode.props ?? {})
    .map(([key, value]) => `${key === "className" ? "class" : key}="${String(value)}"`)
    .join(" ");

  return props ? `<${vnode.type} ${props}>` : `<${vnode.type}>`;
}

function appendTreeLines(vnode, prefix, isLast, lines) {
  const connector = isLast ? "└─ " : "├─ ";
  lines.push(`${prefix}${connector}${describeVdom(vnode)}`);

  const children = vnode?.children ?? [];
  const nextPrefix = `${prefix}${isLast ? "   " : "│  "}`;

  children.forEach((child, index) => {
    appendTreeLines(child, nextPrefix, index === children.length - 1, lines);
  });
}

function vdomToTreeLines(vnode) {
  if (!vnode) {
    return [];
  }

  const lines = [describeVdom(vnode)];
  const children = vnode.children ?? [];

  children.forEach((child, index) => {
    appendTreeLines(child, "", index === children.length - 1, lines);
  });

  return lines;
}

function createOperations(leftLines, rightLines) {
  const dp = Array.from({ length: leftLines.length + 1 }, () =>
    Array(rightLines.length + 1).fill(0),
  );

  for (let leftIndex = leftLines.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightLines.length - 1; rightIndex >= 0; rightIndex -= 1) {
      if (leftLines[leftIndex] === rightLines[rightIndex]) {
        dp[leftIndex][rightIndex] = dp[leftIndex + 1][rightIndex + 1] + 1;
      } else {
        dp[leftIndex][rightIndex] = Math.max(
          dp[leftIndex + 1][rightIndex],
          dp[leftIndex][rightIndex + 1],
        );
      }
    }
  }

  const operations = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftLines.length && rightIndex < rightLines.length) {
    if (leftLines[leftIndex] === rightLines[rightIndex]) {
      operations.push({ kind: "same", text: leftLines[leftIndex] });
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    if (dp[leftIndex + 1][rightIndex] >= dp[leftIndex][rightIndex + 1]) {
      operations.push({ kind: "removed", text: leftLines[leftIndex] });
      leftIndex += 1;
      continue;
    }

    operations.push({ kind: "added", text: rightLines[rightIndex] });
    rightIndex += 1;
  }

  while (leftIndex < leftLines.length) {
    operations.push({ kind: "removed", text: leftLines[leftIndex] });
    leftIndex += 1;
  }

  while (rightIndex < rightLines.length) {
    operations.push({ kind: "added", text: rightLines[rightIndex] });
    rightIndex += 1;
  }

  return operations;
}

function createSplitRows(leftLines, rightLines) {
  const operations = createOperations(leftLines, rightLines);
  const rows = [];
  let index = 0;

  while (index < operations.length) {
    const current = operations[index];

    if (current.kind === "same") {
      rows.push({
        left: { text: current.text, type: "" },
        right: { text: current.text, type: "" },
      });
      index += 1;
      continue;
    }

    const removed = [];
    const added = [];

    while (index < operations.length && operations[index].kind !== "same") {
      if (operations[index].kind === "removed") {
        removed.push(operations[index].text);
      } else {
        added.push(operations[index].text);
      }

      index += 1;
    }

    const limit = Math.max(removed.length, added.length);

    for (let rowIndex = 0; rowIndex < limit; rowIndex += 1) {
      rows.push({
        left: {
          text: removed[rowIndex] ?? "",
          type: removed[rowIndex] ? "removed" : "",
        },
        right: {
          text: added[rowIndex] ?? "",
          type: added[rowIndex] ? "added" : "",
        },
      });
    }
  }

  return rows;
}

export function formatSplitViewRows(previousVdom, currentVdom) {
  return createSplitRows(vdomToTreeLines(previousVdom), vdomToTreeLines(currentVdom));
}
