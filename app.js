const FALLBACK_DATA = {
  tripTitle: "Mykonos + Marrakech Honeymoon",
  tripDateRange: "June 10 - June 21, 2026",
  itinerary: [
    {
      title: "Day 1",
      location: "Mykonos",
      items: [
        { time: "15:10", title: "Land in Mykonos", detail: "Taxi pickup from airport to hotel." },
        { time: "18:30", title: "Sunset walk", detail: "Little Venice and windmills." }
      ]
    },
    {
      title: "Day 7",
      location: "Marrakech",
      items: [
        { time: "11:20", title: "Arrive in Marrakech", detail: "Driver arranged to riad." },
        { time: "20:30", title: "Jemaa el-Fnaa stroll", detail: "Street food and market walk." }
      ]
    }
  ],
  reservations: [],
  essentials: []
};

const OFFLINE_STORAGE_KEY = "honeymoon_offline_data_v1";
const TRIP_YEAR = 2026;

async function loadTripData() {
  try {
    const response = await fetch("./data/trip.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Could not fetch trip data");
    const json = await response.json();
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(json));
    return json;
  } catch {
    const local = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (local) return JSON.parse(local);
    return FALLBACK_DATA;
  }
}

function setSummary(data) {
  document.querySelector("#trip-title").textContent = data.tripTitle;
  document.querySelector("#trip-dates").textContent = data.tripDateRange;
}

function setBackgroundTheme(stage) {
  document.body.classList.remove("theme-pretrip", "theme-mykonos", "theme-marrakech");
  if (stage === "pretrip") {
    document.body.classList.add("theme-pretrip");
    return;
  }
  if (stage === "marrakech") {
    document.body.classList.add("theme-marrakech");
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

  if (localToday < mykonosStart) {
    const days = daysUntil(mykonosStart, localToday);
    return {
      title: `${days} day${days === 1 ? "" : "s"} until Mykonos`,
      subtitle: "Countdown to June 14.",
      stage: "pretrip"
    };
  }

  if (localToday >= mykonosStart && localToday <= mykonosEnd) {
    return {
      title: "Welcome to Mykonos",
      subtitle: "Enjoy the sea, sunsets, and whitewashed streets.",
      stage: "mykonos"
    };
  }

  if (localToday >= marrakechStart && localToday <= marrakechEnd) {
    return {
      title: "Welcome to Marrakech",
      subtitle: "Enjoy the lantern glow, markets, and rooftops.",
      stage: "marrakech"
    };
  }

  if (localToday > marrakechEnd) {
    return {
      title: "Welcome home",
      subtitle: "Hope you had an incredible honeymoon.",
      stage: "mykonos"
    };
  }

  return { title: "Welcome", subtitle: "", stage: "mykonos" };
}

function setHomeMessage(referenceDate = new Date(), isPreview = false) {
  const localToday = createLocalDate(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const state = getHomeState(localToday);
  const titleEl = document.querySelector("#home-message-title");
  const subtitleEl = document.querySelector("#home-message-subtitle");

  titleEl.textContent = state.title;
  subtitleEl.textContent = state.subtitle;
  setBackgroundTheme(state.stage);

  if (isPreview) {
    const formatted = localToday.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
    subtitleEl.textContent = state.subtitle
      ? `${state.subtitle} Preview: ${formatted}.`
      : `Preview: ${formatted}.`;
  }
}

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateInput(value) {
  const [year, month, day] = value.split("-").map((v) => Number(v));
  if (!year || !month || !day) return null;
  return createLocalDate(year, month - 1, day);
}

function setupDatePreview() {
  const input = document.querySelector("#preview-date");
  const resetButton = document.querySelector("#preview-reset");
  const status = document.querySelector("#preview-mode-label");
  if (!input || !resetButton || !status) return false;

  const now = new Date();
  const todayString = formatDateInput(now);
  input.value = todayString;

  const apply = () => {
    const pickedDate = parseDateInput(input.value) || now;
    const isPreview = input.value !== todayString;
    setHomeMessage(pickedDate, isPreview);

    if (isPreview) {
      status.textContent = `Previewing ${pickedDate.toLocaleDateString()}`;
    } else {
      status.textContent = "Using today";
    }
  };

  input.addEventListener("input", apply);
  resetButton.addEventListener("click", () => {
    input.value = todayString;
    apply();
  });

  apply();
  return true;
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

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
  } catch (error) {
    console.error("Service worker registration failed:", error);
  }
}

async function bootstrap() {
  const data = await loadTripData();
  setSummary(data);
  if (!setupDatePreview()) {
    setHomeMessage();
  }
  renderItinerary(data);
  setupTabs();
  registerServiceWorker();
}

bootstrap();
