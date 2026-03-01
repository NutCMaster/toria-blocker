const STORAGE_KEY = "blockedEntries";
const LEGACY_KEY = "blockedUsers";

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

function dedupeNormalize(values) {
  return [...new Set(values.map(normalizeEntry).filter(Boolean))].sort();
}

function storageGet(area, keys) {
  return new Promise((resolve) => {
    area.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        resolve({});
        return;
      }
      resolve(result || {});
    });
  });
}

function storageSet(area, data) {
  return new Promise((resolve) => {
    area.set(data, () => {
      resolve(!chrome.runtime.lastError);
    });
  });
}

function storageRemove(area, key) {
  return new Promise((resolve) => {
    area.remove(key, () => {
      resolve(!chrome.runtime.lastError);
    });
  });
}

async function loadEntries() {
  const [syncData, localData] = await Promise.all([
    storageGet(chrome.storage.sync, [STORAGE_KEY, LEGACY_KEY]),
    storageGet(chrome.storage.local, [STORAGE_KEY, LEGACY_KEY])
  ]);

  const merged = [
    ...(Array.isArray(syncData[STORAGE_KEY]) ? syncData[STORAGE_KEY] : []),
    ...(Array.isArray(syncData[LEGACY_KEY]) ? syncData[LEGACY_KEY] : []),
    ...(Array.isArray(localData[STORAGE_KEY]) ? localData[STORAGE_KEY] : []),
    ...(Array.isArray(localData[LEGACY_KEY]) ? localData[LEGACY_KEY] : [])
  ];

  blockedEntries = dedupeNormalize(merged);
  renderEntries();

  await Promise.all([
    storageSet(chrome.storage.sync, { [STORAGE_KEY]: blockedEntries }),
    storageSet(chrome.storage.local, { [STORAGE_KEY]: blockedEntries }),
    storageRemove(chrome.storage.sync, LEGACY_KEY),
    storageRemove(chrome.storage.local, LEGACY_KEY)
  ]);
}

async function saveEntries() {
  const entries = dedupeNormalize(blockedEntries);
  blockedEntries = entries;

  const [syncSaved, localSaved] = await Promise.all([
    storageSet(chrome.storage.sync, { [STORAGE_KEY]: entries }),
    storageSet(chrome.storage.local, { [STORAGE_KEY]: entries })
  ]);

  if (syncSaved || localSaved) {
    showStatus(syncSaved ? "Saved (sync + offline cache)." : "Saved (offline cache only).");
    return;
  }

  showStatus("Failed to save blocked entries.", true);
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
    removeBtn.addEventListener("click", async () => {
      blockedEntries = blockedEntries.filter((v) => v !== entry);
      renderEntries();
      await saveEntries();
    });

    li.append(label, removeBtn);
    blockedList.appendChild(li);
  });
}

addForm.addEventListener("submit", async (event) => {
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
  blockedEntries = dedupeNormalize(blockedEntries);
  renderEntries();
  await saveEntries();

  usernameInput.value = "";
  usernameInput.focus();
});

loadEntries();
