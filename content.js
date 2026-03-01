(() => {
  const STORAGE_KEY = "blockedEntries";
  const LEGACY_STORAGE_KEY = "blockedUsers";
  const FRIENDS_PATH = "/my/friends";

  let blockedEntries = new Set();
  let scanTimer = null;

  function normalize(value) {
    return (value || "").trim().toLowerCase();
  }

  function onFriendsPage() {
    return window.location.pathname.startsWith(FRIENDS_PATH);
  }

  function getRequestCards() {
    return Array.from(document.querySelectorAll("#friends-container .card .card-body"));
  }

  function getDeclineButton(card) {
    return card.querySelector('a.btn.btn-danger[onclick*="declineFriendRequest"], button.btn.btn-danger[onclick*="declineFriendRequest"]');
  }

  function getAcceptButton(card) {
    return card.querySelector('a.btn.btn-success[onclick*="acceptFriendRequest"], button.btn.btn-success[onclick*="acceptFriendRequest"]');
  }

  function isRequestCard(card) {
    return Boolean(getDeclineButton(card) && getAcceptButton(card));
  }

  function extractUserId(card) {
    const declineButton = getDeclineButton(card);
    if (!declineButton) {
      return "";
    }

    return normalize(declineButton.getAttribute("data-user-id") || declineButton.dataset?.userId || "");
  }

  function extractUsername(card) {
    const explicitName = card.querySelector(".userlink-default");
    if (explicitName?.textContent) {
      return normalize(explicitName.textContent);
    }

    const heading = card.querySelector("h5, h4, h3, h2, h1, strong, .username");
    if (heading?.textContent) {
      return normalize(heading.textContent);
    }

    const profileLink = card.querySelector('a[href^="/users/"]');
    if (profileLink?.textContent) {
      return normalize(profileLink.textContent);
    }

    return "";
  }

  function shouldBlock(username, userId) {
    return (userId && blockedEntries.has(userId)) || (username && blockedEntries.has(username));
  }

  function triggerDecline(declineButton) {
    declineButton.dataset.polyBlockerDone = "1";

    // Primary path for inline onclick handlers.
    declineButton.click();

    // Fallback in case the site binds listeners differently.
    declineButton.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
  }

  function scanAndDecline() {
    if (!onFriendsPage() || !blockedEntries.size) {
      return;
    }

    for (const card of getRequestCards()) {
      if (!isRequestCard(card)) {
        continue;
      }

      const declineButton = getDeclineButton(card);
      if (!declineButton || declineButton.dataset.polyBlockerDone === "1") {
        continue;
      }

      const userId = extractUserId(card);
      const username = extractUsername(card);

      if (!shouldBlock(username, userId)) {
        continue;
      }

      triggerDecline(declineButton);
      console.info(`[Polytoria Blocker] Declined request from ${username || "unknown"} (id: ${userId || "unknown"}).`);
    }
  }

  function scheduleScan() {
    if (scanTimer) {
      clearTimeout(scanTimer);
    }

    scanTimer = setTimeout(scanAndDecline, 80);
  }

  function loadBlockedEntries(callback) {
    chrome.storage.sync.get([STORAGE_KEY, LEGACY_STORAGE_KEY], (result) => {
      const currentEntries = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
      const legacyEntries = Array.isArray(result[LEGACY_STORAGE_KEY]) ? result[LEGACY_STORAGE_KEY] : [];
      blockedEntries = new Set([...currentEntries, ...legacyEntries].map(normalize).filter(Boolean));
      callback();
    });
  }

  loadBlockedEntries(scanAndDecline);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    if (!changes[STORAGE_KEY] && !changes[LEGACY_STORAGE_KEY]) {
      return;
    }

    const nextEntries = Array.isArray(changes[STORAGE_KEY]?.newValue) ? changes[STORAGE_KEY].newValue : [];
    const nextLegacy = Array.isArray(changes[LEGACY_STORAGE_KEY]?.newValue)
      ? changes[LEGACY_STORAGE_KEY].newValue
      : [];

    blockedEntries = new Set([...nextEntries, ...nextLegacy].map(normalize).filter(Boolean));
    scheduleScan();
  });

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Requests are loaded asynchronously via axios in page scripts.
  const intervalId = setInterval(scanAndDecline, 1000);

  window.addEventListener("beforeunload", () => {
    clearInterval(intervalId);
  });

  scheduleScan();
})();
