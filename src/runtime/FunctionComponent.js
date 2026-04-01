import { applyPatches, diff, renderTo } from "../lib.js";
import { beginRootRender, endRootRender } from "./context.js";

export class FunctionComponent {
  constructor(component, props = {}) {
    this.component = component;
    this.props = props;
    this.hooks = [];
    this.hookIndex = 0;
    this.prevVdom = null;
    this.rootDom = null;
    this.container = null;
    this.pendingEffects = [];
    this.updateQueued = false;
  }

  mount(container) {
    this.container = container;
    const nextVdom = this.renderVdom();

    renderTo(container, nextVdom);
    this.rootDom = container.firstChild;
    this.prevVdom = nextVdom;
    this.flushEffects();

    return this.rootDom;
  }

  update(nextProps = this.props) {
    this.props = nextProps;

    if (!this.container) {
      return null;
    }

    const nextVdom = this.renderVdom();

    if (this.prevVdom === null || this.rootDom === null) {
      renderTo(this.container, nextVdom);
      this.rootDom = this.container.firstChild;
    } else {
      const patches = diff(this.prevVdom, nextVdom);

      if (patches.length > 0) {
        const nextRoot = applyPatches(this.rootDom, patches);
        this.rootDom = nextRoot ?? this.container.firstChild ?? null;

        if (this.rootDom === null) {
          renderTo(this.container, nextVdom);
          this.rootDom = this.container.firstChild;
        }
      }
    }

    this.prevVdom = nextVdom;
    this.flushEffects();

    return this.rootDom;
  }

  scheduleUpdate() {
    if (this.updateQueued) {
      return;
    }

    this.updateQueued = true;

    queueMicrotask(() => {
      this.updateQueued = false;
      this.update();
    });
  }

  registerEffect(effectRecord) {
    this.pendingEffects.push(effectRecord);
  }

  renderVdom() {
    this.hookIndex = 0;
    this.pendingEffects = [];

    beginRootRender(this);

    try {
      return this.component(this.props);
    } finally {
      endRootRender();
    }
  }

  flushEffects() {
    const effects = this.pendingEffects;
    this.pendingEffects = [];

    for (const { index, effect, deps } of effects) {
      const hook = this.hooks[index];

      if (typeof hook.cleanup === "function") {
        hook.cleanup();
      }

      const nextCleanup = effect();
      hook.cleanup = typeof nextCleanup === "function" ? nextCleanup : null;
      hook.deps = deps;
    }
  }
}
