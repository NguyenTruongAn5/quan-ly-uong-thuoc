const STORAGE_KEY = "medimay-data-v1";
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const weekStrip = document.querySelector("#week-strip");
const reminderList = document.querySelector("#reminder-list");
const dialog = document.querySelector("#medicine-dialog");
const form = document.querySelector("#medicine-form");
const warning = document.querySelector("#storage-warning");
const warningText = document.querySelector("#storage-warning-text");
const toast = document.querySelector("#toast");

let selectedDate = formatDate(new Date());
let storageIssue = "";
let toastTimeout;
let state = loadState();

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromString(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function loadState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === null) return { medications: [], taken: {} };

    const parsed = JSON.parse(saved);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.medications) ||
      parsed.taken === null ||
      typeof parsed.taken !== "object" ||
      Array.isArray(parsed.taken)
    ) {
      throw new Error("Dữ liệu không đúng định dạng.");
    }
    if (
      Object.values(parsed.taken).some(
        (ids) => !Array.isArray(ids) || ids.some((id) => typeof id !== "string"),
      )
    ) {
      throw new Error("Trạng thái uống thuốc theo ngày không đọc được.");
    }

    const medications = parsed.medications.map((medicine) => {
      if (
        medicine === null ||
        typeof medicine !== "object" ||
        typeof medicine.id !== "string" ||
        typeof medicine.name !== "string" ||
        typeof medicine.time !== "string"
      ) {
        throw new Error("Có lịch uống thuốc không đọc được.");
      }

      return {
        id: medicine.id,
        name: medicine.name,
        dose: typeof medicine.dose === "string" ? medicine.dose : "",
        time: medicine.time,
        note: typeof medicine.note === "string" ? medicine.note : "",
      };
    });

    return { medications, taken: parsed.taken };
  } catch (error) {
    storageIssue =
      error instanceof SyntaxError || error instanceof TypeError
        ? "Không thể đọc dữ liệu đã lưu. Hãy khởi tạo lại dữ liệu để tiếp tục."
        : `Không thể truy cập dữ liệu đã lưu: ${error.message}`;
    return { medications: [], taken: {} };
  }
}

function persistState(nextState) {
  if (storageIssue) {
    showToast("Hãy khởi tạo lại dữ liệu trước khi thay đổi lịch uống.");
    return false;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    state = nextState;
    return true;
  } catch (error) {
    showToast(`Không lưu được dữ liệu trên thiết bị: ${error.message}`);
    return false;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function getWeekDates() {
  const date = dateFromString(selectedDate);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date);
    day.setDate(date.getDate() + index);
    return day;
  });
}

function renderWeek() {
  const today = formatDate(new Date());
  const dates = getWeekDates();

  weekStrip.innerHTML = dates
    .map((date) => {
      const key = formatDate(date);
      const isToday = key === today;
      const isSelected = key === selectedDate;
      const label = new Intl.DateTimeFormat("vi-VN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);

      return `
        <button class="day-button${isToday ? " is-today" : ""}" type="button"
          data-date="${key}" aria-pressed="${isSelected}" aria-label="${isToday ? "Hôm nay, " : ""}${label}">
          <span class="day-name">${WEEKDAYS[date.getDay()]}</span>
          <span class="day-number">${date.getDate()}</span>
          <span class="day-dot" aria-hidden="true"></span>
        </button>`;
    })
    .join("");

  const selected = dateFromString(selectedDate);
  const heading = document.querySelector("#date-heading");
  heading.textContent =
    selectedDate === today
      ? "Hôm nay"
      : new Intl.DateTimeFormat("vi-VN", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(selected);
}

function isTaken(medicineId) {
  return state.taken[selectedDate]?.includes(medicineId) ?? false;
}

function getReminderStatus(time, taken) {
  if (taken) return "Đã uống rồi, giỏi lắm!";
  if (selectedDate !== formatDate(new Date())) return "Chưa đánh dấu đã uống";

  const [hour, minute] = time.split(":").map(Number);
  const now = new Date();
  const reminderDate = new Date();
  reminderDate.setHours(hour, minute, 0, 0);
  const difference = Math.round((reminderDate - now) / 60000);

  if (difference > 0 && difference <= 60) return `Còn ${difference} phút nữa`;
  if (difference > 60 && difference <= 1440) return "Sắp đến giờ uống thuốc";
  if (difference <= 0) return "Đến giờ uống thuốc rồi";
  return "Hẹn gặp bạn vào giờ uống nhé";
}

function renderReminders() {
  const medications = [...state.medications].sort((first, second) =>
    first.time.localeCompare(second.time),
  );

  if (medications.length === 0) {
    reminderList.innerHTML = `
      <div class="empty-state">
        <span class="empty-art" aria-hidden="true">🌸</span>
        <h3>Chưa có lịch uống thuốc</h3>
        <p>Thêm giờ uống đầu tiên để MediMây cùng bạn<br />ghi nhớ và chăm sóc bản thân mỗi ngày.</p>
      </div>`;
  } else {
    reminderList.innerHTML = medications
      .map((medicine) => {
        const taken = isTaken(medicine.id);
        const details = [medicine.dose, medicine.note].filter(Boolean).join(" · ");
        const description = details || "Một lời nhắc nhỏ dành cho bạn";
        const name = escapeHtml(medicine.name);
        const time = escapeHtml(medicine.time);

        return `
          <article class="reminder-card${taken ? " is-taken" : ""}">
            <div class="reminder-time">
              <span>${time}</span>
              <small>mỗi ngày</small>
            </div>
            <span class="reminder-divider" aria-hidden="true"></span>
            <span class="medicine-icon" aria-hidden="true">💊</span>
            <div class="medicine-info">
              <h3>${name}</h3>
              <p>${escapeHtml(description)}</p>
            </div>
            <div class="reminder-actions">
              <button class="taken-button" type="button" data-action="toggle"
                data-id="${escapeHtml(medicine.id)}" aria-pressed="${taken}"
                aria-label="${taken ? "Bỏ đánh dấu" : "Đánh dấu đã uống"} ${name} lúc ${time}">
                ✓
              </button>
              <button class="delete-button" type="button" data-action="delete"
                data-id="${escapeHtml(medicine.id)}" aria-label="Xóa lịch ${name}">×</button>
            </div>
          </article>`;
      })
      .join("");
  }

  const total = medications.length;
  const completed = medications.filter((medicine) => isTaken(medicine.id)).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  document.querySelector("#taken-count").textContent = completed;
  document.querySelector("#total-count").textContent = `/ ${total}`;
  document.querySelector("#progress-fill").style.width = `${percentage}%`;
  document.querySelector("#progress-track").setAttribute("aria-valuenow", percentage);

  const message =
    total === 0
      ? "Thêm lịch uống thuốc để bắt đầu nhé."
      : completed === total
        ? "Bạn đã chăm sóc bản thân thật tốt hôm nay!"
        : `Hoàn thành ${percentage}% rồi, mình cùng cố gắng nhé.`;
  document.querySelector("#progress-message").textContent = message;
}

function render() {
  renderWeek();
  renderReminders();
  warning.hidden = !storageIssue;
  warningText.textContent = storageIssue;
  document.querySelector("#open-dialog").disabled = Boolean(storageIssue);
  document.querySelector("#open-dialog").setAttribute("aria-disabled", String(Boolean(storageIssue)));
}

function addMedicine(formData) {
  const medicine = {
    id: window.crypto.randomUUID(),
    name: String(formData.get("name")).trim(),
    dose: String(formData.get("dose") || "").trim(),
    time: String(formData.get("time")),
    note: String(formData.get("note") || "").trim(),
  };

  if (!medicine.name || !/^\d{2}:\d{2}$/.test(medicine.time)) {
    showToast("Vui lòng nhập tên thuốc và giờ uống hợp lệ.");
    return false;
  }

  if (persistState({ ...state, medications: [...state.medications, medicine] })) {
    render();
    showToast("Đã lưu lịch uống thuốc mới ♡");
    return true;
  }

  return false;
}

weekStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-date]");
  if (!button) return;
  selectedDate = button.dataset.date;
  render();
});

