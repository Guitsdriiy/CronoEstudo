// CONFIG PADRÃO
let config = {
  study: 25,
  shortBreak: 5,
  longBreak: 15,
  cyclesUntilLongBreak: 4
};

let currentCycle = 0;
let pomodoroInterval;
let secondsLeft = 0;
let isPaused = false;
let phase = 'study';

function saveConfig() {
  config.study = parseInt(document.getElementById("pomodoroDuration").value) || 25;
  config.shortBreak = parseInt(document.getElementById("shortBreakDuration").value) || 5;
  config.longBreak = parseInt(document.getElementById("longBreakDuration").value) || 15;
  config.cyclesUntilLongBreak = parseInt(document.getElementById("cyclesUntilLongBreak").value) || 4;
  localStorage.setItem("pomodoro_config", JSON.stringify(config));
  closeConfigModal();
}

function loadConfig() {
  const saved = localStorage.getItem("pomodoro_config");
  if (saved) config = JSON.parse(saved);
  document.getElementById("pomodoroDuration").value = config.study;
  document.getElementById("shortBreakDuration").value = config.shortBreak;
  document.getElementById("longBreakDuration").value = config.longBreak;
  document.getElementById("cyclesUntilLongBreak").value = config.cyclesUntilLongBreak;
}

function openConfigModal() {
  document.getElementById("configModal").style.display = "flex";
}

function closeConfigModal() {
  document.getElementById("configModal").style.display = "none";
}

function startPomodoro() {
  switchPhase('study');
  document.getElementById("pomodoroWidget").style.display = "block";
  document.getElementById("pomodoroBody").style.display = "block";
  document.getElementById("minimizeBtn").textContent = "➖";
}

function switchPhase(newPhase) {
  clearInterval(pomodoroInterval);
  isPaused = false;
  phase = newPhase;

  const status = document.getElementById("pomodoroStatus");
  status.textContent = phase === 'study' ? 'Estudando' : phase === 'short' ? 'Pausa Curta' : 'Pausa Longa';
  status.className = `pomodoro-status ${phase === 'study' ? 'study' : phase === 'short' ? 'short-break' : 'long-break'}`;

  secondsLeft = (phase === 'study' ? config.study : phase === 'short' ? config.shortBreak : config.longBreak) * 60;

  updateTimerDisplay();
  pomodoroInterval = setInterval(() => {
    if (!isPaused) {
      secondsLeft--;
      updateTimerDisplay();

      if (secondsLeft <= 0) {
        clearInterval(pomodoroInterval);
        if (phase === 'study') {
          currentCycle++;
          addStudyMinutes(config.study);
          if (currentCycle >= config.cyclesUntilLongBreak) {
            currentCycle = 0;
            switchPhase('long');
          } else {
            switchPhase('short');
          }
        } else {
          switchPhase('study');
        }
      }
    }
  }, 1000);
}

function pausePomodoro() {
  isPaused = true;
}

function resumePomodoro() {
  isPaused = false;
}

function closePomodoro() {
  clearInterval(pomodoroInterval);
  document.getElementById("pomodoroWidget").style.display = "none";
}

function toggleWidget(e) {
  e.stopPropagation();
  const body = document.getElementById("pomodoroBody");
  const btn = document.getElementById("minimizeBtn");

  const isVisible = body.style.display !== "none";
  body.style.display = isVisible ? "none" : "block";
  btn.textContent = isVisible ? "🔼" : "➖";
}

function updateTimerDisplay() {
  const min = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const sec = String(secondsLeft % 60).padStart(2, '0');
  document.getElementById("pomodoroTimer").textContent = `${min}:${sec}`;
}

function addStudyMinutes(min) {
  const key = `cronoestudo_minutes_${new Date().toISOString().split("T")[0]}`;
  const current = parseInt(localStorage.getItem(key)) || 0;
  localStorage.setItem(key, current + min);
  document.getElementById("minutesToday").textContent = current + min;
}

// TAREFAS
function saveTasks() {
  const tasks = [];
  document.querySelectorAll(".task-card").forEach(card => {
    const text = card.querySelector("span").innerText;
    const checked = card.querySelector("input[type='checkbox']").checked;
    tasks.push({ text, checked });
  });
  localStorage.setItem("cronoestudo_tasks", JSON.stringify(tasks));
}

function loadTasks() {
  const saved = JSON.parse(localStorage.getItem("cronoestudo_tasks")) || [];
  saved.forEach(task => createTaskCard(task.text, task.checked));
}

function createTaskCard(text, checked = false) {
  const taskCard = document.createElement("div");
  taskCard.className = "task-card";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = checked;
  checkbox.onchange = saveTasks;

  const span = document.createElement("span");
  span.innerText = text;
  if (checked) span.style.textDecoration = "line-through";

  checkbox.addEventListener("change", () => {
    span.style.textDecoration = checkbox.checked ? "line-through" : "none";
    saveTasks();
  });

  const pomodoroBtn = document.createElement("button");
  pomodoroBtn.innerText = "⏱️";
  pomodoroBtn.onclick = () => startPomodoro();

  const leftSide = document.createElement("div");
  leftSide.appendChild(checkbox);
  leftSide.appendChild(span);
  leftSide.style.display = "flex";
  leftSide.style.alignItems = "center";
  leftSide.style.gap = "10px";

  taskCard.appendChild(leftSide);
  taskCard.appendChild(pomodoroBtn);

  document.getElementById("taskList").appendChild(taskCard);
}

function addTask() {
  const taskInput = document.getElementById("taskInput");
  const taskText = taskInput.value.trim();
  if (taskText === "") return;
  createTaskCard(taskText);
  saveTasks();
  taskInput.value = "";
}

// DRAG com proteção para não bloquear botões
let offsetX = 0, offsetY = 0, isDragging = false;

function startDrag(e) {
  // Evita arrastar ao clicar em botões ou minimizador
  const target = e.target;
  if (target.closest("button") || target.id === "minimizeBtn") return;

  e.preventDefault();
  const widget = document.getElementById("pomodoroWidget");

  const clientX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;

  offsetX = clientX - widget.offsetLeft;
  offsetY = clientY - widget.offsetTop;
  isDragging = true;

  function dragMove(ev) {
    if (!isDragging) return;
    const moveX = ev.type.startsWith("touch") ? ev.touches[0].clientX : ev.clientX;
    const moveY = ev.type.startsWith("touch") ? ev.touches[0].clientY : ev.clientY;
    widget.style.left = `${moveX - offsetX}px`;
    widget.style.top = `${moveY - offsetY}px`;
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener("mousemove", dragMove);
    document.removeEventListener("mouseup", stopDrag);
    document.removeEventListener("touchmove", dragMove);
    document.removeEventListener("touchend", stopDrag);
  }

  document.addEventListener("mousemove", dragMove);
  document.addEventListener("mouseup", stopDrag);
  document.addEventListener("touchmove", dragMove, { passive: false });
  document.addEventListener("touchend", stopDrag);
}

// Ativa drag em toda a janela (com proteção)
document.getElementById("pomodoroWidget").addEventListener("mousedown", startDrag);
document.getElementById("pomodoroWidget").addEventListener("touchstart", startDrag);

function updateMinutesToday() {
  const key = `cronoestudo_minutes_${new Date().toISOString().split("T")[0]}`;
  const current = parseInt(localStorage.getItem(key)) || 0;
  document.getElementById("minutesToday").textContent = current;
}

window.onload = () => {
  loadTasks();
  updateTimerDisplay();
  updateMinutesToday();
  loadConfig();
};