const STORAGE_KEY = "blockedEntries";

const addForm = document.getElementById("add-form");
const usernameInput = document.getElementById("username");
const blockedList = document.getElementById("blocked-list");
const emptyState = document.getElementById("empty-state");
const statusEl = document.getElementById("status");

let blockedEntries = [];

function normalizeEntry(value) {
  return value.trim().toLowerCase();
}

function showStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#fca5a5" : "#34d399";
}

function saveEntries() {
  chrome.storage.sync.set({ [STORAGE_KEY]: blockedEntries }, () => {
    showStatus("Saved.");
  });
}

function renderEntries() {
  blockedList.innerHTML = "";
  emptyState.style.display = blockedEntries.length ? "none" : "block";

  blockedEntries.forEach((entry) => {
    const li = document.createElement("li");

    const label = document.createElement("span");
    const type = /^\d+$/.test(entry) ? "ID" : "User";
    label.textContent = `${entry} (${type})`;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.className = "remove";
    removeBtn.type = "button";
    removeBtn.addEventListener("click", () => {
      blockedEntries = blockedEntries.filter((v) => v !== entry);
      saveEntries();
      renderEntries();
    });

    li.append(label, removeBtn);
    blockedList.appendChild(li);
  });
}

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const normalized = normalizeEntry(usernameInput.value);

  if (!normalized) {
    showStatus("Entry cannot be empty.", true);
    return;
  }

  if (blockedEntries.includes(normalized)) {
    showStatus("That entry is already blocked.", true);
    return;
  }

  blockedEntries.push(normalized);
  blockedEntries.sort();

  saveEntries();
  renderEntries();

  usernameInput.value = "";
  usernameInput.focus();
});

chrome.storage.sync.get([STORAGE_KEY, "blockedUsers"], (result) => {
  const fromNewKey = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
  const fromLegacyKey = Array.isArray(result.blockedUsers) ? result.blockedUsers : [];

  blockedEntries = [...fromNewKey, ...fromLegacyKey]
    .map(normalizeEntry)
    .filter(Boolean);

  blockedEntries = [...new Set(blockedEntries)].sort();
  renderEntries();

  if (fromLegacyKey.length) {
    chrome.storage.sync.remove("blockedUsers");
    saveEntries();
  }
});