document.querySelector("#today-button").addEventListener("click", () => {
  selectedDate = formatDate(new Date());
  render();
});

document.querySelector("#previous-week").addEventListener("click", () => {
  const date = dateFromString(selectedDate);
  date.setDate(date.getDate() - 7);
  selectedDate = formatDate(date);
  render();
});

document.querySelector("#next-week").addEventListener("click", () => {
  const date = dateFromString(selectedDate);
  date.setDate(date.getDate() + 7);
  selectedDate = formatDate(date);
  render();
});

document.querySelector("#open-dialog").addEventListener("click", () => {
  if (storageIssue) return;
  form.reset();
  dialog.showModal();
  document.querySelector("#medicine-name").focus();
});

document.querySelector(".close-dialog").addEventListener("click", () => dialog.close());
document.querySelector(".cancel-button").addEventListener("click", () => dialog.close());

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (addMedicine(new FormData(form))) dialog.close();
});

reminderList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const medicine = state.medications.find((item) => item.id === button.dataset.id);
  if (!medicine) return;

  if (button.dataset.action === "delete") {
    if (!window.confirm(`Bạn có muốn xóa lịch uống "${medicine.name}" không?`)) return;
    const taken = Object.fromEntries(
      Object.entries(state.taken).map(([date, ids]) => [
        date,
        ids.filter((id) => id !== medicine.id),
      ]),
    );
    if (persistState({
      medications: state.medications.filter((item) => item.id !== medicine.id),
      taken,
    })) {
      render();
      showToast("Đã xóa lịch uống thuốc.");
    }
    return;
  }

  if (button.dataset.action === "toggle") {
    const currentIds = state.taken[selectedDate] ?? [];
    const nextIds = currentIds.includes(medicine.id)
      ? currentIds.filter((id) => id !== medicine.id)
      : [...currentIds, medicine.id];
    const taken = { ...state.taken, [selectedDate]: nextIds };

    if (persistState({ ...state, taken })) {
      render();
      showToast(nextIds.includes(medicine.id) ? "Đã ghi nhận bạn uống thuốc ♡" : "Đã bỏ đánh dấu.");
    }
  }
});

document.querySelector("#reset-storage").addEventListener("click", () => {
  if (!window.confirm("Xóa dữ liệu lỗi hiện tại và bắt đầu với lịch uống mới?")) return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
    storageIssue = "";
    state = { medications: [], taken: {} };
    render();
    showToast("Đã khởi tạo lại dữ liệu.");
  } catch (error) {
    warningText.textContent = `Không thể khởi tạo lại dữ liệu: ${error.message}`;
  }
});

render();
