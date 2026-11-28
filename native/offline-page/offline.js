const { appUrl, fallbackLocale, messages: messagesByLocale } =
  window.CWA_OFFLINE_PAGE;

const HEALTH_CHECK_URL = new URL("/api/health", appUrl);
const HEALTH_CHECK_TIMEOUT_MS = 8_000;
const MINIMUM_CHECKING_MS = 800;
const AUTOMATIC_RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 30_000];

const retryButton = document.querySelector('[data-action="retry"]');

const locale = preferredLocale();
const messages = messagesByLocale[locale];

let isChecking = false;
let failedAttempts = 0;
let automaticRetry;

function preferredLocale() {
  const languageTags = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  const supported = languageTags
    .map((tag) => tag.split("-")[0].toLowerCase())
    .find((language) => Object.keys(messagesByLocale).includes(language));
  return supported ?? fallbackLocale;
}

function setText(name, text) {
  document.querySelector(`[data-text="${name}"]`).textContent = text;
}

function showReason() {
  const reason = navigator.onLine ? "unreachable" : "offline";
  document.body.dataset.reason = reason;
  setText("title", messages[reason].title);
  setText("description", messages[reason].description);
}

function showChecking() {
  retryButton.setAttribute("aria-busy", "true");
  setText("status", messages.checking);
}

function showNotYet() {
  retryButton.removeAttribute("aria-busy");
  setText("status", messages.notYet);
}

async function appServerAnswers() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  try {
    await fetch(HEALTH_CHECK_URL, {
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryToReconnect({ announce }) {
  if (isChecking) return;
  isChecking = true;
  clearTimeout(automaticRetry);
  if (announce) showChecking();
  const checkingStartedAt = Date.now();

  if (await appServerAnswers()) {
    location.replace(appUrl);
    return;
  }

  if (announce) await wait(MINIMUM_CHECKING_MS - (Date.now() - checkingStartedAt));
  isChecking = false;
  failedAttempts += 1;
  showReason();
  if (announce) showNotYet();
  scheduleAutomaticRetry();
}

function scheduleAutomaticRetry() {
  clearTimeout(automaticRetry);
  if (document.visibilityState !== "visible") return;
  const delay =
    AUTOMATIC_RETRY_DELAYS_MS[
      Math.min(failedAttempts, AUTOMATIC_RETRY_DELAYS_MS.length - 1)
    ];
  automaticRetry = setTimeout(() => tryToReconnect({ announce: false }), delay);
}

function hideSplashScreen() {
  window.Capacitor?.nativePromise?.("SplashScreen", "hide", {})?.catch(() => {});
}

retryButton.addEventListener("click", () => {
  failedAttempts = 0;
  tryToReconnect({ announce: true });
});

window.addEventListener("online", () => {
  failedAttempts = 0;
  showReason();
  tryToReconnect({ announce: false });
});

window.addEventListener("offline", showReason);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    tryToReconnect({ announce: false });
  } else {
    clearTimeout(automaticRetry);
  }
});

document.documentElement.lang = locale;
setText("retry", messages.retry);
showReason();
hideSplashScreen();
scheduleAutomaticRetry();
