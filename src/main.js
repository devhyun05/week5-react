import { mountCodingBoard } from "./app/mountCodingBoard.js";

const appRoot = document.querySelector("#app-root");
const debugRoot = document.querySelector("#debug-root");

if (appRoot) {
  mountCodingBoard({ appRoot, debugRoot });
}
