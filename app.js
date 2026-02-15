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
const MYKONOS_START = createLocalDate(TRIP_YEAR, 5, 14);
const MARRAKECH_START = createLocalDate(TRIP_YEAR, 5, 21);
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
  const themes = ["theme-pretrip", "theme-mykonos", "theme-marrakech", "theme-posttrip"];
  document.body.classList.remove(...themes);
  document.documentElement.classList.remove(...themes);

  const setTheme = (className) => {
    document.body.classList.add(className);
    document.documentElement.classList.add(className);
  };

  if (stage === "pretrip") {
    setTheme("theme-pretrip");
    return;
  }
  if (stage === "marrakech") {
    setTheme("theme-marrakech");
    return;
  }
  if (stage === "posttrip") {
    setTheme("theme-posttrip");
    return;
  }
  setTheme("theme-mykonos");
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

function createLocalDateFromISO(isoDate) {
  if (!isoDate || typeof isoDate !== "string") return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return createLocalDate(y, m - 1, d);
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(date);
}

function buildLegacyItineraryDays(data) {
  if (!Array.isArray(data.itinerary)) return [];

  let mykonosOffset = 1;
  let marrakechOffset = 0;

  return data.itinerary.map((day) => {
    const location = day.location || "Trip";
    const locationLower = location.toLowerCase();
    let dateObj = new Date(MYKONOS_START);

    if (locationLower.includes("mykonos")) {
      dateObj.setDate(MYKONOS_START.getDate() + mykonosOffset);
      mykonosOffset += 1;
    } else if (locationLower.includes("marrakech")) {
      dateObj = new Date(MARRAKECH_START);
      dateObj.setDate(MARRAKECH_START.getDate() + marrakechOffset);
      marrakechOffset += 1;
    }

    return {
      date: toISODate(dateObj),
      title: location,
      entries: (day.items || []).map((item) => ({
        type: "plan",
        title: item.title,
        time: item.time,
        details: [item.detail]
      }))
    };
  });
}

function getItineraryDays(data) {
  const days = Array.isArray(data.itineraryDays) && data.itineraryDays.length
    ? data.itineraryDays
    : buildLegacyItineraryDays(data);

  return days
    .slice()
    .sort((a, b) => {
      const ad = createLocalDateFromISO(a.date);
      const bd = createLocalDateFromISO(b.date);
      if (!ad || !bd) return 0;
      return ad - bd;
    });
}

function appendMetaRow(container, label, value) {
  if (!value) return;
  const row = document.createElement("div");
  row.className = "entry-meta-row";

  const key = document.createElement("span");
  key.className = "entry-meta-key";
  key.textContent = label;

  const val = document.createElement("span");
  val.className = "entry-meta-value";
  val.textContent = value;

  row.append(key, val);
  container.appendChild(row);
}

function renderEntry(entry) {
  const card = document.createElement("article");
  card.className = `entry-card entry-${entry.type || "plan"}`;

  const top = document.createElement("div");
  top.className = "entry-top";

  const pill = document.createElement("span");
  pill.className = "entry-pill";
  pill.textContent = entry.typeLabel || (entry.type ? entry.type.toUpperCase() : "PLAN");

  const time = document.createElement("span");
  time.className = "entry-time";
  time.textContent = entry.time || "Time TBD";
  top.append(pill, time);

  const title = document.createElement("h4");
  title.className = "entry-title";
  title.textContent = entry.title || "Reservation";

  card.append(top, title);

  if (entry.confirmationCode) {
    const code = document.createElement("p");
    code.className = "entry-code";
    code.textContent = `Code ${entry.confirmationCode}`;
    card.appendChild(code);
  }

  const meta = document.createElement("div");
  meta.className = "entry-meta";
  appendMetaRow(meta, "Provider", entry.provider);
  appendMetaRow(meta, "Location", entry.location);
  appendMetaRow(meta, "Address", entry.address);
  appendMetaRow(meta, "Pickup", entry.pickup);
  appendMetaRow(meta, "Drop-off", entry.dropoff);
  appendMetaRow(meta, "Driver", entry.driver);
  appendMetaRow(meta, "Car", entry.carType);
  appendMetaRow(meta, "Duration", entry.duration);
  appendMetaRow(meta, "Cabin", entry.cabin);
  if (meta.children.length) card.appendChild(meta);

  if (Array.isArray(entry.segments) && entry.segments.length) {
    const block = document.createElement("div");
    block.className = "entry-list-block";
    const heading = document.createElement("p");
    heading.className = "entry-list-title";
    heading.textContent = "Segments";
    const list = document.createElement("ul");
    list.className = "entry-list";
    entry.segments.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    block.append(heading, list);
    card.appendChild(block);
  }

  if (Array.isArray(entry.layovers) && entry.layovers.length) {
    const block = document.createElement("div");
    block.className = "entry-list-block";
    const heading = document.createElement("p");
    heading.className = "entry-list-title";
    heading.textContent = "Layovers";
    const list = document.createElement("ul");
    list.className = "entry-list";
    entry.layovers.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    block.append(heading, list);
    card.appendChild(block);
  }

  if (Array.isArray(entry.details) && entry.details.length) {
    const block = document.createElement("div");
    block.className = "entry-list-block";
    const heading = document.createElement("p");
    heading.className = "entry-list-title";
    heading.textContent = "Details";
    const list = document.createElement("ul");
    list.className = "entry-list";
    entry.details.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    block.append(heading, list);
    card.appendChild(block);
  }

  return card;
}

