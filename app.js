(function () {
  "use strict";

  const form = document.getElementById("question-form");
  const input = document.getElementById("question-input");
  const submitButton = document.getElementById("submit-button");
  const answerPanel = document.getElementById("answer-panel");
  const answerQuestion = document.getElementById("answer-question");
  const answerContent = document.getElementById("answer-content");
  const answerSource = document.getElementById("answer-source");
  const historyList = document.getElementById("history-list");
  const suggestions = document.getElementById("suggestions");
  const statusText = document.getElementById("engine-status-text");
  const historyPane = document.getElementById("history-pane");
  const historyToggle = document.getElementById("history-toggle");
  const historyKey = "ai-calculator-history-v1";
  let latestAnswer = "";
  let records = loadHistory();

  function loadHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(historyKey) || "[]");
      return Array.isArray(saved) ? saved.slice(0, 20) : [];
    } catch {
      return [];
    }
  }

  function renderHistory() {
    historyList.replaceChildren();
    if (!records.length) {
      const empty = document.createElement("p");
      empty.className = "empty-history";
      empty.textContent = "Your solved questions will appear here.";
      historyList.append(empty);
      return;
    }
    records.forEach((record) => {
      const button = document.createElement("button");
      button.className = "history-item";
      button.type = "button";
      button.textContent = record.question;
      button.title = record.question;
      button.addEventListener("click", () => {
        input.value = record.question;
        input.dispatchEvent(new Event("input"));
        showAnswer(record.question, record.answer, record.source, record.numeric);
        closeHistory();
      });
      historyList.append(button);
    });
  }

  function showAnswer(question, answer, source, numeric) {
    latestAnswer = answer;
    answerQuestion.textContent = question;
    answerContent.textContent = answer;
    answerContent.classList.toggle("numeric", Boolean(numeric));
    answerSource.textContent = source;
    answerPanel.hidden = false;
    answerPanel.classList.remove("loading");
    suggestions.hidden = true;
  }

  function closeHistory() {
    historyPane.classList.remove("open");
    historyToggle.setAttribute("aria-expanded", "false");
  }

  async function askAI(question) {
    const response = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The AI service could not answer right now.");
    if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error("The AI service returned an empty answer.");
    return data.answer.trim();
  }

  function showLoading(question) {
    answerPanel.hidden = false;
    answerPanel.classList.add("loading");
    answerQuestion.textContent = question;
    answerContent.classList.remove("numeric");
    answerContent.textContent = "Working through it...";
    answerSource.textContent = "AI REASONING";
    suggestions.hidden = true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || submitButton.disabled) return;
    submitButton.disabled = true;
    const localAnswer = window.CalculatorSolver.solve(question);
    let result;
    try {
      if (localAnswer) {
        result = { answer: localAnswer.explanation, source: "LOCAL MATH ENGINE", numeric: localAnswer.numeric };
      } else {
        showLoading(question);
        statusText.textContent = "AI REASONING";
        result = { answer: await askAI(question), source: "AI REASONING", numeric: false };
        statusText.textContent = "AI CONNECTED";
      }
      showAnswer(question, result.answer, result.source, result.numeric);
      records = [{ question, ...result }, ...records.filter((item) => item.question !== question)].slice(0, 20);
      try { localStorage.setItem(historyKey, JSON.stringify(records)); } catch { /* History is optional. */ }
      renderHistory();
    } catch (error) {
      statusText.textContent = "LOCAL ENGINE READY";
      showAnswer(question, `${error.message} General questions need the deployed /api/solve service; local math still works offline.`, "AI SERVICE UNAVAILABLE", false);
    } finally {
      submitButton.disabled = false;
      input.focus();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 190)}px`;
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document.querySelectorAll(".suggestion").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.question;
      input.dispatchEvent(new Event("input"));
      form.requestSubmit();
    });
  });
  document.getElementById("new-solve").addEventListener("click", () => {
    input.value = "";
    input.dispatchEvent(new Event("input"));
    answerPanel.hidden = true;
    suggestions.hidden = false;
    input.focus();
    closeHistory();
  });
  historyToggle.addEventListener("click", () => {
    const open = historyPane.classList.toggle("open");
    historyToggle.setAttribute("aria-expanded", String(open));
  });
  document.getElementById("copy-answer").addEventListener("click", async (event) => {
    if (!latestAnswer) return;
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(latestAnswer);
      button.title = "Copied";
      setTimeout(() => { button.title = "Copy answer"; }, 1200);
    } catch {
      button.title = "Copy not available";
    }
  });

  renderHistory();
  const initialQuestion = new URLSearchParams(location.search).get("q");
  if (initialQuestion && initialQuestion.length <= 4000) {
    input.value = initialQuestion;
    input.dispatchEvent(new Event("input"));
    form.requestSubmit();
  }
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(() => {}));
  }
})();