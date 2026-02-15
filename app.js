const FALLBACK_DATA = {
  tripTitle: "Honeymoon",
  tripDateRange: "",
  itinerary: []
};

const OFFLINE_STORAGE_KEY = "honeymoon_trip_cache_v2";
const AUTH_EXPIRY_KEY = "honeymoon_auth_expiry_v1";
const AUTH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ENCRYPTED_DATA_PATH = "./data/trip.enc.json";
const TRIP_YEAR = 2026;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(passphrase, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["decrypt"]
  );
}

async function decryptTripData(passphrase) {
  const response = await fetch(ENCRYPTED_DATA_PATH, { cache: "no-cache" });
  if (!response.ok) throw new Error("Could not load encrypted trip data.");
  const payload = await response.json();
  const iterations = Number(payload.iterations);

  if (!payload?.salt || !payload?.iv || !payload?.ciphertext || !Number.isFinite(iterations)) {
    throw new Error("Encrypted payload is invalid.");
  }

  try {
    const salt = b64ToBytes(payload.salt);
    const iv = b64ToBytes(payload.iv);
    const ciphertext = b64ToBytes(payload.ciphertext);
    const key = await deriveAesKey(passphrase, salt, iterations);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(decoder.decode(plaintext));
  } catch {
    throw new Error("Incorrect passphrase.");
  }
}

function getCachedTripData() {
  const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function cacheTripData(data) {
  localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(data));
}

function hasValidRememberedSession() {
  const expiresAt = Number(localStorage.getItem(AUTH_EXPIRY_KEY) || 0);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function setRememberedSession(enabled) {
  if (!enabled) {
    localStorage.removeItem(AUTH_EXPIRY_KEY);
    return;
  }
  localStorage.setItem(AUTH_EXPIRY_KEY, String(Date.now() + AUTH_TTL_MS));
}

function setAuthStatus(message) {
  const status = document.querySelector("#auth-status");
  if (status) status.textContent = message;
}

function lockApp(message = "Enter passphrase to unlock your honeymoon details.") {
  document.body.classList.add("app-locked");
  setAuthStatus(message);
}

function unlockApp() {
  document.body.classList.remove("app-locked");
}

function setBackgroundTheme(stage) {
  document.body.classList.remove("theme-pretrip", "theme-mykonos", "theme-marrakech", "theme-posttrip");
  if (stage === "pretrip") {
    document.body.classList.add("theme-pretrip");
    return;
  }
  if (stage === "marrakech") {
    document.body.classList.add("theme-marrakech");
    return;
  }
  if (stage === "posttrip") {
    document.body.classList.add("theme-posttrip");
    return;
  }
  document.body.classList.add("theme-mykonos");
}

function createLocalDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day);
}

function daysUntil(targetDate, fromDate) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((targetDate - fromDate) / msPerDay);
}

function getHomeState(localToday) {
  const mykonosStart = createLocalDate(TRIP_YEAR, 5, 14);
  const mykonosEnd = createLocalDate(TRIP_YEAR, 5, 20);
  const marrakechStart = createLocalDate(TRIP_YEAR, 5, 21);
  const marrakechEnd = createLocalDate(TRIP_YEAR, 5, 27);
  const homeDate = createLocalDate(TRIP_YEAR, 5, 28);

  if (localToday < mykonosStart) {
    const days = daysUntil(mykonosStart, localToday);
    return {
      kicker: "Countdown to Mykonos",
      number: String(days),
      label: "days",
      stage: "pretrip"
    };
  }

  if (localToday >= mykonosStart && localToday <= mykonosEnd) {
    const days = daysUntil(marrakechStart, localToday);
    return {
      kicker: "Countdown to Marrakech",
      number: String(days),
      label: "days",
      stage: "mykonos"
    };
  }

  if (localToday >= marrakechStart && localToday <= marrakechEnd) {
    const days = daysUntil(homeDate, localToday);
    return {
      kicker: "Countdown to Home",
      number: String(days),
      label: "days",
      stage: "marrakech"
    };
  }

  if (localToday > marrakechEnd) {
    return {
      kicker: "Welcome Home",
      number: "0",
      label: "days",
      stage: "posttrip"
    };
  }

  return { kicker: "Countdown", number: "0", label: "days", stage: "mykonos" };
}

function setHomeMessage(referenceDate = new Date()) {
  const localToday = createLocalDate(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const state = getHomeState(localToday);
  const kickerEl = document.querySelector("#countdown-kicker");
  const numberEl = document.querySelector("#countdown-number");
  const labelEl = document.querySelector("#countdown-label");

  if (kickerEl) kickerEl.textContent = state.kicker;
  if (numberEl) numberEl.textContent = state.number;
  if (labelEl) labelEl.textContent = state.label;
  setBackgroundTheme(state.stage);
}

function renderItinerary(data) {
  const wrapper = document.querySelector("#itinerary-list");
  wrapper.innerHTML = "";

  const dayTemplate = document.querySelector("#itinerary-day-template");
  data.itinerary.forEach((day) => {
    const clone = dayTemplate.content.cloneNode(true);
    clone.querySelector("h3").textContent = day.title;
    clone.querySelector(".location").textContent = day.location;

    const timeline = clone.querySelector(".timeline");
    day.items.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${item.time} - ${item.title}</strong><br><span>${item.detail}</span>`;
      timeline.appendChild(li);
    });

    wrapper.appendChild(clone);
  });
}

function renderTripData(data) {
  renderItinerary(data);
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  const panels = {
    home: document.querySelector("#home-panel"),
    itinery: document.querySelector("#itinery-panel")
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-tab");
      buttons.forEach((b) => {
        const isActive = b === button;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-selected", String(isActive));
      });

      Object.entries(panels).forEach(([key, panel]) => {
        panel.classList.toggle("active", key === targetTab);
      });
    });
  });
}

function setupAuthHandlers(onUnlock) {
  const form = document.querySelector("#auth-form");
  const passphraseInput = document.querySelector("#auth-passphrase");
  const rememberInput = document.querySelector("#auth-remember");
  const submitButton = document.querySelector("#auth-submit");
  if (!form || !passphraseInput || !rememberInput || !submitButton) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const passphrase = passphraseInput.value;
    if (!passphrase) return;

    submitButton.disabled = true;
    setAuthStatus("Unlocking...");

    try {
      const data = await decryptTripData(passphrase);
      cacheTripData(data);
      setRememberedSession(Boolean(rememberInput.checked));
      passphraseInput.value = "";
      onUnlock(data);
    } catch (error) {
      setAuthStatus(error?.message || "Unlock failed.");
    } finally {
      submitButton.disabled = false;
    }
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
  } catch (error) {
    console.error("Service worker registration failed:", error);
  }
}

async function bootstrap() {
  const onUnlock = (data) => {
    renderTripData(data);
    setHomeMessage();
    unlockApp();
  };

  setupAuthHandlers(onUnlock);
  setupTabs();
  registerServiceWorker();

  const cached = getCachedTripData() || FALLBACK_DATA;
  if (hasValidRememberedSession() && cached?.itinerary?.length) {
    onUnlock(cached);
    return;
  }

  lockApp();
}

bootstrap();
