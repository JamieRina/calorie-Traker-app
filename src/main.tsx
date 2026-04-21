import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const savedTheme = window.localStorage.getItem("nutritrack-theme-mode");
const initialTheme = savedTheme === "light" ? "light" : "dark";
document.documentElement.classList.toggle("dark", initialTheme === "dark");
document.documentElement.classList.toggle("light", initialTheme === "light");
document.documentElement.dataset.theme = initialTheme;

createRoot(document.getElementById("root")!).render(<App />);
