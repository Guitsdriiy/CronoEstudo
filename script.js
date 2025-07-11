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
let currentEditingCard = null;

// CONFIGURAÇÕES POMODORO
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
// POMODORO
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

function updateMinutesToday() {
  const key = `cronoestudo_minutes_${new Date().toISOString().split("T")[0]}`;
  const current = parseInt(localStorage.getItem(key)) || 0;
  document.getElementById("minutesToday").textContent = current;
}
// MODAL DE FORMULÁRIO
function openTaskForm(card = null, text = '') {
  document.getElementById("taskFormModal").style.display = "flex";
  currentEditingCard = card;

  const nameInput = document.getElementById("formName");
  const notes = document.getElementById("formNotes");

  if (card) {
    const parts = text.split(' — ');
    nameInput.value = parts[0] || '';
    notes.value = text.includes('•') ? text.split('•')[1].trim() : '';
  } else {
    nameInput.value = '';
    notes.value = '';
  }
}

function closeTaskForm() {
  document.getElementById("taskFormModal").style.display = "none";
  currentEditingCard = null;
}

function submitTaskForm() {
  const name = document.getElementById("formName").value.trim();
  const type = document.getElementById("formType").value;
  const difficulty = document.getElementById("formDifficulty").value;
  const time = document.getElementById("formTime").value;
  const notes = document.getElementById("formNotes").value;

  if (name === "") return alert("Digite o nome da matéria.");

  const details = `${name} — ${type}, ${difficulty} (${time} min)${notes ? ' • ' + notes : ''}`;

  if (currentEditingCard) {
    currentEditingCard.querySelector("span.titulo").textContent = name;
    saveTasks();
  } else {
    createTaskCard(details);
  }

  closeTaskForm();
}

// TAREFAS
function saveTasks() {
  const tasks = [];
  document.querySelectorAll(".task-card").forEach(card => {
    const rawText = card.querySelector("span.titulo").textContent;
    const tipo = card.querySelector(".badge")?.textContent || "";
    const dificuldade = card.querySelectorAll(".badge")[1]?.textContent || "";
    const tempo = card.querySelector(".detalhes")?.textContent.match(/\d+/)?.[0] || "";
    const notas = card.querySelector(".detalhes")?.innerHTML.includes("📝") ? card.querySelector(".detalhes").innerHTML.split("📝")[1].trim() : "";
    const checked = card.querySelector("input[type='checkbox']").checked;

    const full = `${rawText} — ${tipo}, ${dificuldade} (${tempo} min)${notas ? ' • ' + notas : ''}`;
    tasks.push({ text: full, checked });
  });
  localStorage.setItem("cronoestudo_tasks", JSON.stringify(tasks));
}

function loadTasks() {
  const saved = JSON.parse(localStorage.getItem("cronoestudo_tasks")) || [];
  saved.forEach(task => createTaskCard(task.text, task.checked));
}
function createTaskCard(text, checked = false) {
  const card = document.createElement("div");
  card.className = "task-card";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = checked;

  const [nome, resto] = text.split(" — ");
  const detalhesPartes = resto ? resto.split(", ") : [];
  const tipo = detalhesPartes[0] || "";
  const dificuldade = detalhesPartes[1]?.split(" ")[0] || "";
  const tempo = detalhesPartes[1]?.split("(")[1]?.replace(")", "") || "";
  const notas = text.includes("•") ? text.split("•")[1].trim() : "";

  const titulo = document.createElement("span");
  titulo.className = "titulo";
  titulo.textContent = nome;

  const badges = document.createElement("div");

  const badgeTipo = document.createElement("span");
  badgeTipo.className = `badge ${tipo.toLowerCase()}`;
  badgeTipo.textContent = tipo;
  badges.appendChild(badgeTipo);

  const badgeDificuldade = document.createElement("span");
  badgeDificuldade.className = `badge ${dificuldade.toLowerCase()}`;
  badgeDificuldade.textContent = dificuldade;
  badges.appendChild(badgeDificuldade);

  const detalhes = document.createElement("div");
  detalhes.className = "detalhes";
  detalhes.innerHTML = `${tempo ? `<strong>⏱ ${tempo}</strong>` : ""} ${notas ? `<br>📝 ${notas}` : ""}`;

  const textoContainer = document.createElement("div");
  textoContainer.style.flexGrow = 1;
  textoContainer.appendChild(titulo);
  textoContainer.appendChild(badges);
  textoContainer.appendChild(detalhes);

  const buttons = document.createElement("div");
  buttons.className = "task-buttons";

  const deleteBtn = document.createElement("button");
  deleteBtn.innerHTML = "🗑️";
  deleteBtn.onclick = () => {
    card.remove();
    saveTasks();
  };

  checkbox.addEventListener("change", () => {
    const parent = checkbox.checked ? "completedTasks" : "activeTasks";
    document.getElementById(parent).appendChild(card);

    buttons.innerHTML = "";
    if (!checkbox.checked) {
      buttons.appendChild(createPomodoroBtn());
      buttons.appendChild(createEditBtn(card, text));
    }
    buttons.appendChild(deleteBtn);

    titulo.style.textDecoration = checkbox.checked ? "line-through" : "none";
    saveTasks();
  });

  function createPomodoroBtn() {
    const btn = document.createElement("button");
    btn.innerHTML = "⏱️";
    btn.onclick = () => startPomodoro();
    return btn;
  }

  function createEditBtn(cardEl, rawText) {
    const btn = document.createElement("button");
    btn.innerHTML = "✏️";
    btn.onclick = () => openTaskForm(cardEl, rawText);
    return btn;
  }

  card.appendChild(checkbox);
  card.appendChild(textoContainer);

  if (!checked) {
    buttons.appendChild(createPomodoroBtn());
    buttons.appendChild(createEditBtn(card, text));
  }
  buttons.appendChild(deleteBtn);
  card.appendChild(buttons);

  const parent = checked ? "completedTasks" : "activeTasks";
  document.getElementById(parent).appendChild(card);
}

// DRAG DA JANELA POMODORO
let offsetX = 0, offsetY = 0, isDragging = false;

function startDrag(e) {
  const widget = document.getElementById("pomodoroWidget");
  const target = e.target;
  if (target.closest("button") || target.id === "minimizeBtn") return;

  const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;

  offsetX = clientX - widget.offsetLeft;
  offsetY = clientY - widget.offsetTop;
  isDragging = true;

  function dragMove(ev) {
    if (!isDragging) return;
    const moveX = ev.type.includes("touch") ? ev.touches[0].clientX : ev.clientX;
    const moveY = ev.type.includes("touch") ? ev.touches[0].clientY : ev.clientY;
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

document.getElementById("pomodoroWidget").addEventListener("mousedown", startDrag);
document.getElementById("pomodoroWidget").addEventListener("touchstart", startDrag);

// ONLOAD
window.onload = () => {
  loadTasks();
  updateMinutesToday();
  updateTimerDisplay();
  loadConfig();
};