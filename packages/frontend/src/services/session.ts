const SESSION_KEY = "xcam_sid";
const SESSION_COUNT_KEY = "xcam_sid_count";
const SESSION_TIME_KEY = "xcam_sid_time";
const MAX_PERFORMERS = 100;
const MAX_AGE_MS = 30 * 60 * 1000; // 30 min

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function isExpired(): boolean {
  const time = sessionStorage.getItem(SESSION_TIME_KEY);
  if (!time) return true;
  return Date.now() - parseInt(time, 10) > MAX_AGE_MS;
}

function isExhausted(): boolean {
  const count = sessionStorage.getItem(SESSION_COUNT_KEY);
  if (!count) return false;
  return parseInt(count, 10) >= MAX_PERFORMERS;
}

export function getSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid || isExpired() || isExhausted()) {
    sid = generateId();
    sessionStorage.setItem(SESSION_KEY, sid);
    sessionStorage.setItem(SESSION_COUNT_KEY, "0");
    sessionStorage.setItem(SESSION_TIME_KEY, String(Date.now()));
  }
  return sid;
}

export function incrementCount(): void {
  const count = parseInt(sessionStorage.getItem(SESSION_COUNT_KEY) ?? "0", 10);
  sessionStorage.setItem(SESSION_COUNT_KEY, String(count + 1));
}

// Visitor ID — persists across sessions in localStorage (for retention tracking)
const VISITOR_KEY = "xcam_vid";

export function getVisitorId(): string {
  let vid = localStorage.getItem(VISITOR_KEY);
  if (!vid) {
    vid = generateId();
    localStorage.setItem(VISITOR_KEY, vid);
  }
  return vid;
}

// Session number — how many sessions this visitor has had
const SESSION_NUM_KEY = "xcam_snum";

export function getSessionNumber(): number {
  return parseInt(localStorage.getItem(SESSION_NUM_KEY) ?? "1", 10);
}

export function incrementSessionNumber(): void {
  const num = getSessionNumber();
  localStorage.setItem(SESSION_NUM_KEY, String(num + 1));
}
