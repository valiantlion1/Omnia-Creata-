import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/index.css';
import './i18n';

const storedTheme = localStorage.getItem("omnia-theme") || "dark";
const root = document.documentElement;
root.classList.remove("dark");
root.removeAttribute("data-theme");
if (storedTheme === "dark") {
  root.classList.add("dark");
} else if (storedTheme === "amoled") {
  root.classList.add("dark");
  root.setAttribute("data-theme", "amoled");
} else {
  root.setAttribute("data-theme", "light");
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
