import "./styles.css";
import { startTodoTaskManager } from "./app.js";

const root = document.querySelector("#app");

if (!root) {
  throw new Error("#app 루트를 찾을 수 없습니다.");
}

startTodoTaskManager(root);
