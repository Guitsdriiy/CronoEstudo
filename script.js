let pomodoroInterval = null;
let pomodoroSeconds = 1500; // 25 min
let pomodoroRunning = false;
let currentTask = "";
let pomodorosCompleted = 0; // contador pomodoros completos
let inBreak = false; // se está na pausa
let breakSeconds = 0; // tempo da pausa atual

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
  pomodoroBtn.onclick = () => startPomodoro(text);

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

// POMODORO + PAUSAS
function startPomodoro(text = "") {
  currentTask = text;
  pomodoroSeconds = 1500;
  pomodoroRunning = true;
  inBreak = false;
  updatePomodoroDisplay();
  updatePomodoroStatus("Trabalhando...");
  document.getElementById("pomodoroWidget").style.display = "block";
  document.getElementById("pauseBtn").textContent = "⏸️ Pausar";
  startPomodoroInterval();
}

function startPomodoroInterval() {
  if (pomodoroInterval) clearInterval(pomodoroInterval);
  pomodoroInterval = setInterval(() => {
    if (!pomodoroRunning) return;

    if (!inBreak) {
      pomodoroSeconds--;
      updatePomodoroDisplay();

      if (pomodoroSeconds <= 0) {
        pomodorosCompleted++;
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
        alert(`Pomodoro finalizado para: ${currentTask}`);
        addStudyMinutes(25);

        // Iniciar pausa automaticamente
        startBreak();
      }
    } else {
      breakSeconds--;
      updatePomodoroDisplay();

      if (breakSeconds <= 0) {
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
        alert("Pausa finalizada! Prepare-se para o próximo Pomodoro.");
        updatePomodoroStatus("");
        // Depois da pausa, o Pomodoro só começa manualmente
        pomodoroRunning = false;
        updatePauseButton();
      }
    }
  }, 1000);
}

function startBreak() {
  inBreak = true;
  if (pomodorosCompleted % 4 === 0) {
    // pausa longa a cada 4 pomodoros
    breakSeconds = 15 * 60;
    updatePomodoroStatus("Pausa longa");
  } else {
    breakSeconds = 5 * 60;
    updatePomodoroStatus("Pausa curta");
  }
  updatePomodoroDisplay();
  pomodoroRunning = true;
  document.getElementById("pauseBtn").textContent = "⏸️ Pausar";
  startPomodoroInterval();
}

function togglePomodoroPause() {
  pomodoroRunning = !pomodoroRunning;
  updatePauseButton();
}

function updatePauseButton() {
  const btn = document.getElementById("pauseBtn");
  btn.textContent = pomodoroRunning ? "⏸️ Pausar" : "▶️ Retomar";
}

function updatePomodoroStatus(text) {
  document.getElementById("pomodoroStatus").textContent = text;
}

function closePomodoro() {
  clearInterval(pomodoroInterval);
  pomodoroInterval = null;
  pomodoroRunning = false;
  inBreak = false;
  pomodorosCompleted = 0;
  updatePomodoroStatus("");
  document.getElementById("pomodoroWidget").style.display = "none";
}

function toggleWidget() {
  const body = document.getElementById("pomodoroBody");
  const btn = document.getElementById("minimizeBtn");
  if (body.style.display === "none") {
    body.style.display = "block";
    btn.textContent = "➖";
  } else {
    body.style.display = "none";
    btn.textContent = "🔼";
  }
}

// DRAG SUAVE
function enableDrag() {
  const widget = document.getElementById("pomodoroWidget");
  let offsetX, offsetY, isDragging = false;

  widget.addEventListener("pointerdown", function(e) {
    const rect = widget.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    isDragging = true;
    widget.setPointerCapture(e.pointerId);
  });

  widget.addEventListener("pointermove", function(e) {
    if (!isDragging) return;
    let left = e.clientX - offsetX;
    let top = e.clientY - offsetY;
    widget.style.left = `${left}px`;
    widget.style.top = `${top}px`;
  });

  widget.addEventListener("pointerup", function(e) {
    isDragging = false;
    widget.releasePointerCapture(e.pointerId);
  });
}

// MINUTOS
function getTodayKey() {
  return `cronoestudo_minutes_${new Date().toISOString().split("T")[0]}`;
}

function addStudyMinutes(min) {
  const key = getTodayKey();
  const current = parseInt(localStorage.getItem(key)) || 0;
  localStorage.setItem(key, current + min);
  updateMinutesToday();
}

function updateMinutesToday() {
  const key = getTodayKey();
  const current = parseInt(localStorage.getItem(key)) || 0;
  document.getElementById("minutesToday").textContent = current;
}

function updatePomodoroDisplay() {
  const secondsToShow = inBreak ? breakSeconds : pomodoroSeconds;
  const min = String(Math.floor(secondsToShow / 60)).padStart(2, '0');
  const sec = String(secondsToShow % 60).padStart(2, '0');
  document.getElementById("pomodoroTimer").textContent = `${min}:${sec}`;
}

window.onload = () => {
  loadTasks();
  updateMinutesToday();
  enableDrag();

  document.getElementById("addTaskBtn").addEventListener("click", addTask);
  document.getElementById("closePomodoroBtn").addEventListener("click", closePomodoro);
  document.getElementById("minimizeBtn").addEventListener("click", toggleWidget);
  document.getElementById("pauseBtn").addEventListener("click", togglePomodoroPause);
};