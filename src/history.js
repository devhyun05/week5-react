/**
 * 담당: 양시준
 */
function cloneSnapshot(value) {
  if (Array.isArray(value)) {
    return value.map(cloneSnapshot);
  }

  if (value && typeof value === "object") {
    const cloned = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      cloned[key] = cloneSnapshot(nestedValue);
    }

    return cloned;
  }

  return value;
}

export function createHistory(initialVdom) {
  const snapshots = [];
  let index = -1;

  if (arguments.length > 0) {
    snapshots.push(cloneSnapshot(initialVdom));
    index = 0;
  }

  function currentValue() {
    if (index < 0) {
      return undefined;
    }

    return cloneSnapshot(snapshots[index]);
  }

  return {
    push(vdom) {
      const nextSnapshot = cloneSnapshot(vdom);

      snapshots.splice(index + 1);
      snapshots.push(nextSnapshot);
      index = snapshots.length - 1;

      return cloneSnapshot(nextSnapshot);
    },
    current() {
      return currentValue();
    },
    back() {
      if (index > 0) {
        index -= 1;
      }

      return currentValue();
    },
    forward() {
      if (index >= 0 && index < snapshots.length - 1) {
        index += 1;
      }

      return currentValue();
    },
    canBack() {
      return index > 0;
    },
    canForward() {
      return index >= 0 && index < snapshots.length - 1;
    },
    entries() {
      return snapshots.map(cloneSnapshot);
    },
    currentIndex() {
      return index;
    },
  };
}
