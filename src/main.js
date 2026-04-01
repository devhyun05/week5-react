import "./styles.css";
import { FunctionComponent } from "./runtime/FunctionComponent.js";
import { App } from "./app/App.js";

const container = document.querySelector("#app");
const root = new FunctionComponent(App);

root.mount(container);