let itineraryJumpObserver = null;

function setActiveJumpChip(targets, activeChip) {
  targets.forEach(({ chip }) => {
    chip.classList.toggle("active", chip === activeChip);
  });
}

function setupItineraryJumpObserver(targets) {
  if (itineraryJumpObserver) {
    itineraryJumpObserver.disconnect();
    itineraryJumpObserver = null;
  }
  if (!targets.length) return;

  setActiveJumpChip(targets, targets[0].chip);
  if (!("IntersectionObserver" in window)) return;

  const chipBySectionId = new Map(targets.map(({ section, chip }) => [section.id, chip]));
  itineraryJumpObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));

      if (!visible.length) return;
      const chip = chipBySectionId.get(visible[0].target.id);
      if (chip) setActiveJumpChip(targets, chip);
    },
    {
      root: null,
      rootMargin: "-16% 0px -68% 0px",
      threshold: [0.05, 0.2, 0.5]
    }
  );

  targets.forEach(({ section }) => itineraryJumpObserver.observe(section));
}

function renderItinerary(data) {
  const wrapper = document.querySelector("#itinerary-list");
  const jump = document.querySelector("#itinerary-jump");
  if (!wrapper) return;
  wrapper.innerHTML = "";
  if (jump) jump.innerHTML = "";

  const days = getItineraryDays(data);
  if (!days.length) {
    const empty = document.createElement("article");
    empty.className = "entry-card entry-empty";
    empty.textContent = "No itinerary details available yet.";
    wrapper.appendChild(empty);
    return;
  }

  const jumpTargets = [];

  days.forEach((day, index) => {
    const dateObj = createLocalDateFromISO(day.date) || new Date();
    const section = document.createElement("section");
    section.className = "day-section";
    section.id = `it-day-${day.date || index}`;

    const header = document.createElement("div");
    header.className = "day-header";

    const title = document.createElement("h3");
    title.textContent = day.title || day.location || "Day Plan";

    const dateText = document.createElement("p");
    dateText.className = "day-date";
    dateText.textContent = formatLongDate(dateObj);

    header.append(title, dateText);
    if (day.subtitle) {
      const subtitle = document.createElement("p");
      subtitle.className = "day-subtitle";
      subtitle.textContent = day.subtitle;
      header.appendChild(subtitle);
    }

    const entriesWrap = document.createElement("div");
    entriesWrap.className = "day-entries";

    const entries = Array.isArray(day.entries) ? day.entries : [];
    if (!entries.length) {
      const empty = document.createElement("article");
      empty.className = "entry-card entry-empty";
      empty.textContent = "No reservations for this day yet.";
      entriesWrap.appendChild(empty);
    } else {
      entries.forEach((entry) => entriesWrap.appendChild(renderEntry(entry)));
    }

    section.append(header, entriesWrap);
    wrapper.appendChild(section);

    if (jump) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "jump-chip";
      chip.textContent = formatShortDate(dateObj);
      chip.addEventListener("click", () => {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveJumpChip(jumpTargets, chip);
      });
      jump.appendChild(chip);
      jumpTargets.push({ section, chip });
    }
  });

  setupItineraryJumpObserver(jumpTargets);
}

function renderTripData(data) {
  renderItinerary(data);
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  const panels = {
    home: document.querySelector("#home-panel"),
    itinerary: document.querySelector("#itinerary-panel")
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
  const hasCachedDays = Boolean(
    (Array.isArray(cached?.itineraryDays) && cached.itineraryDays.length) ||
    (Array.isArray(cached?.itinerary) && cached.itinerary.length)
  );
  if (hasValidRememberedSession() && hasCachedDays) {
    onUnlock(cached);
    return;
  }

  lockApp();
}

bootstrap();
