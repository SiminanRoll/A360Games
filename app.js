
function normalizeApiBase(value){
return String(value || "").trim().replace(/\/$/, "");
}
function resolveApiBase(){
/* Phase 6: localStorage removed — backend is source of truth.
   API base is fixed to api.cadenceq.com; window override kept for dev/staging only. */
const defaultApiBase = "https://api.cadenceq.com";
const fromWindow = typeof window !== "undefined" ? (window.CADENCEQ_API_BASE || window.API_BASE || "") : "";
const fromQuery = (() => {
  try{ return new URLSearchParams(window.location.search).get("apiBase") || ""; }
  catch { return ""; }
})();
let resolved = normalizeApiBase(fromQuery || fromWindow || defaultApiBase);
if(!/^https?:\/\//i.test(resolved)) resolved = defaultApiBase;
try{
  const resolvedUrl = new URL(resolved);
  const currentHost = typeof window !== "undefined" && window.location ? String(window.location.hostname || "") : "";
  if(!resolvedUrl.hostname || resolvedUrl.hostname === currentHost || /(^|\.)app\.(?:boomautomatic|cadenceq)\.com$/i.test(resolvedUrl.hostname)){
    resolved = defaultApiBase;
  }
} catch { resolved = defaultApiBase; }
return resolved;
}
const API = resolveApiBase();
let pendingMfaEnrollmentMode = false;
const authUi = {
overlay: document.getElementById("authOverlay"),
form: document.getElementById("loginForm"),
email: document.getElementById("loginEmail"),
password: document.getElementById("loginPassword"),
remember: document.getElementById("loginRememberMe"),
submit: document.getElementById("loginSubmitBtn"),
error: document.getElementById("loginError"),
success: document.getElementById("loginSuccess"),
loginTurnstileToken: document.getElementById("loginTurnstileToken"),
loginTurnstileMount: document.getElementById("loginTurnstileMount"),
logout: document.getElementById("logoutBtn"),
forgotForm: document.getElementById("forgotPasswordForm"),
forgotEmail: document.getElementById("forgotPasswordEmail"),
forgotError: document.getElementById("forgotPasswordError"),
forgotSuccess: document.getElementById("forgotPasswordSuccess"),
forgotTurnstileMount: document.getElementById("forgotPasswordTurnstileMount"),
forgotSubmit: document.getElementById("forgotPasswordSubmitBtn"),
showForgotPasswordBtn: document.getElementById("showForgotPasswordBtn"),
backToLoginBtn: document.getElementById("backToLoginBtn"),
backToPasswordBtn: document.getElementById("backToPasswordBtn"),
mfaForm: document.getElementById("mfaLoginForm"),
mfaCode: document.getElementById("mfaLoginCode"),
mfaSubmit: document.getElementById("mfaLoginSubmitBtn"),
mfaError: document.getElementById("mfaLoginError"),
mfaSuccess: document.getElementById("mfaLoginSuccess"),
mfaHelp: document.getElementById("mfaLoginHelp"),
security: document.getElementById("securityBtn"),
topSecurityOption: document.getElementById("topSecurityOption"),
topAddUserOption: document.getElementById("topAddUserOption")
};
const nativeFetch = window.fetch.bind(window);
window.API = API;
window.nativeFetch = nativeFetch;
window.fetch = async (input, init = {}) => {
const requestUrl = typeof input === "string" ? input : (input && input.url ? input.url : "");
const isApiRequest = String(requestUrl || "").startsWith(API);
const headers = new Headers((init && init.headers) || (input && input.headers) || {});
const requestInit = { ...init, headers };
if (isApiRequest) {
requestInit.credentials = "include";
}
const response = await nativeFetch(input, requestInit);
const normalizedUrl = String(requestUrl || "");
const isAuthTransitionRequest = normalizedUrl.includes("/auth/login")
  || normalizedUrl.includes("/auth/mfa/verify-login")
  || normalizedUrl.includes("/auth/mfa/status-pending")
  || normalizedUrl.includes("/auth/mfa/setup-pending")
  || normalizedUrl.includes("/auth/mfa/verify-setup-pending");
if (isApiRequest && response.status === 401 && !isAuthTransitionRequest) {
showLogin("Please sign in to continue.");
}
return response;
};

let appToastQueue = Promise.resolve();

function showToast(message, options = {}){
const text = String(message || '').trim();
if(!text) return;

const duration = Math.max(4000, Number(options.duration || 4000));
const enterMs = Math.max(280, Number(options.enterMs || 320));
const exitMs = Math.max(280, Number(options.exitMs || 320));
const tone = String(options.tone || options.type || 'default').trim().toLowerCase();

appToastQueue = appToastQueue.then(() => new Promise(resolve => {
  let host = document.getElementById('appToastHost');
  if(!host){
    host = document.createElement('div');
    host.id = 'appToastHost';
    host.setAttribute('aria-live','polite');
    host.setAttribute('aria-atomic','true');
    host.style.position = 'fixed';
    host.style.left = '50%';
    host.style.top = '50%';
    host.style.transform = 'translate(-50%, -50%)';
    host.style.display = 'flex';
    host.style.flexDirection = 'column';
    host.style.alignItems = 'center';
    host.style.justifyContent = 'center';
    host.style.gap = '10px';
    host.style.zIndex = '9999';
    host.style.pointerEvents = 'none';
    document.body.appendChild(host);
  }

  const toast = document.createElement('div');
  toast.className = 'appToast';
  toast.textContent = text;
  toast.style.minWidth = '240px';
  toast.style.maxWidth = '420px';
  toast.style.padding = '14px 18px';
  toast.style.borderRadius = '16px';
  toast.style.border = tone === 'error'
    ? '1px solid rgba(248,113,113,.42)'
    : '1px solid rgba(143,210,255,.28)';
  toast.style.background = tone === 'error'
    ? 'linear-gradient(180deg, rgba(70,16,20,.96), rgba(38,10,13,.96))'
    : 'linear-gradient(180deg, rgba(21,28,40,.96), rgba(12,17,27,.96))';
  toast.style.color = 'rgba(255,255,255,.98)';
  toast.style.boxShadow = tone === 'error'
    ? '0 16px 40px rgba(0,0,0,.40), 0 0 0 1px rgba(248,113,113,.12), 0 0 26px rgba(248,113,113,.16)'
    : '0 16px 40px rgba(0,0,0,.38), 0 0 0 1px rgba(11,135,224,.08)';
  toast.style.backdropFilter = 'blur(14px)';
  toast.style.fontSize = '15px';
  toast.style.fontWeight = '800';
  toast.style.letterSpacing = '.01em';
  toast.style.textAlign = 'center';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(12px) scale(.98)';
  toast.style.transition = `opacity ${enterMs}ms ease, transform ${enterMs}ms ease`;
  host.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0) scale(1)';
  });

  window.setTimeout(() => {
    toast.style.transition = `opacity ${exitMs}ms ease, transform ${exitMs}ms ease`;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px) scale(.98)';

    window.setTimeout(() => {
      toast.remove();
      if(host && !host.childElementCount) host.remove();
      resolve();
    }, exitMs);
  }, duration);
})).catch(() => {});
}

/**
 * smartPositionMenu(triggerEl, menuEl)
 * Phase 6 fix: auto-flips a dropdown menu up or down based on available viewport space.
 * Applies .menu-flip-up class when opening upward; removes it when opening downward.
 * Called universally for all task-change menus.
 */
function smartPositionMenu(triggerEl, menuEl) {
  if (!triggerEl || !menuEl) return;
  /* Default is upward (bottom: calc(100% + 6px)).
     Only flip downward if there is significantly more space below than above. */
  const MENU_HEIGHT_ESTIMATE = 220;
  const VIEWPORT_HEIGHT = window.innerHeight;
  const triggerRect = triggerEl.getBoundingClientRect();
  const spaceBelow = VIEWPORT_HEIGHT - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  const flipDown = spaceBelow > spaceAbove && spaceBelow >= MENU_HEIGHT_ESTIMATE;
  if (flipDown) {
    menuEl.classList.add('menu-flip-down');
    menuEl.classList.remove('menu-flip-up');
  } else {
    menuEl.classList.remove('menu-flip-down');
    menuEl.classList.remove('menu-flip-up');
  }
}
window.smartPositionMenu = smartPositionMenu;

function setAuthToken(){}
function getAuthToken(){ return ""; }
function clearAuthToken(){}
function setAuthMessage(type, message){
if(authUi.error) authUi.error.textContent = type === "error" ? message : "";
if(authUi.success) authUi.success.textContent = type === "success" ? message : "";
}
function setForgotMessage(type, message){
if(authUi.forgotError) authUi.forgotError.textContent = type === "error" ? message : "";
if(authUi.forgotSuccess) authUi.forgotSuccess.textContent = type === "success" ? message : "";
}
function renderForgotPasswordTurnstileWhenReady(attempts = 0){
const renderer = window.renderForgotPasswordTurnstile;
if(typeof renderer === "function"){
  renderer();
  return;
}
if(attempts >= 20) return;
window.setTimeout(() => renderForgotPasswordTurnstileWhenReady(attempts + 1), 150);
}
function hideForgotPasswordTurnstile(){
if(authUi.forgotTurnstileMount){
  authUi.forgotTurnstileMount.style.display = "none";
  authUi.forgotTurnstileMount.setAttribute("aria-hidden", "true");
}
if(window.onForgotPasswordTurnstileExpired) window.onForgotPasswordTurnstileExpired();
}
function renderLoginTurnstileWhenReady(attempts = 0){
const renderer = window.renderLoginTurnstile;
if(typeof renderer === "function"){
  renderer();
  return;
}
if(attempts >= 20) return;
window.setTimeout(() => renderLoginTurnstileWhenReady(attempts + 1), 150);
}
function hideLoginTurnstile(){
if(authUi.loginTurnstileMount){
  authUi.loginTurnstileMount.style.display = "none";
  authUi.loginTurnstileMount.setAttribute("aria-hidden", "true");
}
if(window.onLoginTurnstileExpired) window.onLoginTurnstileExpired();
}
function showForgotPassword(){
authUi.form?.classList.remove("open");
authUi.form && (authUi.form.style.display = "none");
authUi.forgotForm?.classList.add("open");
authUi.forgotForm && (authUi.forgotForm.style.display = "block");
setAuthMessage("error", "");
setAuthMessage("success", "");
setForgotMessage("error", "");
setForgotMessage("success", "");
renderForgotPasswordTurnstileWhenReady();
}
function showLoginForm(message = "", type = "error", options = {}){
const preserveLoginTurnstile = !!options.preserveLoginTurnstile;
authUi.forgotForm?.classList.remove("open");
authUi.forgotForm && (authUi.forgotForm.style.display = "none");
hideForgotPasswordTurnstile();
if(!preserveLoginTurnstile){
  hideLoginTurnstile();
}
authUi.form?.classList.add("open");
authUi.form && (authUi.form.style.display = "block");
setForgotMessage("error", "");
setForgotMessage("success", "");
setAuthMessage(type, message);
}
function showLogin(message = "", type = "error"){
showPasswordLoginForm(message, type);
authUi.overlay?.classList.add("open");
authUi.overlay?.setAttribute("aria-hidden","false");
if (authUi.overlay) authUi.overlay.inert = false;
if(authUi.logout) authUi.logout.style.display = "none";
if(authUi.security) authUi.security.style.display = "none";
if(authUi.topSecurityOption) authUi.topSecurityOption.style.display = "none";
}
function hideLogin(){
setAuthMessage("error", "");
setAuthMessage("success", "");
setForgotMessage("error", "");
setForgotMessage("success", "");
hideLoginTurnstile();
if (document.activeElement && authUi.overlay?.contains(document.activeElement)) {
try { document.activeElement.blur(); } catch {}
}
authUi.overlay?.classList.remove("open");
authUi.overlay?.setAttribute("aria-hidden","true");
if (authUi.overlay) authUi.overlay.inert = true;
if(authUi.logout) authUi.logout.style.display = "inline-flex";
if(authUi.security) authUi.security.style.display = "none";
if(authUi.topSecurityOption) authUi.topSecurityOption.style.display = isAdminUser() ? "block" : "none";
}
function hideAuthOverlayForModal(){
if(!authUi.overlay) return;
authUi.overlay.classList.remove("open");
authUi.overlay.setAttribute("aria-hidden","true");
authUi.overlay.inert = true;
}
function restoreAuthOverlayForLogin(){
if(!authUi.overlay) return;
authUi.overlay.classList.add("open");
authUi.overlay.setAttribute("aria-hidden","false");
authUi.overlay.inert = false;
}
async function fetchAuthenticatedUser(){
const res = await nativeFetch(`${API}/auth/me`, {
credentials: "include"
});
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!data.ok || !data.authenticated || !data.user){
clearAuthToken();
return null;
}
return data.user;
}
async function loginWithPassword(email, password, rememberMe){
const payload = { email, password, rememberMe };

try {
const turnstileToken = getTurnstileToken({
form: authUi.form,
fieldId: "loginTurnstileToken",
windowKey: "loginTurnstileToken"
});
if (turnstileToken) {
payload.captchaToken = turnstileToken;
payload.turnstileToken = turnstileToken;
}
} catch {}

const res = await nativeFetch(`${API}/auth/login`, {
credentials: "include",
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload)
});
const data = await res.json().catch(() => ({}));
if(!res.ok || !data.ok){
if(data && data.captchaRequired){
  renderLoginTurnstileWhenReady();
}
const error = new Error(data.message || "Login failed");
error.captchaRequired = !!(data && data.captchaRequired);
throw error;
}
hideLoginTurnstile();
return data;
}
async function verifyLoginMfa(code){
const res = await nativeFetch(`${API}/auth/mfa/verify-login`, {
credentials: "include",
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ code })
});
const data = await res.json().catch(() => ({}));
if(!res.ok || !data.ok){
if(res.status === 401){
  const error = new Error(data.message || "Your MFA session expired. Please sign in again.");
  error.sessionExpired = true;
  throw error;
}
throw new Error(data.message || "MFA verification failed");
}
return data.user || null;
}
async function fetchPendingMfaStatus(){
const res = await nativeFetch(`${API}/auth/mfa/status-pending`, { credentials: "include" });
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!res.ok || !data.ok) throw new Error(data.message || "Unable to load pending MFA status");
return data;
}
async function startPendingMfaSetupRequest(){
const res = await nativeFetch(`${API}/auth/mfa/setup-pending`, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"} });
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!res.ok || !data.ok) throw new Error(data.message || "Unable to start MFA enrollment");
return data;
}
async function verifyPendingMfaSetupRequest(code){
const res = await nativeFetch(`${API}/auth/mfa/verify-setup-pending`, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ code }) });
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!res.ok || !data.ok) throw new Error(data.message || "Unable to verify MFA enrollment");
return data.user || null;
}
function setMfaLoginMessage(type, message){
if(authUi.mfaError) authUi.mfaError.textContent = type === "error" ? String(message || "") : "";
if(authUi.mfaSuccess) authUi.mfaSuccess.textContent = type === "success" ? String(message || "") : "";
}
function showMfaLoginForm(message = "", kind = "verify"){
if(authUi.form) authUi.form.style.display = "none";
if(authUi.forgotForm) authUi.forgotForm.style.display = "none";
if(authUi.mfaForm) authUi.mfaForm.style.display = "block";
if(authUi.mfaHelp){
  authUi.mfaHelp.textContent = kind === "enroll"
    ? "Your account requires MFA before you can continue. Set it up now from the Security modal after you verify your first code."
    : "Enter the current 6-digit code from your authenticator app. You can also use a backup code.";
}
setAuthMessage("error", "");
setAuthMessage("success", "");
setForgotMessage("error", "");
setForgotMessage("success", "");
setMfaLoginMessage(message ? (kind === "enroll" ? "success" : "error") : "error", message || "");
if(authUi.mfaCode) authUi.mfaCode.value = "";
}
function showPasswordLoginForm(message = "", type = "error", options = {}){
if(authUi.mfaForm) authUi.mfaForm.style.display = "none";
const preserveLoginTurnstile = !!options.preserveLoginTurnstile;
if(!preserveLoginTurnstile){
  hideLoginTurnstile();
}
showLoginForm(message, type, { preserveLoginTurnstile });
}

function getTurnstileToken(options = {}){
const form = options.form || document;
const selector = options.selector || ".cf-turnstile, [data-turnstile-widget], [data-sitekey]";
const fieldId = String(options.fieldId || "").trim();
const windowKey = String(options.windowKey || "").trim();
let token = "";
try{
const specificField = fieldId ? document.getElementById(fieldId) : null;
const field =
specificField ||
document.getElementById("forgotPasswordTurnstileToken") ||
document.getElementById("loginTurnstileToken") ||
document.getElementById("turnstileToken") ||
document.querySelector('[name="turnstileToken"]') ||
document.querySelector('[name="captchaToken"]') ||
form?.querySelector?.('input[name="cf-turnstile-response"]') ||
document.querySelector('input[name="cf-turnstile-response"]');

token = String(
field?.value ||
(windowKey ? window[windowKey] : "") ||
window.forgotPasswordTurnstileToken ||
window.loginTurnstileToken ||
window.turnstileToken ||
""
).trim();

if(token) return token;

const widgetEl = form?.querySelector?.(selector) || document.querySelector(selector);
if(widgetEl){
const responseField =
widgetEl.querySelector?.('input[name="cf-turnstile-response"]') ||
form?.querySelector?.('input[name="cf-turnstile-response"]') ||
document.querySelector('input[name="cf-turnstile-response"]');

token = String(
responseField?.value ||
(typeof window.turnstile !== "undefined" && typeof window.turnstile.getResponse === "function"
? window.turnstile.getResponse(widgetEl)
: "") ||
""
).trim();
}
} catch {}
return token;
}

async function requestPasswordReset(email){
const payload = { email };

try {
const turnstileToken = getTurnstileToken({ form: authUi.forgotForm });
if (turnstileToken) {
payload.captchaToken = turnstileToken;
payload.turnstileToken = turnstileToken;
}
} catch {}

const res = await nativeFetch(`${API}/auth/forgot-password`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload)
});
const data = await res.json().catch(() => ({}));
if(!res.ok || !data.ok){
throw new Error(data.message || "Unable to send reset link");
}
return data;
}
function createEmptyRemoteState(){
return {
nearbyApiUsage:{ calls:0, limit:4000, remaining:4000, disabled:false, monthKey:"" },
statsByOwner:{},
statsMetaByOwner:{},
userStateByOwner:{},
companyStateById:{},
activityReportByKey:{},
activityReportLoading:false,
statsDebug:null,
emailOpensByOwner:{},
completedTouchesByKey:{},
completedTrailRequestId:0
};
}

/* -- Nearby API usage (moved to capture.js Phase 4) -- */
function normalizeNearbyApiUsage(r){ return window.normalizeNearbyApiUsage ? window.normalizeNearbyApiUsage(r) : {calls:0,limit:4000,remaining:4000,disabled:false,monthKey:''}; }
function setNearbyApiUsage(r){ if(window.setNearbyApiUsage) window.setNearbyApiUsage(r); }
function getNearbyApiUsage(){ return window.getNearbyApiUsage ? window.getNearbyApiUsage() : {calls:0,limit:4000,remaining:4000,disabled:false,monthKey:''}; }
async function loadNearbyApiUsage(){ if(window.loadNearbyApiUsage) return window.loadNearbyApiUsage(); }
function renderNearbyApiUsageLabel(){ return window.renderNearbyApiUsageLabel ? window.renderNearbyApiUsageLabel() : ''; }
function isNearbyApiDisabled(){ return window.isNearbyApiDisabled ? window.isNearbyApiDisabled() : false; }
function buildNearbyMatchesHeading(){ return window.buildNearbyMatchesHeading ? window.buildNearbyMatchesHeading() : ''; }
function syncNearbyApiDisabledUi(){ if(window.syncNearbyApiDisabledUi) window.syncNearbyApiDisabledUi(); }

function resetSessionUiState(options = {}){
const preserveAuthUser = !!options.preserveAuthUser;
state.owners = [];
state.backendSelectableUsers = [];
state.manageUsers = [];
state.companies = [];
state.selectedOwnerId = "";
state.selectedCompanyId = "";
state.pinnedCompanyId = "";
state.focusCompanyId = "";
state.focusQueueOrderByOwner = {};
state.pendingPostAddCompanyId = "";
state.remote = createEmptyRemoteState();
state.emailEditor = { companyId: "", touchIndex: -1 };
state.loadingCompanies = false;
state.loadingMoreCompanies = false;
state.prospectHasMore = false;
state.serverPage = 1;
state.serverHasMore = false;
state.serverTotal = 0;
state.serverSearchQuery = "";
ensureLocalCollections();
state.local.ui = {};
state.local.motivationHistory = {};
state.local.dismissedEmailOpensByOwner = {};
if(!preserveAuthUser){
state.authUser = null;
window.__prospectAuthUser = null;
}
if(ui.ownerSelect) ui.ownerSelect.value = "";
if(ui.searchBox) ui.searchBox.value = "";
if(ui.notesBox){
ui.notesBox.value = "";
ui.notesBox.dataset.companyId = "";
}
if(ui.sidebarStatus) ui.sidebarStatus.textContent = "";
if(typeof setQuickNotesSavingState === "function") resetQuickNotesSavingState();
if(typeof renderOwners === "function") renderOwners();
if(typeof renderProspectList === "function") renderProspectList();
CQBus.emit('render:detail');
CQBus.emit('render:board');
if(typeof renderLeaderboard === "function") renderLeaderboard();
if(typeof renderWeeklyStats === "function") renderWeeklyStats();
if(typeof updateProgress === "function") updateProgress();
if(typeof renderEmailOpensIndicator === "function") renderEmailOpensIndicator();
}
async function logoutUser(){
resetSessionUiState();
clearAuthToken();
try{
await nativeFetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
} catch {}
showLogin("Signed out.", "success");
}
async function ensureAuthenticated(){
const user = await fetchAuthenticatedUser();
if(user){
hideLogin();
loadNearbyApiUsage().catch(() => {});
return user;
}
showLogin("");
return null;
}
const PROGRESS_VISUAL_MAX_POINTS = 40;
let TOUCH_TEMPLATE = [
{ touch: 1, week: 1, title: "Touch 1 — Mail Intro Postcard", meta: "", tag: { label: "Letter", color: "orange" }, details: `Objective: Introduce name recognition without pitching. The goal is to establish local credibility.

Prepare and mail your first postcard in the outreach series. This postcard should focus on local credibility and familiarity rather than services or sales messaging.

Handwrite the company address in the address field. This is intentional and helps the postcard stand out from typical marketing mail. A handwritten address increases the likelihood that the postcard is noticed and opened.

Once the postcard is ready to be mailed, document the activity in CW. Note the activity, set the mailing time, and select Closed – New Follow Up.

Important: in the summary of the activity, name the next follow-up activity “2 – Social Media Connect” and set the due date for later this same week. This ensures the second touchpoint happens shortly after the postcard arrives and continues the sequence.`, points: 1 },
{ touch: 2, week: 1, title: "Touch 2 — Social Media Connect", meta: "", tag: { label: "Social", color: "blue" }, details: `Objective: Introduce name recognition without pitching.

Connect on LinkedIn and Facebook. Like the practice page and some recent posts.

LinkedIn msg example: “Hi Sarah, I work with Dr. Taft and other practices in the area and I wanted to connect. Thanks!”

Facebook example: after sending the friend request, like a recent post from the business or comment with a genuine question or compliment (like, “Great tip on practice management!”).

Name the next follow-up activity “3 – Crumpled Letter” and set the due date for next week.`, points: 1 },
{ touch: 3, week: 2, title: "Touch 3 — Crumpled Letter", meta: "", tag: { label: "Letter", color: "orange" }, details: `Objective: Pattern interrupt. In a world where everyone is being bombarded by social and AI generated e-mails, you’re taking the time to show actual human connection from an expert.

Be sure to customize the letter around your personality, and hand-sign it!

See your crumpled letter template here: Shared Team Folder.

Regular standard letter and envelope. Hand crumple the envelope before you send it.

Name the next follow-up activity “4 – Intro Email” and set the due date for Thu this week.`, points: 1 },
{ touch: 4, week: 2, title: "Touch 4 — Intro Email", meta: "", tag: { label: "Digital", color: "blue" }, details: `Objective: Demonstrate your competence and knowledge early in the process.

Example e-mail:
Subject: Local dental IT resource
Body:
Hi (NameHere),

I wanted to introduce myself, I work with (premier client) and other dental practices in the area and spend most of my time helping offices think through their technology, support, and cybersecurity in a practical way.

Every practice is a little different, but a lot of what we see tends to revolve around the same things, practice management systems like Dentrix or Eaglesoft, imaging and cone beam setups, backups, and making sure everything is actually working together the way it should.

No ask here, just wanted to put a name to Advantage Technologies in case you ever want a second opinion or need a resource locally.

If nothing else, you’ll at least know who to call if something comes up.

Have a great week,

Name the next follow-up activity “5 – Simple Postcard” and set the due date for next week Monday.`, points: 1 },
{ touch: 5, week: 3, title: "Touch 5 — Simple Postcard", meta: "", tag: { label: "Letter", color: "orange" }, details: `Prepare and mail your second postcard in the outreach series. This postcard will focus on the simplicity of our IT solution. Highlighting how easy it should be for them.

Handwrite the prospect name (the person not the company) and company address in the address field. This is intentional and helps the postcard stand out from typical marketing mail. A handwritten address increases the likelihood that the postcard is noticed and opened.

Write clearly and as legibly as possible to ensure deliverability.

Name the next follow-up activity “6 – Intro Call“ and set the due date for Tue this week.`, points: 1 },
{ touch: 6, week: 3, title: "Touch 6 — Intro Call", meta: "", tag: { label: "Phone", color: "green" }, details: `Objective: First person to person connect, start the conversation.

Example Call:
“Hi this is this is Bryan from Advantage Tech. Is (NameHere) in? “

If no, or if they wont come to the phone, proceed with:

“Oh well, I sent them a letter last week, it was kinda crumpled. Did you see that? (intentional pause).”

“I just wanted to introduce myself. I work with (Premier Client) and a lot of practices in the area and wanted to make sure you had my contact info if you ever needed perspective or a second opinion about IT support and cybersecurity.”

If the conversation is going well, lead toward the next step:
“I’ll be in the area on [day]. Would it be alright if I stopped by and said hello, will (NameHere) be in?”

Example Call (Voicemail):
“Hi Sarah, this is Bryan from Advantage Tech. I sent you the crumpled letter last week. Just wanted to introduce myself and be a resource if you ever needed perspective or a second opinion about IT support and cybersecurity. Feel free to call me if I can be of help – 877.723.8832 x111. Have a great day!” Keep it light, keep it conversational.

Don’t be intimidated or intimidating. You’re just making a connection.

Name the next follow-up activity “7 – Strategic Walk-In” and set the due date for next week.`, points: 1 },
{ touch: 7, week: 4, title: "Touch 7 — Strategic Walk-In", meta: "", tag: { label: "In Person", color: "orange" }, details: `Objective: Increase familiarity, put a face to the name. Unlock the door to the OTA decision.

You’re walking in. Referencing the conversation you had in step 6. Things like who you first spoke with, the time they agreed would be ok to stop by, and make it your talk track. Something like “hey, look, I made it like I said I would, right at 2PM”.

If you connect with the target contact NOW IS YOUR CHANCE. Be direct and ask them for 5 minutes of their time.

Ammo questions:
“who are you using for your IT company?”
“Are they dental specific?“
“If you could change anything technology wise, what would that be and why?”
“Do you wish you could do something that you current cannot do?”

If conversation is going well suggest an OTA “Are you like most dental practices where Friday is either a half day or you’re off entirely?”

(pause)

“Perfect. I was thinking I could swing by this Friday, take a quick look at what you’ve got going on, and get a feel for any headaches or concerns on your end.”

(slight beat)

“No commitment or anything like that. I’ll just show you what I see firsthand, and if it’s helpful, great. If not, you can kick me out and we’ll call it a day.”

(light tone)

“Does Friday morning or afternoon work better?”

If you schedule an OTA: YOU DID IT! Create an opportunity in CW. Take out of your list.

If the answer is “not at this time” then proceed to step 8.

Name the next follow-up activity “8 – Secure Postcard” and set the due date for next week.`, points: 5 },
{ touch: 8, week: 5, title: "Touch 8 — Secure Postcard", meta: "", tag: { label: "Letter", color: "orange" }, details: `Prepare and mail your third postcard in the outreach series. This postcard will focus on the security of our IT solution. Highlighting how trust in your protection, and how things should be.

Handwrite the company address in the address field. This is intentional and helps the postcard stand out from typical marketing mail. A handwritten address increases the likelihood that the postcard is noticed and opened.

Write clearly and as legibly as possible to ensure deliverability.

Name the next follow-up activity “9 – Stable Postcard” and set the due date for next week.`, points: 1 },
{ touch: 9, week: 6, title: "Touch 9 — Stable Postcard", meta: "", tag: { label: "Letter", color: "orange" }, details: `Prepare and mail your fourth postcard in the outreach series. This postcard will focus on the stability of our IT solution.

Handwrite the company address in the address field. This is intentional and helps the postcard stand out from typical marketing mail. A handwritten address increases the likelihood that the postcard is noticed and opened.

Write clearly and as legibly as possible to ensure deliverability.

Name the next follow-up activity “10 – Call (Cost Savings)” Set due date for Thu this week.`, points: 1 },
{ touch: 10, week: 6, title: "Touch 10 — Call - Relationship Call", meta: "", tag: { label: "Phone", color: "green" }, details: `Objective: Refer to your visit on site. Mention the postcards mailed. Talk about “Reduce IT costs and increase support coverage”

***Pause, breathe, allow this conversation to happen organically***

Example Call

Reference recent walk-in visit: “I enjoyed stopping by and seeing the office.”

Pivot to the postcards “I just wanted to check if you received them.”

Let them respond, and if they mention anything specific, lean into that.

After that, offer value. Share a small tip related to what you noticed about their business. Close by saying something like,

“No rush, but if you’d like to explore how we could help down the road, we’d love to support you when the time feels right.”

Keep it light, conversational, and friendly!

Name the next follow-up activity 11 – Supported Postcard. Set the due date for next week.`, points: 1 },
{ touch: 11, week: 7, title: "Touch 11 — Supported Postcard", meta: "", tag: { label: "Letter", color: "orange" }, details: `Prepare and mail your fifth postcard in the outreach series. This postcard will focus on the support of our IT solution. What makes us special.

Handwrite the company address in the address field. This is intentional and helps the postcard stand out from typical marketing mail. A handwritten address increases the likelihood that the postcard is noticed and opened.

Write clearly and as legibly as possible to ensure deliverability.

Name the next follow-up activity 12 – Close Loop Call and set the due date for Thu this week.`, points: 1 },
{ touch: 12, week: 8, title: "Touch 12 — Close the Loop Call", meta: "", tag: { label: "Phone", color: "green" }, details: `Objective: Make a clear, respectful ask for an Onsite Technology Analysis (OTA) or confirm direction.

Example Script:

“Hi Sarah, I wanted to see if it would make sense to schedule an on-site technology review sometime this quarter. It’s simply an independent look at your technology and cybersecurity to make sure everything is aligned and nothing is being missed. Since you’re close to (Premier Client) and some of our other clients, there’s no charge.”

If helpful, reinforce the value with context they’ve shared:

“You mentioned that your setup hasn’t really been evaluated in a few years. This is a chance to take a fresh look. If we find opportunities to save money, great. If we uncover a risk or gap, you’ll at least know about it. Either way, it’s a win and gives you clarity.”

If met with resistance:

“Totally understand. I mainly wanted to make sure you knew the option was there and that we’re available if things change or if you ever want a second perspective.”

If the call is unanswered, proceed with the close-the-loop email as the next touch.

Name the next follow-up activity Touch 13 – Close Loop Email and set the due date for Fri this week.`, points: 1 },
{ touch: 13, week: 8, title: "Touch 13 — Close the Loop Email", meta: "", tag: { label: "Digital", color: "blue" }, details: `If you were unable to speak with them to close the loop and offer the OTA, use this email example.

Subject: A second set of eyes on your IT

Hi Sarah,

I wanted to see if it would make sense to schedule a quick on-site technology review sometime this quarter. It’s just an independent look at your IT and cybersecurity to make sure everything’s aligned. Since you’re near (Premier Client), there’s no charge.

You mentioned it’s been a while since things were reviewed, so this is a simple way to get clarity. If we find savings, great. If there’s a gap, at least you’ll know.

If now’s not the right time, no problem at all. Just wanted to make sure you had the option.

Send off that email and if you get an answer, great! If you don’t, it's time to close this chapter and set this lead to long term nurture.`, points: 1 },
];

const TASK_TYPE_DEFAULT_CONTENT = {
phone: {
meta: "",
details: `Objective: Start or continue a real conversation by phone.

Use a light, conversational tone. Reference any recent activity such as a postcard, email, or walk-in if relevant.

Keep the call focused on making a connection, learning something useful, and moving naturally toward the next step.

If no one answers, leave a short, friendly voicemail and keep momentum going with the next touch.`
},
video: {
meta: "",
details: `Objective: Create a live face-to-face conversation in a simple, low-pressure way.

Keep it conversational, brief, and focused on discovery. Use the meeting to build familiarity, ask a few thoughtful questions, and identify whether there is room for a future OTA or deeper conversation.

If scheduling does not happen, document the outcome and move to the next touch.`
},
email: {
meta: "",
details: `Objective: Send a clear, professional email that builds credibility without sounding pushy.

Keep the message concise, practical, and local. Reference relevant experience, a nearby client when appropriate, and position yourself as a helpful resource.

End with a soft next step or simple offer to help, then document the activity and continue the cadence.`
},
social: {
meta: "",
details: `Objective: Build familiarity and recognition through social engagement.

Connect on LinkedIn or the most relevant platform, engage naturally with recent content, and keep any outreach message short and friendly.

Use this touch to create visibility and warmth rather than making a hard ask.`
},
stopIn: {
meta: "",
details: `Objective: Increase familiarity by showing up in person and turning prior touches into a real conversation.

Reference earlier outreach if possible, keep your energy light, and look for an opening to ask a few practical questions.

If the conversation goes well, move naturally toward an OTA or a short follow-up meeting.`
},
mailer: {
meta: "",
details: `Objective: Use physical mail to stand out and reinforce your presence in a memorable way.

Keep the message simple, personal, and relevant. Handwrite the address when possible, aim for clarity, and document the mailing in CW once complete.

Use the summary to tee up the next touch and keep the sequence moving.`
},
sms: {
meta: "",
details: `Objective: Send a short, conversational text that feels human and easy to respond to.

Keep it brief, personal, and low pressure. Use SMS to reinforce earlier outreach, create familiarity, and open the door to a simple reply.

Avoid over-explaining. The goal is a natural response, not a long pitch.`
}
};
const TASK_TYPE_CONFIG = {
phone: {
label: "Phone Call",
icon: "📞",
tag: { label: "Phone", color: "green" },
actionLabel: "Call Prospect",
actionKind: "phone",
statCategory: "calls",
defaultPoints: 1
},
video: {
label: "Video Call",
icon: "🎥",
tag: { label: "Video", color: "green" },
actionLabel: "Call Prospect",
actionKind: "phone",
statCategory: "meetings",
defaultPoints: 5
},
email: {
label: "Email",
icon: "📧",
tag: { label: "Digital", color: "blue" },
actionLabel: "Send Email",
actionKind: "email",
statCategory: "emails",
defaultPoints: 1
},
social: {
label: "Social Message",
icon: "💬",
tag: { label: "Social", color: "blue" },
actionLabel: "Open LinkedIn",
actionKind: "linkedin",
statCategory: "social",
defaultPoints: 1
},
stopIn: {
label: "In Person Stop-In",
icon: "🤝",
tag: { label: "Meeting", color: "orange" },
actionLabel: "Open Maps",
actionKind: "map",
statCategory: "meetings",
defaultPoints: 5
},
mailer: {
label: "Mailer",
icon: "📬",
tag: { label: "Mailer", color: "orange" },
actionLabel: "Open Print Kit",
actionKind: "print",
statCategory: "letters",
defaultPoints: 1
},
sms: {
label: "SMS",
icon: "💬",
tag: { label: "SMS", color: "blue" },
actionLabel: "Send SMS",
actionKind: "sms",
statCategory: "social",
defaultPoints: 1
}
};
const TASK_CHANGE_OPTIONS = [
{ value: "phone", label: "Phone Call" },
{ value: "video", label: "Video Call" },
{ value: "email", label: "Email" },
{ value: "social", label: "Social Message" },
{ value: "stopIn", label: "In Person Stop-In" },
{ value: "mailer", label: "Mailer" },
{ value: "sms", label: "SMS" }
];
function normalizeTaskTypeKey(value){
const raw = String(value || '').trim();
if(!raw) return '';
const compact = raw.toLowerCase().replace(/[^a-z0-9]+/g, '');
const aliases = {
call: 'phone',
phone: 'phone',
phonecall: 'phone',
video: 'video',
videocall: 'video',
email: 'email',
sms: 'sms',
text: 'sms',
textmessage: 'sms',
social: 'social',
socialmessage: 'social',
linkedin: 'social',
stopin: 'stopIn',
inperson: 'stopIn',
inpersonstopin: 'stopIn',
walkin: 'stopIn',
mailer: 'mailer',
mail: 'mailer',
letter: 'mailer',
postcard: 'mailer',
task: 'mailer'
};
return aliases[compact] || '';
}
function getTaskTypeConfig(value){
const normalized = normalizeTaskTypeKey(value);
return TASK_TYPE_CONFIG[normalized] || null;
}
const EMAIL_TEMPLATE_OPTIONS = [
{ value: "default", label: "Default" },
{ value: "websiteVisit", label: "Website Visit" },
{ value: "meetingInvite", label: "Meeting Invite" },
{ value: "otaPitch", label: "OTA Pitch" },
{ value: "followUp", label: "Follow Up" }
];
const MAILER_TEMPLATE_OPTIONS = [
{ value: "crumpled", label: "Crumpled" },
{ value: "simple", label: "Simple" },
{ value: "stable", label: "Stable" },
{ value: "secure", label: "Secure" },
{ value: "supported", label: "Supported" }
];
const ui = {
ownerSelect: document.getElementById("ownerSelect"),
searchBox: document.getElementById("searchBox"),
sortBox: document.getElementById("sortBox"),
prospectList: document.getElementById("prospectList"),
actionBoardBtn: document.getElementById("actionBoardBtn"),
companyDetailBtn: document.getElementById("companyDetailBtn"),
calendarViewBtn: document.getElementById("calendarViewBtn"),
emailTemplateGear: document.getElementById("emailTemplateGear"),
topGearMenu: document.getElementById("topGearMenu"),
topActivityReportOption: document.getElementById("topActivityReportOption"),
topAddUserOption: document.getElementById("topAddUserOption"),
calendarTasksModal: document.getElementById("calendarTasksModal"),
closeCalendarTasksBtn: document.getElementById("closeCalendarTasksBtn"),
calendarPrevMonthBtn: document.getElementById("calendarPrevMonthBtn"),
calendarNextMonthBtn: document.getElementById("calendarNextMonthBtn"),
calendarMonthTitle: document.getElementById("calendarMonthTitle"),
calendarWeekdays: document.getElementById("calendarWeekdays"),
calendarGrid: document.getElementById("calendarGrid"),
cadenceDesignerBtn: document.getElementById("cadenceDesignerBtn"),
mainAppView: document.getElementById("mainAppView"),
cadenceDesignerModal: document.getElementById("cadenceDesignerModal"),
closeCadenceDesignerBtn: document.getElementById("closeCadenceDesignerBtn"),
cadenceDesignerStatus: document.getElementById("cadenceDesignerStatus"),
cadenceDesignerStepList: document.getElementById("cadenceDesignerStepList"),
cadenceDesignerName: document.getElementById("cadenceDesignerName"),
cadenceDesignerDescription: document.getElementById("cadenceDesignerDescription"),
cadenceDesignerImpact: document.getElementById("cadenceDesignerImpact"),
addCadenceDesignerStepBtn: document.getElementById("addCadenceDesignerStepBtn"),
saveCadenceDesignerBtn: document.getElementById("saveCadenceDesignerBtn"),
calendarSelectedDateTitle: document.getElementById("calendarSelectedDateTitle"),
calendarSelectedDateSub: document.getElementById("calendarSelectedDateSub"),
calendarTaskList: document.getElementById("calendarTaskList"),
activityReportModal: document.getElementById("activityReportModal"),
closeActivityReportBtn: document.getElementById("closeActivityReportBtn"),
activityReportMonthSelect: document.getElementById("activityReportMonthSelect"),
activityReportMineBtn: document.getElementById("activityReportMineBtn"),
activityReportTeamBtn: document.getElementById("activityReportTeamBtn"),
printActivityReportBtn: document.getElementById("printActivityReportBtn"),
shareActivityReportBtn: document.getElementById("shareActivityReportBtn"),
activityReportStatus: document.getElementById("activityReportStatus"),
activityPrintMeta: document.getElementById("activityPrintMeta"),
activityReportKpis: document.getElementById("activityReportKpis"),
activityMixDonut: document.getElementById("activityMixDonut"),
activityMixTotal: document.getElementById("activityMixTotal"),
activityMixLegend: document.getElementById("activityMixLegend"),
activityOutcomeBars: document.getElementById("activityOutcomeBars"),
activityWeekBars: document.getElementById("activityWeekBars"),
activityAheadBars: document.getElementById("activityAheadBars"),
activityBottomLine: document.getElementById("activityBottomLine"),
activityWinsBars: document.getElementById("activityWinsBars"),
refreshManageUsersBtn: document.getElementById("refreshManageUsersBtn"),
workspacePanel: document.getElementById("workspacePanel"),
focusBoard: document.getElementById("focusBoard"),
detailShell: document.getElementById("detailShell"),
todayFocusList: document.getElementById("todayFocusList"),
upNextList: document.getElementById("upNextList"),
focusSummary: document.getElementById("focusSummary"),
detailMetaRow: document.getElementById("detailMetaRow"),
priorityRow: document.getElementById("priorityRow"),
priorityCurrentBtn: document.getElementById("priorityCurrentBtn"),
priorityMenu: document.getElementById("priorityMenu"),
statusCurrentBtn: document.getElementById("statusCurrentBtn"),
statusMenu: document.getElementById("statusMenu"),
mainGrid: document.getElementById("mainGrid"),
sidebarPanel: document.getElementById("sidebarPanel"),
sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
sidebarToggleLabel: document.getElementById("sidebarToggleLabel"),
mobileDrawerBackdrop: document.getElementById("mobileDrawerBackdrop"),
detailContactHero: document.getElementById("detailContactHero"),
detailPrimaryName: document.getElementById("detailPrimaryName"),
detailCompanyTitle: document.getElementById("detailCompanyTitle"),
detailPrimaryEmail: document.getElementById("detailPrimaryEmail"),
detailPrimaryPhone: document.getElementById("detailPrimaryPhone"),
detailMailingAddress: document.getElementById("detailMailingAddress"),
detailFocusBtn: document.getElementById("detailFocusBtn"),
detailEngagementPopover: document.getElementById("detailEngagementPopover"),
detailEngagementIconBtn: document.getElementById("detailEngagementIconBtn"),
detailEngagementBadge: document.getElementById("detailEngagementBadge"),
detailEmailOpenStats: document.getElementById("detailEmailOpenStats"),
detailEngagementCount: document.getElementById("detailEngagementCount"),
detailOpenedEmails: document.getElementById("detailOpenedEmails"),
detailClickedEmails: document.getElementById("detailClickedEmails"),
detailLastOpened: document.getElementById("detailLastOpened"),
detailLastClicked: document.getElementById("detailLastClicked"),
detailLatestTemplate: document.getElementById("detailLatestTemplate"),
detailActionBtn: document.getElementById("detailActionBtn"),
detailNextTouch: document.getElementById("detailNextTouch"),
detailNextTouchTemplate: document.getElementById("detailNextTouchTemplate"),
detailNextTouchRow: document.getElementById("detailNextTouchRow"),
detailTaskChangeBtn: document.getElementById("detailTaskChangeBtn"),
detailTaskChangeMenu: document.getElementById("detailTaskChangeMenu"),
detailSettingsWrap: document.getElementById("detailSettingsWrap"),
detailSettingsBtn: document.getElementById("detailSettingsBtn"),
detailSettingsMenu: document.getElementById("detailSettingsMenu"),
detailAdjustTemplatesBtn: document.getElementById("detailAdjustTemplatesBtn"),
detailSettingsPanel: document.getElementById("detailSettingsPanel"),
detailSettingsCloseBtn: document.getElementById("detailSettingsCloseBtn"),
detailTemplateSelect: document.getElementById("detailTemplateSelect"),
detailTemplateNameWrap: document.getElementById("detailTemplateNameWrap"),
detailTemplateName: document.getElementById("detailTemplateName"),
detailTemplateSubject: document.getElementById("detailTemplateSubject"),
detailTemplateBody: document.getElementById("detailTemplateBody"),
detailTemplateSaveBtn: document.getElementById("detailTemplateSaveBtn"),
detailTemplateResetBtn: document.getElementById("detailTemplateResetBtn"),
detailTemplateAddBtn: document.getElementById("detailTemplateAddBtn"),
detailTemplateDeleteBtn: document.getElementById("detailTemplateDeleteBtn"),
detailCalendarBadge: document.getElementById("detailCalendarBadge"),
detailCalendarBadgeMonth: document.getElementById("detailCalendarBadgeMonth"),
detailCalendarBadgeDay: document.getElementById("detailCalendarBadgeDay"),
detailCalendarBadgeMeta: document.getElementById("detailCalendarBadgeMeta"),
detailHotBadgeSlot: document.getElementById("detailHotBadgeSlot"),
dueDateField: document.getElementById("dueDateField"),
dueDateInput: document.getElementById("dueDateInput"),
nextDuePrompt: document.getElementById("nextDuePrompt"),
nextDueCustomWrap: document.getElementById("nextDueCustomWrap"),
nextDueCustomInput: document.getElementById("nextDueCustomInput"),
nextDueTodayBtn: document.getElementById("nextDueTodayBtn"),
nextDueTomorrowBtn: document.getElementById("nextDueTomorrowBtn"),
nextDueThreeBtn: document.getElementById("nextDueThreeBtn"),
nextDueWeekBtn: document.getElementById("nextDueWeekBtn"),
nextDueCustomBtn: document.getElementById("nextDueCustomBtn"),
sidebarStatus: document.getElementById("sidebarStatus"),
progressText: document.getElementById("progressText"),
ownerProgressName: document.getElementById("ownerProgressName"),
statsDebugLine: document.getElementById("statsDebugLine"),
barFill: document.getElementById("barFill"),
callsStatValue: document.getElementById("callsStatValue"),
emailsStatValue: document.getElementById("emailsStatValue"),
socialStatValue: document.getElementById("socialStatValue"),
lettersStatValue: document.getElementById("lettersStatValue"),
stopInsStatCard: document.getElementById("stopInsStatCard"),
stopInsStatValue: document.getElementById("stopInsStatValue"),
callsStatCard: document.getElementById("callsStatCard"),
emailsStatCard: document.getElementById("emailsStatCard"),
socialStatCard: document.getElementById("socialStatCard"),
lettersStatCard: document.getElementById("lettersStatCard"),
currentTitle: document.getElementById("currentTitle"),
statusRow: document.getElementById("statusRow"),
touchToggle: document.getElementById("touchToggle"),
touchToggleIcon: document.getElementById("touchToggleIcon"),
touchWrap: document.getElementById("touchWrap"),
touchContainer: document.getElementById("touchContainer"),
notesBox: document.getElementById("notesBox"),
contactFirst: document.getElementById("contactFirst"),
contactLast: document.getElementById("contactLast"),
prospectEmail: document.getElementById("prospectEmail"),
prospectPhone: document.getElementById("prospectPhone"),
prospectLinkedIn: document.getElementById("prospectLinkedIn"),
companyDomain: document.getElementById("companyDomain"),
companyAddress: document.getElementById("companyAddress"),
addCompanyBtn: document.getElementById("addCompanyBtn"),
addUserModal: document.getElementById("addUserModal"),
closeAddUserModalBtn: document.getElementById("closeAddUserModalBtn"),
cancelAddUserBtn: document.getElementById("cancelAddUserBtn"),
submitAddUserBtn: document.getElementById("submitAddUserBtn"),
manageUsersList: document.getElementById("manageUsersList"),
manageUsersError: document.getElementById("manageUsersError"),
manageUsersSuccess: document.getElementById("manageUsersSuccess"),
newUserFullName: document.getElementById("newUserFullName"),
newUserEmail: document.getElementById("newUserEmail"),
newUserRole: document.getElementById("newUserRole"),
newUserOwnerId: document.getElementById("newUserOwnerId"),
addUserError: document.getElementById("addUserError"),
addUserSuccess: document.getElementById("addUserSuccess"),
addCompanyModal: document.getElementById("addCompanyModal"),
quickNotesModal: document.getElementById("quickNotesModal"),
quickNotesCompanyName: document.getElementById("quickNotesCompanyName"),
quickNotesBox: document.getElementById("quickNotesBox"),
closeQuickNotesModalBtn: document.getElementById("closeQuickNotesModalBtn"),
cancelQuickNotesBtn: document.getElementById("cancelQuickNotesBtn"),
saveQuickNotesBtn: document.getElementById("saveQuickNotesBtn"),
focusSearchBtn: document.getElementById("focusSearchBtn"),
focusNotesBtn: document.getElementById("focusNotesBtn"),
focusAddCompanyBtn: document.getElementById("focusAddCompanyBtn"),
closeAddCompanyModalBtn: document.getElementById("closeAddCompanyModalBtn"),
cancelAddCompanyBtn: document.getElementById("cancelAddCompanyBtn"),
submitAddCompanyBtn: document.getElementById("submitAddCompanyBtn"),
desktopManualEntryBtn: document.getElementById("desktopManualEntryBtn"),
desktopNearbyEntryBtn: document.getElementById("desktopNearbyEntryBtn"),
desktopScanCardBtn: document.getElementById("desktopScanCardBtn"),
desktopNearbyStatus: document.getElementById("desktopNearbyStatus"),
desktopNearbyResults: document.getElementById("desktopNearbyResults"),
desktopScanModal: document.getElementById("desktopScanModal"),
closeDesktopScanModalBtn: document.getElementById("closeDesktopScanModalBtn"),
desktopCardImageInput: document.getElementById("desktopCardImageInput"),
desktopChoosePhotoBtn: document.getElementById("desktopChoosePhotoBtn"),
desktopScanCameraBackBtn: document.getElementById("desktopScanCameraBackBtn"),
desktopStartCameraBtn: document.getElementById("desktopStartCameraBtn"),
desktopCaptureFrameBtn: document.getElementById("desktopCaptureFrameBtn"),
desktopRunCardScanBtn: document.getElementById("desktopRunCardScanBtn"),
desktopScanLiveVideo: document.getElementById("desktopScanLiveVideo"),
desktopScanCaptureCanvas: document.getElementById("desktopScanCaptureCanvas"),
desktopScanPreviewImage: document.getElementById("desktopScanPreviewImage"),
desktopScanPreviewPlaceholder: document.getElementById("desktopScanPreviewPlaceholder"),
desktopScanMessage: document.getElementById("desktopScanMessage"),
newCompanyName: document.getElementById("newCompanyName"),
newCompanyDomain: document.getElementById("newCompanyDomain"),
newPrimaryContact: document.getElementById("newPrimaryContact"),
newCompanyEmail: document.getElementById("newCompanyEmail"),
newCompanyPhone: document.getElementById("newCompanyPhone"),
newCompanyAddress: document.getElementById("newCompanyAddress"),
addCompanyError: document.getElementById("addCompanyError"),
addCompanySuccess: document.getElementById("addCompanySuccess"),
companyAddedOverlay: document.getElementById("companyAddedOverlay"),
companyAddedOverlayText: document.getElementById("companyAddedOverlayText"),
postAddPromptBackdrop: document.getElementById("postAddPromptBackdrop"),
postAddPromptSub: document.getElementById("postAddPromptSub"),
postAddPromptYesBtn: document.getElementById("postAddPromptYesBtn"),
postAddPromptNoBtn: document.getElementById("postAddPromptNoBtn"),
postAddTaskPicker: document.getElementById("postAddTaskPicker"),
postAddTaskSelect: document.getElementById("postAddTaskSelect"),
postAddTaskDateInput: document.getElementById("postAddTaskDateInput"),
deleteCompanyBtn: document.getElementById("deleteCompanyBtn"),
openLinkedInBtn: document.getElementById("openLinkedInBtn"),
advanceToast: document.getElementById("advanceToast"),
emailOpensBtn: document.getElementById("emailOpensBtn"),
emailOpensCount: document.getElementById("emailOpensCount"),
emailOpensModal: document.getElementById("emailOpensModal"),
emailOpensList: document.getElementById("emailOpensList"),
emailOpensEmpty: document.getElementById("emailOpensEmpty"),
emailOpensTotalLabel: document.getElementById("emailOpensTotalLabel"),
closeEmailOpensModalBtn: document.getElementById("closeEmailOpensModalBtn")
};
ui.detailSettingsWrap = ui.detailSettingsWrap || document.getElementById("topGearWrap");
ui.detailSettingsBtn = ui.detailSettingsBtn || document.getElementById("emailTemplateGear");
ui.detailSettingsMenu = ui.detailSettingsMenu || document.getElementById("topGearMenu");
ui.detailAdjustTemplatesBtn = ui.detailAdjustTemplatesBtn || document.getElementById("topAdjustTemplatesOption");
ui.activityReportBtn = ui.activityReportBtn || document.getElementById("topActivityReportOption");
ui.completedTodayBtn = ui.completedTodayBtn || document.getElementById("completedTodayBtn");
ui.completedTrailModal = ui.completedTrailModal || document.getElementById("completedTrailModal");
ui.completedTrailTitle = ui.completedTrailTitle || document.getElementById("completedTrailTitle");
ui.completedTrailMeta = ui.completedTrailMeta || document.getElementById("completedTrailMeta");
ui.completedTrailDaySelect = ui.completedTrailDaySelect || document.getElementById("completedTrailDaySelect");
ui.completedTrailList = ui.completedTrailList || document.getElementById("completedTrailList");
ui.closeCompletedTrailBtn = ui.closeCompletedTrailBtn || document.getElementById("closeCompletedTrailBtn");
ui.completedTrailShareBtn = ui.completedTrailShareBtn || document.getElementById("shareCompletedTrailBtn");
window.ui = ui;
const state = { owners: [], backendSelectableUsers: [], manageUsers: [], manageCadenceTemplates: [], manageUserCadenceDrafts: {}, manageUserCadenceModalUserId: "", companies: [], selectedOwnerId: "", selectedCompanyId: "", currentView: "board", pinnedCompanyId: "", focusCompanyId: "", focusQueueOrderByOwner: {}, pendingPostAddCompanyId: "", local: loadLocalState(), remote: createEmptyRemoteState(), emailEditor: { companyId: "", touchIndex: -1 }, detailTemplateEditor: { open: false, templateKey: "websiteVisit", draftCounter: 0 }, sidebarCollapsed: true, touchPatternExpanded: false, focusInstructionOpen: {}, authUser: null, prospectPageSize: 50, prospectRenderCount: 50, prospectHasMore: false, serverPage: 1, serverLimit: 50, serverHasMore: false, serverTotal: 0, serverSearchQuery: "", loadingCompanies: false, loadingMoreCompanies: false, searchDebounceTimer: null, activityTrailDay: "today", cadenceDesigner: { templates: [], globalDefaultTemplateId: "global-default", loading: false, saving: false } };
window.state = state;
let statAudioCtx = null;
function playStatRiseSound(category){
try{
const AudioCtx = window.AudioContext || window.webkitAudioContext;
if(!AudioCtx) return;
if(!statAudioCtx) statAudioCtx = new AudioCtx();
if(statAudioCtx.state === "suspended") statAudioCtx.resume();
const now = statAudioCtx.currentTime;
const master = statAudioCtx.createGain();
master.gain.setValueAtTime(0.0001, now);
master.gain.exponentialRampToValueAtTime(0.045, now + 0.02);
master.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
master.connect(statAudioCtx.destination);
const frequencies = category === "letters"
? [523.25, 659.25, 783.99]
: category === "calls"
? [392.0, 493.88, 587.33]
: category === "emails"
? [440.0, 554.37, 659.25]
: [349.23, 440.0, 523.25];
frequencies.forEach((freq, index) => {
const osc = statAudioCtx.createOscillator();
const gain = statAudioCtx.createGain();
osc.type = index === 0 ? "sine" : "triangle";
osc.frequency.setValueAtTime(freq, now + index * 0.045);
gain.gain.setValueAtTime(0.0001, now + index * 0.045);
gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.35 : 0.22, now + index * 0.045 + 0.015);
gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.045 + 0.18);
osc.connect(gain);
gain.connect(master);
osc.start(now + index * 0.045);
osc.stop(now + index * 0.045 + 0.2);
});
} catch(e){
console.warn("Stat audio unavailable", e);
}
}
function playAdvanceSound(){
try{
const AudioCtx = window.AudioContext || window.webkitAudioContext;
if(!AudioCtx) return;
if(!statAudioCtx) statAudioCtx = new AudioCtx();
if(statAudioCtx.state === "suspended") statAudioCtx.resume();
const now = statAudioCtx.currentTime;
const master = statAudioCtx.createGain();
master.gain.setValueAtTime(0.0001, now);
master.gain.exponentialRampToValueAtTime(0.05, now + 0.012);
master.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
master.connect(statAudioCtx.destination);
const osc1 = statAudioCtx.createOscillator();
const gain1 = statAudioCtx.createGain();
osc1.type = "triangle";
osc1.frequency.setValueAtTime(392, now);
osc1.frequency.exponentialRampToValueAtTime(587.33, now + 0.13);
gain1.gain.setValueAtTime(0.0001, now);
gain1.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
osc1.connect(gain1);
gain1.connect(master);
osc1.start(now);
osc1.stop(now + 0.2);
const osc2 = statAudioCtx.createOscillator();
const gain2 = statAudioCtx.createGain();
osc2.type = "sine";
osc2.frequency.setValueAtTime(659.25, now + 0.06);
gain2.gain.setValueAtTime(0.0001, now + 0.06);
gain2.gain.exponentialRampToValueAtTime(0.16, now + 0.09);
gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
osc2.connect(gain2);
gain2.connect(master);
osc2.start(now + 0.06);
osc2.stop(now + 0.25);
} catch(e){
console.warn("Advance audio unavailable", e);
}
}
function fireAdvanceButton(btn){
if(!btn) return;
playAdvanceSound();
btn.classList.remove('button-fire');
void btn.offsetWidth;
btn.classList.add('button-fire');
setTimeout(() => btn.classList.remove('button-fire'), 700);
}
function setAdvanceButtonVisualState(btn, state = "idle"){
if(!btn) return;
btn.classList.remove('is-pending','is-success','is-error');
if(state && state !== 'idle') btn.classList.add(`is-${state}`);
btn.disabled = state === 'pending';
btn.setAttribute('aria-busy', String(state === 'pending'));
}
function setAdvanceButtonsForCompany(companyId, state = "idle"){
const id = String(companyId || '').trim();
if(!id) return;
document.querySelectorAll(`[data-complete-touch="${id}"]`).forEach(btn => setAdvanceButtonVisualState(btn, state));
const detailBtn = document.getElementById('detailCompleteBtn');
if(detailBtn && String(detailBtn.dataset.completeTouch || '').trim() === id){
setAdvanceButtonVisualState(detailBtn, state);
}
}
function wait(ms){
return new Promise(resolve => setTimeout(resolve, ms));
}
function getCompletionResolvedNextDueAt(data = {}){
const raw = data?.nextTouchDueAt ?? data?.next_touch_due_at ?? data?.company?.prospecting?.next_touch_due_at ?? null;
return raw ? String(raw) : "";
}
function syncCompletedTouchDueDate(companyId, data = {}){
const id = String(companyId || "").trim();
if(!id) return "";
const resolvedNextDueAt = getCompletionResolvedNextDueAt(data);
const nextTouchIndex = Number(data?.nextTouchIndex || data?.next_touch_index || 0) || undefined;
const completedAt = String(data?.completedAt || "").trim();
const update = {};
if(nextTouchIndex) update.next_touch_index = nextTouchIndex;
if(Object.prototype.hasOwnProperty.call(data || {}, 'nextTouchDueAt') || Object.prototype.hasOwnProperty.call(data || {}, 'next_touch_due_at')){
update.next_touch_due_at = resolvedNextDueAt || null;
}
if(completedAt) update.last_completed_at = completedAt;
if(Object.keys(update).length){
applyCompanyProspectingUpdate(id, update);
}
const company = getCompanyById(id);
if(company){
company.properties = company.properties || {};
company.properties.prospecting_due_date = resolvedNextDueAt ? resolvedNextDueAt.slice(0, 10) : "";
}
const local = getCompanyState(id);
local.nextDuePrompt = Boolean(data?.needsNextDueDate);
saveLocalState();
return resolvedNextDueAt;
}
function getCompletionToastMessage(data = {}){
const resolvedNextDueAt = getCompletionResolvedNextDueAt(data);
if(resolvedNextDueAt){
return `Step completed. Follow up set for ${formatDisplayDate(resolvedNextDueAt)}.`;
}
if(data?.nextTouchScheduled === false){
return "Step completed. Cadence complete.";
}
return "Step Completed";
}
async function runAdvanceCompletion(companyId, zeroIndex, triggerBtn){
const id = String(companyId || "").trim();
const index = Number(zeroIndex);
if(!id || index < 0) return;
const btn = triggerBtn || null;
const completionAnimationMs = 760;

if(typeof setAdvanceButtonsForCompany === "function"){
  setAdvanceButtonsForCompany(id, 'pending');
}
if(ui.sidebarStatus){
  ui.sidebarStatus.textContent = 'Completing touch.';
}

let payload = {};
let completionData = {};
try{
  payload = typeof buildTouchCompletionPayload === "function"
    ? buildTouchCompletionPayload(id, index)
    : {};
  completionData = await completeTouchOnBackend(id, index + 1, payload);
} catch(error){
  console.error('Advance completion failed:', error);

  try{
    if(typeof loadCompaniesForOwner === "function" && state.selectedOwnerId){
      await loadCompaniesForOwner(state.selectedOwnerId);
    } else {
      if(typeof renderProspectList === "function") renderProspectList();
      CQBus.emit('render:board');
      CQBus.emit('render:detail');
    }
  } catch(refreshErr){
    console.warn('Refresh after completion error failed', refreshErr);
  }

  if(typeof setAdvanceButtonsForCompany === "function"){
    setAdvanceButtonsForCompany(id, 'error');
  }
  if(ui.sidebarStatus){
    ui.sidebarStatus.textContent = String(error?.message || 'Could not complete touch');
  }
  if(typeof showAdvanceToast === "function"){
    showAdvanceToast(String(error?.message || 'Could not complete touch'), { tone: 'error' });
  }
  await wait(1400);
  if(typeof setAdvanceButtonsForCompany === "function"){
    setAdvanceButtonsForCompany(id, 'idle');
  }
  return;
}

const resolvedNextDueAt = syncCompletedTouchDueDate(id, completionData || {});
const shouldPromptForDueDate = Boolean(completionData?.needsNextDueDate);
const completionToastMessage = getCompletionToastMessage(completionData || {});

if(typeof setAdvanceButtonsForCompany === "function"){
  setAdvanceButtonsForCompany(id, 'success');
}
if(typeof fireAdvanceButton === "function"){
  fireAdvanceButton(btn);
}
if(btn){
  btn.classList.remove('is-burst');
  void btn.offsetWidth;
  btn.classList.add('is-burst');
  setTimeout(() => btn.classList.remove('is-burst'), 650);
}
if(typeof showAdvanceToast === "function"){
  showAdvanceToast(completionToastMessage, { tone: 'success' });
}
if(ui.sidebarStatus){
  ui.sidebarStatus.textContent = resolvedNextDueAt
    ? `Follow up set for ${formatDisplayDate(resolvedNextDueAt)}`
    : 'Touch completed';
}

await wait(completionAnimationMs);

const postCompletionTasks = [
  typeof refreshSelectedOwnerCompletedStats === "function" ? refreshSelectedOwnerCompletedStats() : Promise.resolve(),
  Promise.resolve().then(() => typeof renderLeaderboard === "function" ? renderLeaderboard() : null),
  Promise.resolve().then(() => typeof updateProgress === "function" ? updateProgress() : null),
  Promise.resolve().then(() => typeof handleTouchCompletionEffects === "function" ? handleTouchCompletionEffects(id, index) : null),
  Promise.resolve().then(() => typeof renderProspectList === "function" ? renderProspectList() : null),
  Promise.resolve().then(() => CQBus.emit('render:board')),
  Promise.resolve().then(() => CQBus.emit('render:detail'))
];

const postResults = await Promise.allSettled(postCompletionTasks);
const refreshFailed = postResults.some(result => result.status === 'rejected');
if(refreshFailed){
  console.warn('Advance follow-up refresh had a non-blocking issue', postResults);
  if(ui.sidebarStatus){
    ui.sidebarStatus.textContent = 'Touch completed. Refresh view if needed.';
  }
}

if(typeof renderProspectList === "function") renderProspectList();
CQBus.emit('render:board');
CQBus.emit('render:detail');

if(shouldPromptForDueDate && typeof showNextDuePrompt === "function"){
  await wait(300);
  showNextDuePrompt(id);
}
}
let advanceToastTimer = null;
let advanceToastShowTimer = null;

function showAdvanceToast(message = "Step Completed", options = {}){
if(!ui.advanceToast) return;
const tone = String(options.tone || options.type || 'success').trim().toLowerCase();
ui.advanceToast.textContent = message;
ui.advanceToast.classList.remove('show', 'is-error', 'is-success');
ui.advanceToast.classList.add(tone === 'error' ? 'is-error' : 'is-success');
if(advanceToastTimer){
clearTimeout(advanceToastTimer);
advanceToastTimer = null;
}
if(advanceToastShowTimer){
clearTimeout(advanceToastShowTimer);
advanceToastShowTimer = null;
}
advanceToastShowTimer = setTimeout(() => {
if(!ui.advanceToast) return;
void ui.advanceToast.offsetWidth;
ui.advanceToast.classList.add('show');
advanceToastTimer = setTimeout(() => {
if(ui.advanceToast) ui.advanceToast.classList.remove('show');
advanceToastTimer = null;
}, 4320);
advanceToastShowTimer = null;
}, 140);
}
function loadLocalState(){
return {
ui: {},
priorityFilter: "all",
motivationHistory: {},
ownerEmailTemplates: {},
ownerEmailTouchSelections: {},
dismissedEmailOpensByOwner: {}
};
}
function saveLocalState(){ }
function ensureLocalCollections(){
if(!state.local.ui || typeof state.local.ui !== "object") state.local.ui = {};
if(!state.local.motivationHistory) state.local.motivationHistory = {};
if(!state.local.ownerEmailTemplates) state.local.ownerEmailTemplates = {};
if(!state.local.ownerEmailTouchSelections) state.local.ownerEmailTouchSelections = {};
if(!state.local.dismissedEmailOpensByOwner || typeof state.local.dismissedEmailOpensByOwner !== "object") state.local.dismissedEmailOpensByOwner = {};
}
function getCurrentMonthKey(){
const now = new Date();
return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}
function createEmptyStatsTotals(){
return {
calls:0,
emails:0,
social:0,
letters:0,
meetings:0,
stopIns:0,
other:0,
totalActivities:0,
points:0,
priorityBreakdown: { hot:0, warm:0, cold:0 }
};
}
function createEmptyActivityReportData(){
return {
ok: true,
scope: 'mine',
ownerId: '',
ownerName: '',
ownerKey: '',
month: getCurrentMonthKey(),
touches: 0,
companiesWorked: 0,
avgTouch: 0,
points: 0,
touchesByType: { call:0, email:0, social:0, mailer:0, meeting:0, stopIn:0, other:0 },
statusBreakdown: { research:0, activeOutreach:0, engaged:0, nurture:0, notInterested:0 },
priorityBreakdown: { hot:0, warm:0, cold:0 },
bigWins: { total:0, engaged:0, nurture:0 },
weekTouches: [0,0,0,0,0],
recentActivities: [],
statsDebug: null
};
}
function getSelectedOwnerRemoteStats(){
const key = String(state.selectedOwnerId || "");
return state.remote.statsByOwner[key] || createEmptyStatsTotals();
}
function getActivityReportMonthKey(monthOffset = 0){
const now = new Date();
const date = new Date(now.getFullYear(), now.getMonth() - Number(monthOffset || 0), 1);
return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}
function getActivityReportCacheKey(scope, ownerId, monthKey){
return [String(scope || 'mine'), String(ownerId || ''), String(monthKey || getCurrentMonthKey())].join('|');
}

async function fetchActivityReportData(options = {}){
if(window.ReportingDoor?.fetchActivityReportData && window.ReportingDoor.fetchActivityReportData !== fetchActivityReportData){
return window.ReportingDoor.fetchActivityReportData(options);
}
throw new Error('Reporting data layer is not ready');
}
function getCachedActivityReportData(){
if(window.ReportingDoor?.getCachedActivityReportData && window.ReportingDoor.getCachedActivityReportData !== getCachedActivityReportData){
return window.ReportingDoor.getCachedActivityReportData();
}
return null;
}

function getOwnerUserStatePayload(ownerId){
const key = String(ownerId || "default");
if(!state.remote.userStateByOwner[key]){
state.remote.userStateByOwner[key] = {
ownerEmailTemplates: {},
ownerEmailTouchSelections: {},
motivationHistory: []
};
}
return state.remote.userStateByOwner[key];
}
function applyOwnerUserStateToLocal(ownerId, remoteState = {}){
const key = String(ownerId || "default");
state.remote.userStateByOwner[key] = {
ownerEmailTemplates: { ...(remoteState.ownerEmailTemplates || {}) },
ownerEmailTouchSelections: { ...(remoteState.ownerEmailTouchSelections || {}) },
motivationHistory: Array.isArray(remoteState.motivationHistory) ? [...remoteState.motivationHistory] : []
};
}
async function fetchOwnerStats(ownerId, options = {}){
if(!ownerId) return createEmptyStatsTotals();
const monthKey = options.monthKey || getCurrentMonthKey();
const ownerMeta = state.owners.find(o => String(o.id) === String(ownerId));
const params = new URLSearchParams({ ownerId: String(ownerId), month: monthKey });
if(ownerMeta?.name || ownerMeta?.email){
params.set('ownerName', String(ownerMeta.name || ownerMeta.email || ''));
}
const res = await fetch(`${API}/api/app/stats?${params.toString()}`, {
cache: "no-store",
credentials: "include"
});
const data = await res.json();
if(!data.ok) throw new Error(data.message || "Failed to load stats");
const existingStats = state.remote.statsByOwner[String(ownerId)] || createEmptyStatsTotals();
state.remote.statsByOwner[String(ownerId)] = {
...existingStats,
...(data.totals || createEmptyStatsTotals()),
priorityBreakdown: {
hot: Number(data?.totals?.priorityBreakdown?.hot) || 0,
warm: Number(data?.totals?.priorityBreakdown?.warm) || 0,
cold: Number(data?.totals?.priorityBreakdown?.cold) || 0
}
};
state.remote.statsMetaByOwner[String(ownerId)] = data.statsDebug || {
ownerId: String(ownerId),
ownerName: String(ownerMeta?.name || ownerMeta?.email || ''),
month: monthKey,
refreshedAt: new Date().toISOString(),
totalActivities: Number(data?.totals?.totalActivities) || 0,
points: Number(data?.totals?.points) || 0,
widget: 'topbar'
};
if(String(ownerId) === String(state.selectedOwnerId)){
state.remote.statsDebug = { ...state.remote.statsMetaByOwner[String(ownerId)], widget: 'topbar' };
renderStatsDebugLine();
console.info('[CadenceQ] owner-stats refresh', state.remote.statsDebug);
}
return state.remote.statsByOwner[String(ownerId)];
}
function renderStatsDebugLine(){
if(!ui.statsDebugLine) return;
const debug = state.remote.statsDebug;
if(!debug || !state.selectedOwnerId){
ui.statsDebugLine.textContent = '';
ui.statsDebugLine.title = '';
return;
}
const refreshed = debug.refreshedAt ? new Date(debug.refreshedAt) : null;
const timeLabel = refreshed && !Number.isNaN(refreshed.getTime())
? refreshed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
: '';
const ownerLabel = debug.ownerId || debug.ownerName || 'none';
ui.statsDebugLine.textContent = `stats ${ownerLabel} • ${debug.month || getCurrentMonthKey()} • ${timeLabel} • ${Number(debug.totalActivities) || 0} acts • ${Number(debug.points) || 0} pts`;
ui.statsDebugLine.title = `Stats source owner: ${ownerLabel} | Month: ${debug.month || getCurrentMonthKey()} | Refreshed: ${debug.refreshedAt || ''} | Activities: ${Number(debug.totalActivities) || 0} | Points: ${Number(debug.points) || 0}`;
}
async function refreshSelectedOwnerCompletedStats(options = {}){
const ownerMeta = options.ownerMeta || getSelectedOwnerMeta();
if(!ownerMeta.ownerId) return createEmptyStatsTotals();
const stats = await fetchOwnerStats(ownerMeta.ownerId, { monthKey: options.monthKey || getCurrentMonthKey() });
updateProgress();
renderWeeklyStats();
if(options.refreshReport !== false && ui.activityReportModal?.classList.contains('open')){
await renderActivityReport();
}
return stats;
}
async function fetchOwnerUserState(ownerId){
if(!ownerId) return {};
const params = new URLSearchParams({ ownerId: String(ownerId) });
const res = await fetch(`${API}/api/app/user-state?${params.toString()}`, { cache: "no-store" });
const data = await res.json();
if(!data.ok) throw new Error(data.message || "Failed to load owner settings");
applyOwnerUserStateToLocal(ownerId, data.state || {});
return data.state || {};
}
let ownerStateSaveTimer = null;
function queueOwnerUserStateSave(ownerId){
if(!ownerId) return;
clearTimeout(ownerStateSaveTimer);
ownerStateSaveTimer = setTimeout(async () => {
try{
const key = String(ownerId);
const currentState = getOwnerUserStatePayload(key);
const payload = {
ownerEmailTemplates: { ...(currentState.ownerEmailTemplates || {}) },
ownerEmailTouchSelections: { ...(currentState.ownerEmailTouchSelections || {}) },
motivationHistory: Array.isArray(currentState.motivationHistory) ? [...currentState.motivationHistory] : []
};
state.remote.userStateByOwner[key] = payload;
await fetch(`${API}/api/app/user-state`, {
method: "POST",
headers: {"Content-Type":"application/json"},
body: JSON.stringify({ ownerId: key, state: payload })
});
} catch(error){
console.error("Owner state save failed:", error);
ui.sidebarStatus.textContent = "Owner settings failed to sync";
}
}, 350);
}
async function syncSelectedOwnerRemoteData(){
if(!state.selectedOwnerId) return;
const ownerId = String(state.selectedOwnerId);
await Promise.allSettled([
fetchOwnerStats(ownerId),
fetchOwnerUserState(ownerId)
]);
CQBus.emit('notifications:sync');
CQBus.emit('workspace:init');
}
function getDefaultPriority(local){
if(local?.priority && ["hot","warm","cold"].includes(local.priority)) return local.priority;
const normalizedStatus = normalizeStatusValue(local?.status);
if(normalizedStatus === "engaged") return "hot";
if(normalizedStatus === "activeOutreach") return "warm";
return "cold";
}
function getDefaultCompanyState(companyId){
return {
companyId: String(companyId || ""),
status:"research",
priority:"cold",
notes:"",
contactFirst:"",
contactLast:"",
email:"",
phone:"",
linkedin:"",
websiteDomain:"",
companyAddress:"",
touchOverrides:{},
touchTemplateSelections:{},
nextDuePrompt:false,
statusUpdatedAt:"",
exitState:"",
exitLabel:"",
exitAt:"",
vertical:"",
isDeleted:false
};
}
function getCompanyState(companyId){
const key = String(companyId || "");
if(!state.remote.companyStateById[key]){
state.remote.companyStateById[key] = getDefaultCompanyState(key);
}
const remote = state.remote.companyStateById[key];
if(!remote.touchOverrides || typeof remote.touchOverrides !== "object") remote.touchOverrides = {};
if(!remote.touchTemplateSelections || typeof remote.touchTemplateSelections !== "object") remote.touchTemplateSelections = {};
if(typeof remote.nextDuePrompt !== "boolean") remote.nextDuePrompt = false;
remote.vertical = ["CPA","Dental","Legal"].includes(String(remote.vertical || "").trim()) ? String(remote.vertical).trim() : "";
remote.isDeleted = Boolean(remote.isDeleted);
remote.status = normalizeStatusValue(remote.status);
if(!remote.priority) remote.priority = getDefaultPriority(remote);
return remote;
}
function setCompanyState(companyId, updates = {}){
const key = String(companyId || "");
const current = getCompanyState(key);
state.remote.companyStateById[key] = {
...current,
...(updates || {}),
companyId: key
};
if(!state.remote.companyStateById[key].touchOverrides || typeof state.remote.companyStateById[key].touchOverrides !== "object"){
state.remote.companyStateById[key].touchOverrides = {};
}
return state.remote.companyStateById[key];
}
async function fetchCompanyStates(companyIds = []){
const ids = Array.from(new Set((companyIds || []).map(id => String(id || "").trim()).filter(Boolean)));
if(!ids.length) return {};
const res = await nativeFetch(`${API}/api/app/company-state/batch`, {
method:"POST",
credentials:'include',
headers:{"Content-Type":"application/json"},
body: JSON.stringify({ companyIds: ids })
});
const data = await res.json();
if(!data.ok) throw new Error(data.message || "Failed to load company state");
Object.entries(data.states || {}).forEach(([companyId, companyState]) => {
state.remote.companyStateById[String(companyId)] = {
...getDefaultCompanyState(companyId),
...(companyState || {}),
companyId: String(companyId)
};
});
return data.states || {};
}
let companyStateSaveTimers = {};
function queueCompanyStateSave(companyId, options = {}){
const key = String(companyId || "");
if(!key) return;
const delay = typeof options.delay === "number" ? options.delay : 350;
clearTimeout(companyStateSaveTimers[key]);
companyStateSaveTimers[key] = setTimeout(async () => {
try{
const owner = state.owners.find(item => String(item.id) === String(state.selectedOwnerId));
const companyState = getCompanyState(key);
const res = await nativeFetch(`${API}/api/app/company/${key}/state`, {
method:"POST",
credentials:'include',
headers:{"Content-Type":"application/json"},
body: JSON.stringify({
ownerId: String(state.selectedOwnerId || ""),
ownerName: owner?.name || owner?.email || "",
state: companyState
})
});
const data = await res.json();
if(data.ok && data.state){
state.remote.companyStateById[key] = {
...getDefaultCompanyState(key),
...(data.state || {}),
companyId: key
};
if(data.hubspotContactSync && data.hubspotContactSync.ok === false){
ui.sidebarStatus.textContent = "Saved locally, but HubSpot contact sync needs attention";
}
} else {
throw new Error(data.message || "Failed to save company state");
}
} catch(error){
console.error("Company state save failed:", error);
ui.sidebarStatus.textContent = "Company details failed to sync";
}
}, delay);
}
async function savePriorityOnBackend(companyId, priority){
const key = String(companyId || "").trim();
const nextPriority = String(priority || "").trim().toLowerCase();
if(!key) throw new Error('Company id is required');
if(!['hot','warm','cold'].includes(nextPriority)) throw new Error('Invalid priority');
const ownerMeta = getSelectedOwnerMeta ? getSelectedOwnerMeta() : null;
const res = await nativeFetch(`${API}/api/app/company/${key}/priority`, {
method:'POST',
credentials:'include',
headers:{'Content-Type':'application/json'},
body: JSON.stringify({
ownerId: String(ownerMeta?.ownerId || state.selectedOwnerId || ''),
ownerName: ownerMeta?.ownerName || ownerMeta?.ownerLabel || '',
priority: nextPriority
})
});
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!res.ok || !data?.ok){
throw new Error(data?.message || 'Failed to save priority');
}
state.remote.companyStateById[key] = {
...getDefaultCompanyState(key),
...(data.state || {}),
companyId: key
};
return state.remote.companyStateById[key];
}
function getCompanyById(companyId){
return state.companies.find(c => String(c.id) === String(companyId)) || null;
}
function getProspectingState(companyId){
const company = getCompanyById(companyId);
return company?.prospecting || {
company_id: String(companyId),
last_completed_touch_index: 0,
last_completed_at: null,
next_touch_index: 1,
next_touch_due_at: null,
touch_history: []
};
}
function getTouchHistoryMap(companyId){
const prospecting = getProspectingState(companyId);
const map = new Map();
const history = Array.isArray(prospecting.touch_history) ? prospecting.touch_history : [];
history.forEach(item => {
const index = Number(item?.index);
if(index) map.set(index, item?.completedAt || "");
});
return map;
}
function isTouchChecked(companyId, zeroIndex){
const map = getTouchHistoryMap(companyId);
return map.has(zeroIndex + 1);
}
function getTouchTimestamp(companyId, zeroIndex){
const map = getTouchHistoryMap(companyId);
return map.get(zeroIndex + 1) || "";
}
function buildExtendedTouch(touchNumber){
const number = Number(touchNumber || 1) || 1;
return {
 touch: number,
 week: null,
 title: `Touch ${number} — Extended Touch`,
 meta: "Custom outreach beyond the core cadence.",
 tag: { label: "Extended", color: "green" },
 details: "Use this for continued outreach after the structured cadence is complete. Choose the task type you want, complete it, and set the next follow up date.",
 points: 1,
 isExtended: true
};
}
function getBaseTouchTemplate(companyId){
const assignedTemplate = getAssignedCadenceTemplate(companyId);
const assignedSteps = Array.isArray(assignedTemplate?.steps) ? assignedTemplate.steps : [];
return assignedSteps.length ? buildTouchTemplateRuntimeFromCadenceSteps(assignedSteps) : [...TOUCH_TEMPLATE];
}
function getResolvedNextTouchIndex(companyId){
const prospecting = getProspectingState(companyId);
const history = Array.isArray(prospecting?.touch_history) ? prospecting.touch_history : [];
const completed = new Set(history.map(item => Number(item?.index || 0)).filter(Boolean));
const templateLength = getBaseTouchTemplate(companyId).filter(touch => !touch?.isExtended).length || TOUCH_TEMPLATE.length;
for(let i = 1; i <= templateLength; i += 1){
 if(!completed.has(i)) return i;
}
const maxCompleted = history.reduce((max, item) => Math.max(max, Number(item?.index || 0)), 0);
const stored = Number(prospecting?.next_touch_index || 0);
const resolved = Math.max(maxCompleted + 1, stored || 0, templateLength + 1);
return resolved || 1;
}
function getCurrentNextTouchZeroIndex(companyId){
const nextTouchIndex = getResolvedNextTouchIndex(companyId);
const company = getCompanyById(companyId);
if(company && company.prospecting){
 company.prospecting.next_touch_index = nextTouchIndex;
}
if(!nextTouchIndex) return -1;
return nextTouchIndex - 1;
}
function getCurrentTouchIndex(companyId){
return getCurrentNextTouchZeroIndex(companyId);
}
function getCurrentNextTouch(companyId){
const zeroIndex = getCurrentNextTouchZeroIndex(companyId);
if(zeroIndex < 0) return null;
return getEffectiveTouch(companyId, zeroIndex) || getTouchTemplate(companyId)[zeroIndex] || null;
}
function getRawDueDate(companyId){
const company = getCompanyById(companyId);
return (
String(getProspectingState(companyId)?.next_touch_due_at || "").slice(0, 10) ||
String(company?.properties?.prospecting_due_date || "").slice(0, 10) ||
""
);
}
function getBackendDueDateIso(companyId){
const raw = getRawDueDate(companyId);
const d = parseLocalDate(raw);
if (!d) return "";
const y = d.getFullYear();
const m = String(d.getMonth() + 1).padStart(2, "0");
const day = String(d.getDate()).padStart(2, "0");
return `${y}-${m}-${day}`;
}
function applyCompanyProspectingUpdate(companyId, update = {}){
const company = getCompanyById(companyId);
if(!company) return;
company.prospecting = {
...(company.prospecting || {}),
...(update || {})
};
}
function applyCompletedTouchOptimistically(companyId, touchIndex, payload = {}, completedAtIso = ""){
const id = String(companyId || "").trim();
const safeTouchIndex = Number(touchIndex);
if(!id || !Number.isFinite(safeTouchIndex) || safeTouchIndex < 1) return;
const company = getCompanyById(id);
if(!company) return;
const prospecting = getProspectingState(id);
const completedAt = String(completedAtIso || new Date().toISOString());
const existingHistory = Array.isArray(prospecting.touch_history) ? prospecting.touch_history.slice() : [];
const historyByIndex = new Map();
existingHistory.forEach(item => {
  const idx = Number(item?.index || 0);
  if(idx > 0) historyByIndex.set(idx, { ...(item || {}), index: idx });
});
const previousEntry = historyByIndex.get(safeTouchIndex) || {};
const nextEntry = {
  ...previousEntry,
  index: safeTouchIndex,
  completedAt: previousEntry.completedAt || completedAt,
  taskType: payload.taskType || previousEntry.taskType || "",
  statCategory: payload.statCategory || previousEntry.statCategory || "",
  title: payload.touchTitle || previousEntry.title || "",
  templateKey: payload.templateKey || previousEntry.templateKey || "",
  templateLabel: payload.templateLabel || previousEntry.templateLabel || "",
  ownerId: payload.ownerId || previousEntry.ownerId || null,
  ownerName: payload.ownerName || previousEntry.ownerName || null
};
historyByIndex.set(safeTouchIndex, nextEntry);
const nextHistory = Array.from(historyByIndex.values()).sort((a, b) => Number(a.index || 0) - Number(b.index || 0));
const maxCompleted = nextHistory.reduce((max, item) => Math.max(max, Number(item?.index || 0)), 0);
applyCompanyProspectingUpdate(id, {
  touch_history: nextHistory,
  last_completed_touch_index: Math.max(Number(prospecting?.last_completed_touch_index || 0), safeTouchIndex),
  last_completed_at: completedAt,
  next_touch_index: Math.max(maxCompleted + 1, safeTouchIndex + 1)
});
if(company.properties){
  company.properties.last_completed_touch_index = String(Math.max(Number(company.properties.last_completed_touch_index || 0), safeTouchIndex));
}
}
async function saveDueDateToBackend(companyId, dueDate){
const normalizedDueDate = (dueDate == null || String(dueDate).trim() === "") ? null : String(dueDate).trim();
const res = await fetch(`${API}/api/app/company/${companyId}/next-due-date`, {
method: "POST",
headers: {"Content-Type":"application/json"},
body: JSON.stringify({ dueDate: normalizedDueDate })
});
const data = await res.json();
if(!data.ok) throw new Error(data.message || data.error || "Failed to set due date");
applyCompanyProspectingUpdate(companyId, {
next_touch_due_at: data.nextTouchDueAt || data.next_touch_due_at || normalizedDueDate || null
});
const local = getCompanyState(companyId);
local.nextDuePrompt = false;
queueCompanyStateSave(companyId);
const company = getCompanyById(companyId);
if(company){
company.properties = company.properties || {};
company.properties.prospecting_due_date = normalizedDueDate || "";
}
return data;
}
let notesSaveTimer = null;
async function saveNotesToBackend(companyId, notes){
const res = await fetch(`${API}/api/app/company/${companyId}/notes`, {
method: "POST",
headers: {"Content-Type":"application/json"},
body: JSON.stringify({ notes })
});
const data = await res.json();
if(!data.ok) throw new Error(data.message || "Failed to save notes");
const company = getCompanyById(companyId);
const local = getCompanyState(companyId);
local.notes = notes || "";
queueCompanyStateSave(companyId);
if(company){
company.properties = company.properties || {};
company.properties.prospecting_notes = notes || "";
}
return data;
}
function getVisibleQuickNotesCompanyId(){
const selectedCompanyId = String(state.selectedCompanyId || "").trim();
const pinnedCompanyId = String(state.pinnedCompanyId || "").trim();
const topFocusCompanyId = String(window.WorkspaceDoor?.getTopFocusCompanyId?.() || "").trim();
if(state.currentView === "detail"){
return selectedCompanyId || pinnedCompanyId || topFocusCompanyId || "";
}
if(state.currentView === "board"){
return topFocusCompanyId || selectedCompanyId || pinnedCompanyId || "";
}
return selectedCompanyId || pinnedCompanyId || topFocusCompanyId || "";
}
function setQuickNotesSavingState(statusText, buttonText, disabled){
if(ui.sidebarStatus && statusText) ui.sidebarStatus.textContent = statusText;
if(ui.saveQuickNotesBtn){
ui.saveQuickNotesBtn.textContent = buttonText || "Save Note";
ui.saveQuickNotesBtn.disabled = !!disabled;
}
}
function resetQuickNotesSavingState(){
if(ui.saveQuickNotesBtn){
ui.saveQuickNotesBtn.textContent = "Save Note";
ui.saveQuickNotesBtn.disabled = false;
}
}
function resolveQuickNotesCompany(){
let companyId = getVisibleQuickNotesCompanyId();
let company = companyId ? getCompanyById(companyId) : null;
if(!company && companyId){
company = getCompanyById(companyId);
}
if(!company && state.companies.length){
company = state.companies[0];
companyId = String(company?.id || "");
}
return company && companyId ? { companyId, company } : null;
}
function openQuickNotesModal(){
const resolved = resolveQuickNotesCompany();
if(!ui.quickNotesModal || !ui.quickNotesBox) return;
if(!resolved){
if(ui.sidebarStatus) ui.sidebarStatus.textContent = "Select a company first to add a note.";
return;
}
const { companyId, company } = resolved;
state.selectedCompanyId = companyId;
ui.quickNotesModal.dataset.companyId = companyId;
const local = getCompanyState(companyId);
const noteText = (local.notes ?? company?.properties?.prospecting_notes ?? "") || "";
const displayName = getCompanyDisplayName(company);
if(ui.quickNotesCompanyName) ui.quickNotesCompanyName.textContent = displayName ? `Notes for ${displayName}` : "Add a field note for this company.";
ui.quickNotesBox.value = noteText;
resetQuickNotesSavingState();
ui.quickNotesModal.classList.add("open");
ui.quickNotesModal.setAttribute("aria-hidden", "false");
requestAnimationFrame(() => {
ui.quickNotesBox.focus();
try{ ui.quickNotesBox.setSelectionRange(ui.quickNotesBox.value.length, ui.quickNotesBox.value.length); }catch(_){ }
});
}
function closeQuickNotesModal(){
if(!ui.quickNotesModal) return;
ui.quickNotesModal.classList.remove("open");
ui.quickNotesModal.setAttribute("aria-hidden", "true");
resetQuickNotesSavingState();
}
function saveQuickNotesModal(){
const companyId = String(ui.quickNotesModal?.dataset.companyId || getVisibleQuickNotesCompanyId() || state.selectedCompanyId || "").trim();
if(!companyId || !ui.quickNotesBox) return;
state.selectedCompanyId = companyId;
const nextNotes = String(ui.quickNotesBox.value || "");
if(!nextNotes.trim()){
ui.quickNotesBox.focus();
return;
}
if(ui.notesBox && String(ui.notesBox.dataset.companyId || state.selectedCompanyId || companyId) === companyId) ui.notesBox.value = nextNotes;
const local = getCompanyState(companyId);
local.notes = nextNotes;
queueCompanyStateSave(companyId);
const company = getCompanyById(companyId);
if(company){
company.properties = company.properties || {};
company.properties.prospecting_notes = nextNotes;
}
setQuickNotesSavingState("Saving notes...", "Saving...", true);
clearTimeout(notesSaveTimer);
notesSaveTimer = setTimeout(async () => {
try{
await saveNotesToBackend(companyId, nextNotes);
setQuickNotesSavingState("Notes saved", "Saved ✓", true);
if(String(state.selectedCompanyId || "") === companyId) CQBus.emit('render:detail');
if(typeof renderProspectList === "function") renderProspectList();
CQBus.emit('render:board');
setTimeout(() => {
if(String(ui.quickNotesModal?.dataset.companyId || "") === companyId){
closeQuickNotesModal();
} else {
resetQuickNotesSavingState();
}
}, 900);
}catch(err){
console.error(err);
setQuickNotesSavingState("Could not save notes", "Save Note", false);
}
}, 60);
}
function queueNotesSave(){
if(!state.selectedCompanyId) return;
clearTimeout(notesSaveTimer);
const companyId = state.selectedCompanyId;
const notes = ui.notesBox.value;
notesSaveTimer = setTimeout(async () => {
try{
ui.sidebarStatus.textContent = "Saving notes...";
await saveNotesToBackend(companyId, notes);
ui.sidebarStatus.textContent = "Notes saved";
} catch(error){
console.error(error);
ui.sidebarStatus.textContent = "Notes failed to save";
}
}, 700);
}
async function completeTouchOnBackend(companyId, touchIndex, payload = {}){
  const id = String(companyId || "").trim();
  const safeTouchIndex = Number(touchIndex);

  if(!id) throw new Error("Missing company ID");
  if(!Number.isFinite(safeTouchIndex) || safeTouchIndex < 1){
    throw new Error("Invalid touch index");
  }

  console.log("COMPLETE TOUCH PAYLOAD", {
    companyId: id,
    touchIndex: safeTouchIndex,
    payload
  });

  const requestPayload = {
    ...(payload || {}),
    touchIndex: safeTouchIndex
  };

  const res = await fetch(`${API}/api/app/company/${encodeURIComponent(id)}/complete-touch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(requestPayload)
  });

  const rawText = await res.text();
  console.log("COMPLETE TOUCH RAW RESPONSE", rawText);

  let data = {};
  try{
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Server returned non-JSON response: ${rawText}`);
  }

  if(data?.company && typeof normalizeCompanyRecord === "function"){
    const nextCompany = normalizeCompanyRecord(data.company);
    const idx = state.companies.findIndex(item => String(item.id) === id);
    if(idx >= 0) state.companies[idx] = nextCompany;
    else state.companies.push(nextCompany);
    if(typeof hydrateCompanies === "function") hydrateCompanies();
  }

  if(data?.localState){
    try{
      state.remote.companyStateById[id] = {
        ...getDefaultCompanyState(id),
        ...(data.localState || {}),
        companyId: id
      };
      const company = state.companies.find(item => String(item.id) === id);
      if(company){
        company.properties = company.properties || {};
        if(data.localState.status){
          company.properties.prospecting_status = normalizeStatusValue(data.localState.status);
        }
      }
    } catch(err){
      console.warn("Could not merge returned localState after complete touch", err);
    }
  }

  if(!res.ok || data?.ok === false){
    const message = [
      data?.message,
      data?.error,
      data?.details && data?.details !== data?.message ? data.details : "",
      (!data?.message && !data?.error && !data?.details) ? `Failed to complete touch (${res.status})` : ""
    ].filter(Boolean).join(': ');
    throw new Error(message || `Failed to complete touch (${res.status})`);
  }

  try{
    syncCompletedTouchDueDate(id, data || {});
    applyCompletedTouchOptimistically(id, safeTouchIndex, payload, data?.completedAt || data?.localState?.last_completed_at || data?.company?.prospecting?.last_completed_at || "");
  } catch(err){
    console.warn("Optimistic touch completion merge failed", err);
  }

  return data;
}
async function logTouchActivityToBackend(companyId, touchIndex, payload = {}){
const completedAt = payload.completedAt || new Date().toISOString();
const dedupeKey = payload.dedupeKey || `${companyId}:${touchIndex}:${payload.taskType || "unknown"}:${String(completedAt).slice(0,16)}`;
const res = await fetch(`${API}/api/app/company/${companyId}/log-activity`, {
method: "POST",
headers: {"Content-Type":"application/json"},
body: JSON.stringify({ ...payload, touchIndex, completedAt, dedupeKey })
});
const data = await res.json();
if(!data.ok) throw new Error(data.message || "Failed to log activity");
return data;
}
async function syncHistoricalTouchNotesToHubSpot(payload = {}){
const res = await fetch(`${API}/api/app/hubspot/backfill-touch-notes`, {
method: "POST",
headers: {"Content-Type":"application/json"},
body: JSON.stringify(payload)
});
const data = await res.json();
if(!data.ok) throw new Error(data.message || "Failed to sync historical HubSpot notes");
return data;
}
async function updateCompletedTouchActivityOnBackend(companyId, touchIndex, payload = {}){
const res = await fetch(`${API}/api/app/activity/update`, {
method: "POST",
headers: {"Content-Type":"application/json"},
body: JSON.stringify({
companyId,
touchIndex,
oldTaskType: payload.oldTaskType,
newTaskType: payload.newTaskType,
completedAt: payload.completedAt,
ownerId: payload.ownerId || null,
ownerName: payload.ownerName || null,
touchTitle: payload.touchTitle || "",
templateKey: payload.templateKey || "",
templateLabel: payload.templateLabel || "",
notes: payload.notes || "",
nextDueDate: payload.nextDueDate || null
})
});
const data = await res.json();
if(!data.ok) throw new Error(data.message || "Failed to update completed activity");
return data;
}
async function saveTouchOverrideOnBackend(companyId, zeroIndex, taskType, payload = {}){
const ownerMeta = getSelectedOwnerMeta();
const res = await fetch(`${API}/api/app/company/${encodeURIComponent(companyId)}/touch-override`, {
method: "POST",
headers: {"Content-Type":"application/json"},
body: JSON.stringify({
zeroIndex,
touchIndex: Number(payload.touchIndex || (zeroIndex + 1)),
taskType: taskType || "",
resolvedTaskType: payload.resolvedTaskType || taskType || "",
oldTaskType: payload.oldTaskType || "",
completedAt: payload.completedAt || null,
ownerId: ownerMeta.ownerId || null,
ownerName: ownerMeta.ownerName || null,
activityOwnerId: payload.ownerId || null,
activityOwnerName: payload.ownerName || null,
touchTitle: payload.touchTitle || "",
templateKey: payload.templateKey || "",
templateLabel: payload.templateLabel || "",
notes: payload.notes || "",
nextDueDate: payload.nextDueDate || null
})
});
const raw = await res.text();
let data = {};
try{
data = raw ? JSON.parse(raw) : {};
} catch {
data = { ok:false, message: raw ? String(raw).slice(0,180) : "Invalid response from server" };
}
if(!res.ok || !data.ok) throw new Error(data.message || `Failed to update touch override (${res.status})`);
if(data.state){
state.remote.companyStateById[String(companyId)] = {
...getDefaultCompanyState(companyId),
...(data.state || {}),
companyId: String(companyId)
};
}
return data;
}
function getSelectedOwnerMeta(){
const ownerId = String(state.selectedOwnerId || "");
const owner = state.owners.find(item => String(item.id) === ownerId);
return {
ownerId,
ownerName: owner?.name || owner?.email || ""
};
}
function buildTouchCompletionPayload(companyId, zeroIndex){
const touch = getEffectiveTouch(companyId, zeroIndex) || getTouchTemplate(companyId)[zeroIndex];
const ownerMeta = getSelectedOwnerMeta();
const template = getTouchTemplateDescriptor(companyId, zeroIndex);
return {
touchTitle: touch?.title || `Touch ${zeroIndex + 1}`,
taskType: getTouchOverrideType(companyId, zeroIndex) || getDefaultTaskTypeFromTouch(touch) || "detail",
statCategory: getTouchCategory(touch) || "other",
templateKey: template.templateKey || "",
templateLabel: template.templateLabel || "",
notes: String(ui.notesBox?.value || getCompanyState(companyId).notes || "").trim(),
ownerId: ownerMeta.ownerId || null,
ownerName: ownerMeta.ownerName || null
};
}
function isAdminUser(){
return String(state.authUser?.role || "") === "admin";
}
function isTcUser(){
return String(state.authUser?.role || "") === "tc";
}
function renderAdminControls(){
if(ui.topAddUserOption){
ui.topAddUserOption.style.display = isAdminUser() ? "block" : "none";
}
if(authUi.topSecurityOption){
authUi.topSecurityOption.style.display = isAdminUser() ? "block" : "none";
}
if(ui.topActivityReportOption){
ui.topActivityReportOption.style.display = isAdminUser() ? "flex" : "none";
}
}
function populateAddUserOwnerOptions(){
if(!ui.newUserOwnerId) return;
const options = ['<option value="">Select HubSpot owner</option>'].concat(
state.owners.map(owner => `<option value="${escapeHtml(String(owner.id))}">${escapeHtml(owner.name || owner.email || owner.id)}${owner.email ? ` (${escapeHtml(owner.email)})` : ''}</option>`)
);
ui.newUserOwnerId.innerHTML = options.join('');
}
function autoMatchAddUserOwner(){
if(!ui.newUserEmail || !ui.newUserOwnerId) return;
const email = String(ui.newUserEmail.value || '').trim().toLowerCase();
const match = state.owners.find(owner => String(owner.email || '').trim().toLowerCase() === email);
if(match) ui.newUserOwnerId.value = String(match.id);
}
async function fetchManageUsers(){
const res = await nativeFetch(`${API}/auth/admin/users`, {
credentials: "include"
});
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!res.ok || !data.ok) throw new Error(data.message || 'Failed to load users');
return Array.isArray(data.users) ? data.users : [];
}
function getOwnerDisplayNameById(ownerId){
const normalized = String(ownerId || '').trim();
if(!normalized) return 'No owner mapped';
const owner = state.owners.find(item => String(item.id || '') === normalized);
return owner?.name || owner?.email || normalized;
}
function syncBackendSelectableUsersFromManageUsers(){
const users = Array.isArray(state.manageUsers) ? state.manageUsers : [];
state.backendSelectableUsers = users.filter(user => {
return user && user.isActive !== false && String(user.hubspotOwnerId || "").trim();
});
}
function getBackendFilteredOwners(){
const allowedOwnerIds = new Set(
(Array.isArray(state.backendSelectableUsers) ? state.backendSelectableUsers : [])
.map(user => String(user.hubspotOwnerId || "").trim())
.filter(Boolean)
);
const owners = Array.isArray(state.owners) ? state.owners : [];
return owners.filter(owner => allowedOwnerIds.has(String(owner.id || "").trim()));
}
function getSelectableOwners(){
const filteredOwners = getBackendFilteredOwners();
return filteredOwners.length ? filteredOwners : (Array.isArray(state.owners) ? state.owners : []);
}

function getManageUserAssignedCadenceTemplateIds(user){
const candidates = [
  user && user.assignedCadenceTemplateIds,
  user && user.defaultAssignedCadenceTemplateIds,
  user && user.cadenceTemplateIds,
  user && user.cadenceAccessTemplateIds,
  user && user.defaultCadenceTemplateIds
];
for(const value of candidates){
  if(Array.isArray(value)){
    return Array.from(new Set(value.map(item => String(item || '').trim()).filter(Boolean)));
  }
}
return [];
}
async function loadManageCadenceTemplates(force = false){
if(!isAdminUser()) return [];
if(!force && Array.isArray(state.manageCadenceTemplates) && state.manageCadenceTemplates.length){
  return state.manageCadenceTemplates;
}
const res = await nativeFetch(`${API}/api/app/cadence/templates`, {
  credentials: "include"
});
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!res.ok || !data.ok) throw new Error(data.message || 'Failed to load cadence templates');
const templates = Array.isArray(data.templates) ? data.templates.slice() : [];
templates.sort((a, b) => {
  const aLocked = !!(a.lockedByAdmin || a.isLocked || a.locked);
  const bLocked = !!(b.lockedByAdmin || b.isLocked || b.locked);
  if(aLocked !== bLocked) return aLocked ? -1 : 1;
  const aName = String(a.name || a.title || a.id || '').trim().toLowerCase();
  const bName = String(b.name || b.title || b.id || '').trim().toLowerCase();
  return aName.localeCompare(bName);
});
state.manageCadenceTemplates = templates;
return templates;
}

async function refreshManageCadenceTemplateOptions(force = true){
  try{
    await loadManageCadenceTemplates(force);
    if(typeof renderManageUsers === 'function') renderManageUsers();
    if(typeof renderManageUserCadenceModal === 'function') renderManageUserCadenceModal();
    return state.manageCadenceTemplates;
  } catch(error){
    console.warn('Failed to refresh manage cadence template options', error);
    return state.manageCadenceTemplates || [];
  }
}
window.refreshManageCadenceTemplateOptions = refreshManageCadenceTemplateOptions;
function getManageCadenceTemplateLabel(template){
return String(template?.name || template?.title || template?.id || 'Untitled cadence').trim() || 'Untitled cadence';
}
function getManageCadenceTemplateOwnerLabel(template){
if(template?.createdByName) return String(template.createdByName || '').trim();
if(template?.createdByEmail) return String(template.createdByEmail || '').trim();
if(template?.createdByUserName) return String(template.createdByUserName || '').trim();
if(template?.createdByUserId) return String(template.createdByUserId || '').trim();
return '';
}
function getManageUserCadenceDraftIds(user){
const userId = String(user?.id || '').trim();
if(!userId) return [];
const draft = state.manageUserCadenceDrafts && state.manageUserCadenceDrafts[userId];
if(Array.isArray(draft)) return Array.from(new Set(draft.map(item => String(item || '').trim()).filter(Boolean)));
return getManageUserAssignedCadenceTemplateIds(user);
}
function setManageUserCadenceDraft(userId, templateIds){
const normalizedUserId = String(userId || '').trim();
if(!normalizedUserId) return;
state.manageUserCadenceDrafts = state.manageUserCadenceDrafts || {};
state.manageUserCadenceDrafts[normalizedUserId] = Array.from(new Set((Array.isArray(templateIds) ? templateIds : []).map(item => String(item || '').trim()).filter(Boolean)));
}
function toggleManageUserCadenceDraft(userId, templateId, checked){
const normalizedUserId = String(userId || '').trim();
const normalizedTemplateId = String(templateId || '').trim();
if(!normalizedUserId || !normalizedTemplateId) return;
const next = new Set(getManageUserCadenceDraftIds({ id: normalizedUserId, assignedCadenceTemplateIds: [] }));
if(checked) next.add(normalizedTemplateId);
else next.delete(normalizedTemplateId);
setManageUserCadenceDraft(normalizedUserId, Array.from(next));
}
function hasManageUserCadenceDraftChanges(user){
const userId = String(user?.id || '').trim();
if(!userId) return false;
const assigned = getManageUserAssignedCadenceTemplateIds(user).slice().sort().join('|');
const draft = getManageUserCadenceDraftIds(user).slice().sort().join('|');
return assigned !== draft;
}
async function saveManagedUserCadenceAccess(userId){
const targetUser = state.manageUsers.find(user => String(user.id || '') === String(userId || ''));
const templateIds = getManageUserCadenceDraftIds(targetUser || { id: userId });
const res = await nativeFetch(`${API}/auth/admin/users/${encodeURIComponent(userId)}/cadence-access`, {
  method: 'PATCH',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ templateIds })
});
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!res.ok || !data.ok) throw new Error(data.message || 'Failed to update cadence access');
const nextIds = Array.isArray(data.user?.assignedCadenceTemplateIds)
  ? data.user.assignedCadenceTemplateIds
  : templateIds;
  state.manageUsers = state.manageUsers.map(user => String(user.id || '') === String(userId || '')
    ? { ...user, assignedCadenceTemplateIds: nextIds }
    : user
  );
  setManageUserCadenceDraft(userId, nextIds);
  renderManageUsers();
  return nextIds;
}


function ensureManageUserCadenceModal(){
let modal = document.getElementById('manageUserCadencePickerModal');
if(modal) return modal;
modal = document.createElement('div');
modal.id = 'manageUserCadencePickerModal';
modal.className = 'modalBackdrop manageUserCadencePickerModal';
modal.setAttribute('aria-hidden', 'true');
modal.innerHTML = `
  <div class="modalCard manageUserCadencePickerCard">
    <div class="modalHead manageUserCadencePickerHead">
      <div>
        <h2 class="modalTitle" id="manageUserCadencePickerTitle">Default cadence access</h2>
        <p class="modalSub" id="manageUserCadencePickerSub">Choose which locked and shared cadences are available to this user.</p>
      </div>
      <button class="modalCloseBtn" type="button" id="closeManageUserCadencePickerBtn" aria-label="Close">×</button>
    </div>
    <div class="manageUserCadencePickerToolbar">
      <label class="manageUserCadencePickerSearchWrap">
        <span class="srOnly">Search cadence templates</span>
        <input class="input manageUserCadencePickerSearch" id="manageUserCadencePickerSearch" type="text" placeholder="Search templates" />
      </label>
      <div class="manageUserCadencePickerCount" id="manageUserCadencePickerCount">0 selected</div>
    </div>
    <div class="manageUserCadencePickerOptions" id="manageUserCadencePickerOptions"></div>
    <div class="modalError" id="manageUserCadencePickerError"></div>
    <div class="modalActions manageUserCadencePickerActions">
      <button class="smallBtn" type="button" id="cancelManageUserCadencePickerBtn">Close</button>
      <button class="actionBtn primary" type="button" id="saveManageUserCadencePickerBtn">Save cadence access</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  function closeModal(){
    modal.classList.remove('open');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('manageUserCadencePickerOpen');
    state.manageUserCadenceModalUserId = '';
  }
  modal.addEventListener('click', function(event){ if(event.target === modal) closeModal(); });
  modal.querySelector('#closeManageUserCadencePickerBtn')?.addEventListener('click', closeModal);
  modal.querySelector('#cancelManageUserCadencePickerBtn')?.addEventListener('click', closeModal);
  modal.querySelector('#manageUserCadencePickerSearch')?.addEventListener('input', function(){ renderManageUserCadenceModal(); });
  modal.querySelector('#manageUserCadencePickerOptions')?.addEventListener('change', function(e){
    const checkbox = e.target?.closest?.('[data-user-cadence-template]');
    if(!checkbox) return;
    const userId = checkbox.getAttribute('data-user-cadence-template');
    toggleManageUserCadenceDraft(userId, checkbox.value, !!checkbox.checked);
    renderManageUsers();
    renderManageUserCadenceModal();
  });
  modal.querySelector('#saveManageUserCadencePickerBtn')?.addEventListener('click', async function(){
    const userId = String(state.manageUserCadenceModalUserId || '').trim();
    if(!userId) return;
    const errorEl = modal.querySelector('#manageUserCadencePickerError');
    try{
      if(errorEl) errorEl.textContent = '';
      this.disabled = true;
      this.textContent = 'Saving...';
      await saveManagedUserCadenceAccess(userId);
      if(ui.manageUsersSuccess) ui.manageUsersSuccess.textContent = 'Cadence access updated.';
      closeModal();
    } catch(error){
      if(errorEl) errorEl.textContent = error.message || 'Failed to update cadence access';
    } finally {
      this.disabled = false;
      this.textContent = 'Save cadence access';
      renderManageUsers();
      renderManageUserCadenceModal();
    }
  });
  return modal;
}

function renderManageUserCadenceModal(){
  const modal = ensureManageUserCadenceModal();
  const userId = String(state.manageUserCadenceModalUserId || '').trim();
  const user = (state.manageUsers || []).find(item => String(item.id || '') === userId);
  const optionsWrap = modal.querySelector('#manageUserCadencePickerOptions');
  const titleEl = modal.querySelector('#manageUserCadencePickerTitle');
  const subEl = modal.querySelector('#manageUserCadencePickerSub');
  const countEl = modal.querySelector('#manageUserCadencePickerCount');
  const searchValue = String(modal.querySelector('#manageUserCadencePickerSearch')?.value || '').trim().toLowerCase();
  const templates = Array.isArray(state.manageCadenceTemplates) ? state.manageCadenceTemplates.slice() : [];
  if(!user || !optionsWrap){
    if(optionsWrap) optionsWrap.innerHTML = '<div class="manageUsersEmpty">No user selected.</div>';
    return;
  }
  const draftIds = getManageUserCadenceDraftIds(user);
  const filtered = templates.filter(template => {
    if(!searchValue) return true;
    const hay = [template && template.name, template && template.description, getManageCadenceTemplateOwnerLabel(template)].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(searchValue);
  });
  if(titleEl) titleEl.textContent = 'Default cadence access';
  if(subEl) subEl.textContent = 'Select which cadence templates ' + String(user.fullName || user.email || 'this user') + ' can use by default.';
  if(countEl) countEl.textContent = draftIds.length + ' selected';
  optionsWrap.innerHTML = filtered.length ? filtered.map(template => {
    const templateId = String(template.id || '').trim();
    const checked = draftIds.includes(templateId);
    const locked = !!(template.lockedByAdmin || template.isLocked || template.locked);
    const ownerLabel = getManageCadenceTemplateOwnerLabel(template);
    return '' +
      '<label class="manageUserCadenceOption">' +
        '<input type="checkbox" data-user-cadence-template="' + userId + '" value="' + escapeHtml(templateId) + '"' + (checked ? ' checked' : '') + '>' +
        '<span class="manageUserCadenceOptionText">' +
          '<span class="manageUserCadenceOptionTitle">' + escapeHtml(getManageCadenceTemplateLabel(template)) + (locked ? '<span class="manageUserCadenceMiniLock">Locked</span>' : '') + '</span>' +
          (ownerLabel ? '<span class="manageUserCadenceOptionMeta">' + escapeHtml(ownerLabel) + '</span>' : '') +
        '</span>' +
      '</label>';
  }).join('') : '<div class="manageUsersEmpty">No cadence templates matched this search.</div>';
}

function openManageUserCadenceModal(userId){
  const modal = ensureManageUserCadenceModal();
  state.manageUserCadenceModalUserId = String(userId || '').trim();
  renderManageUserCadenceModal();
  modal.classList.add('open');
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('manageUserCadencePickerOpen');
  const searchInput = modal.querySelector('#manageUserCadencePickerSearch');
  if(searchInput){ searchInput.value = ''; window.setTimeout(() => searchInput.focus(), 20); }
}

function renderManageUsers(){
if(!ui.manageUsersList) return;
const users = Array.isArray(state.manageUsers) ? state.manageUsers.slice() : [];
const templates = Array.isArray(state.manageCadenceTemplates) ? state.manageCadenceTemplates.slice() : [];
if(!users.length){
ui.manageUsersList.innerHTML = '<div class="manageUsersEmpty">No users found.</div>';
return;
}
ui.manageUsersList.innerHTML = users.map(user => {
const rawUserId = String(user.id || '');
const userId = escapeHtml(rawUserId);
const userNameText = String(user.fullName || user.email || 'Unnamed User');
const fullName = escapeHtml(userNameText);
const email = escapeHtml(user.email || '');
const role = String(user.role || 'tc').toLowerCase() === 'admin' ? 'admin' : 'tc';
const ownerName = escapeHtml(getOwnerDisplayNameById(user.hubspotOwnerId));
const statusLabel = user.isActive === false ? 'Inactive' : 'Active';
const deleteDisabled = user.role === 'admin' ? 'disabled' : '';
const isSelf = rawUserId === String(state.authUser?.id || '');
const mfaEnabled = !!user.mfaEnabled;
const mfaRequired = !!user.mfaRequired;
const mfaStatusClass = mfaEnabled ? 'enabled' : 'disabled';
const mfaStatusLabel = mfaEnabled ? 'Enabled' : 'Not Set';
const resetDisabled = (!mfaEnabled || isSelf) ? 'disabled' : '';
const assignedTemplateIds = getManageUserCadenceDraftIds(user);
const assignedCount = assignedTemplateIds.length;
const hasDraftChanges = hasManageUserCadenceDraftChanges(user);
const templateLookup = new Map(templates.map(template => [String(template.id || '').trim(), template]));
const assignedSummary = assignedTemplateIds.length
  ? assignedTemplateIds.map(templateId => {
      const template = templateLookup.get(String(templateId || '').trim()) || {};
      const locked = !!(template.lockedByAdmin || template.isLocked || template.locked);
      const badge = locked ? '<span class="manageUserCadenceTagLock">Locked</span>' : '';
      return '<span class="manageUserCadenceTag">' + escapeHtml(getManageCadenceTemplateLabel(template) || templateId) + badge + '</span>';
    }).join('')
  : '<span class="manageUserCadenceEmpty">No default cadences assigned.</span>';
const hasTemplates = templates.length > 0;
return `
<div class="manageUserRow" data-user-id="${userId}">
  <div class="manageUserIdentity">
    <div class="manageUserName">${fullName}</div>
    <div class="manageUserMeta">${email} · ${escapeHtml(statusLabel)}</div>
    <div class="manageUserCadenceSummary">${assignedSummary}</div>
  </div>
  <div>
    <label class="srOnly" for="manageUserRole-${userId}">Role for ${fullName}</label>
    <select class="input manageUserRoleSelect" id="manageUserRole-${userId}" name="manageUserRole-${userId}" data-user-role="${userId}">
      <option value="tc" ${role === 'tc' ? 'selected' : ''}>TC</option>
      <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
    </select>
  </div>
  <div class="manageUserOwner">${ownerName}</div>
  <div class="manageUserMfa">
    <div class="manageUserMfaTop">
      <span class="manageUserMfaLabel">MFA</span>
      <span class="manageUserMfaStatus ${mfaStatusClass}">${mfaStatusLabel}</span>
    </div>
    <label class="manageUserMfaToggle" for="manageUserMfaRequired-${userId}">
      <input id="manageUserMfaRequired-${userId}" type="checkbox" data-user-mfa-required="${userId}" ${mfaRequired ? 'checked' : ''} ${isSelf ? 'disabled' : ''}>
      <span>Require MFA</span>
    </label>
    <button class="manageUserResetMfaBtn" type="button" data-user-reset-mfa="${userId}" ${resetDisabled}>Reset MFA</button>
  </div>
  <div class="manageUserActions"><button class="manageUserDeleteBtn" type="button" data-user-delete="${userId}" ${deleteDisabled}>Delete</button></div>
  <div class="manageUserCadenceAccess">
    <div class="manageUserCadenceHead">
      <div>
        <div class="manageUserCadenceTitle">Default cadence access</div>
        <div class="manageUserCadenceSub">${assignedCount} assigned. Choose templates in a popup so this list stays clean.</div>
      </div>
      <div class="manageUserCadenceActions">
        <button class="manageUserCadenceOpenBtn" type="button" data-user-open-cadence="${userId}" ${hasTemplates ? '' : 'disabled'}>${hasTemplates ? 'Choose templates' : 'No templates'}</button>
        <button class="manageUserCadenceSaveBtn" type="button" data-user-save-cadence="${userId}" ${hasDraftChanges ? '' : 'disabled'}>Save cadence access</button>
      </div>
    </div>
  </div>
</div>
`;
}).join('');
}
async function loadManageUsers(silent = false){
if(!isAdminUser()) return;
try{
if(!silent && ui.manageUsersList){
ui.manageUsersList.innerHTML = '<div class="manageUsersEmpty">Loading users...</div>';
}
if(ui.manageUsersError) ui.manageUsersError.textContent = '';
const [users] = await Promise.all([
  fetchManageUsers(),
  loadManageCadenceTemplates().catch(() => [])
]);
state.manageUsers = users;
syncBackendSelectableUsersFromManageUsers();
renderManageUsers();
renderOwners();
} catch(error){
const message = error.message || 'Failed to load users';
if(ui.manageUsersError) ui.manageUsersError.textContent = message;
if(ui.manageUsersList){
ui.manageUsersList.innerHTML = `<div class="manageUsersEmpty">${escapeHtml(message)}</div>`;
}
}
}
async function updateManagedUserRole(userId, role){
const res = await nativeFetch(`${API}/auth/admin/users/${encodeURIComponent(userId)}`, {
method:'PATCH',
credentials: "include",
headers:{
'Content-Type':'application/json'
},
body: JSON.stringify({ role })
});
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!res.ok || !data.ok) throw new Error(data.message || 'Failed to update role');
if(ui.manageUsersSuccess) ui.manageUsersSuccess.textContent = 'User role updated.';
state.manageUsers = state.manageUsers.map(user => String(user.id) === String(userId) ? { ...user, role: data.user?.role || role } : user);
renderManageUsers();
}
async function updateManagedUserMfaRequired(userId, required){
const res = await nativeFetch(`${API}/auth/admin/users/${encodeURIComponent(userId)}/mfa-required`, {
method:"PATCH",
credentials:"include",
headers:{"Content-Type":"application/json"},
body: JSON.stringify({ required: !!required })
});
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!res.ok || !data.ok) throw new Error(data.message || "Failed to update MFA requirement");
return data.user || null;
}
async function deleteManagedUser(userId){
const targetUser = state.manageUsers.find(user => String(user.id) === String(userId));
const label = targetUser?.fullName || targetUser?.email || 'this user';
const ok = window.confirm(`Delete ${label}? This only works for users with no history and cannot be undone.`);
if(!ok) return;
const res = await nativeFetch(`${API}/auth/admin/users/${encodeURIComponent(userId)}`, {
method:'DELETE',
credentials: "include"
});
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!res.ok || !data.ok) throw new Error(data.message || 'Failed to delete user');
if(ui.manageUsersSuccess) ui.manageUsersSuccess.textContent = 'User deleted.';
state.manageUsers = state.manageUsers.filter(user => String(user.id) !== String(userId));
renderManageUsers();
}
async function resetManagedUserMfa(userId){
const targetUser = state.manageUsers.find(user => String(user.id) === String(userId));
const label = targetUser?.fullName || targetUser?.email || 'this user';
const ok = window.confirm(`Reset MFA for ${label}? They will need to scan a new QR code and finish setup again.`);
if(!ok) return null;
const res = await nativeFetch(`${API}/auth/admin/users/${encodeURIComponent(userId)}/reset-mfa`, {
method:'POST',
credentials: 'include',
headers:{ 'Content-Type':'application/json' }
});
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!res.ok || !data.ok) throw new Error(data.message || 'Failed to reset MFA');
return data.user || null;
}
function resetAddUserForm(){
if(ui.newUserFullName) ui.newUserFullName.value = '';
if(ui.newUserEmail) ui.newUserEmail.value = '';
if(ui.newUserRole) ui.newUserRole.value = 'tc';
populateAddUserOwnerOptions();
if(ui.addUserError) ui.addUserError.textContent = '';
if(ui.addUserSuccess) ui.addUserSuccess.textContent = '';
if(ui.submitAddUserBtn){
ui.submitAddUserBtn.disabled = false;
ui.submitAddUserBtn.textContent = 'Send Invite';
}
}
function openAddUserModal(){
if(!isAdminUser()) return;
resetAddUserForm();
if(ui.manageUsersError) ui.manageUsersError.textContent = '';
if(ui.manageUsersSuccess) ui.manageUsersSuccess.textContent = '';
loadManageUsers();
ui.topGearMenu?.classList.remove('open');
ui.addUserModal?.classList.add('open');
ui.addUserModal?.setAttribute('aria-hidden','false');
setTimeout(() => ui.newUserFullName?.focus(), 0);
}
function closeAddUserModal(){
ui.addUserModal?.classList.remove('open');
ui.addUserModal?.setAttribute('aria-hidden','true');
}
async function submitAddUser(){
if(!isAdminUser()) return;
const payload = {
fullName: String(ui.newUserFullName?.value || '').trim(),
email: String(ui.newUserEmail?.value || '').trim().toLowerCase(),
role: String(ui.newUserRole?.value || 'tc').trim(),
hubspotOwnerId: String(ui.newUserOwnerId?.value || '').trim()
};
[ui.newUserFullName, ui.newUserEmail, ui.newUserOwnerId].forEach(el => el?.classList.remove('is-invalid'));
if(!payload.fullName || !payload.email || !payload.hubspotOwnerId){
if(!payload.fullName) ui.newUserFullName?.classList.add('is-invalid');
if(!payload.email) ui.newUserEmail?.classList.add('is-invalid');
if(!payload.hubspotOwnerId) ui.newUserOwnerId?.classList.add('is-invalid');
if(ui.addUserError) ui.addUserError.textContent = 'Full name, email, and HubSpot owner are required.';
return;
}
try{
if(ui.addUserError) ui.addUserError.textContent = '';
if(ui.addUserSuccess) ui.addUserSuccess.textContent = '';
if(ui.submitAddUserBtn){
ui.submitAddUserBtn.disabled = true;
ui.submitAddUserBtn.textContent = 'Sending...';
}
const res = await nativeFetch(`${API}/auth/invite-user`, {
method:'POST',
credentials: "include",
headers:{
'Content-Type':'application/json'
},
body: JSON.stringify(payload)
});
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!res.ok || !data.ok) throw new Error(data.message || 'Failed to invite user');
if(ui.addUserSuccess) ui.addUserSuccess.textContent = 'Invite sent successfully.';
if(ui.sidebarStatus) ui.sidebarStatus.textContent = 'User invite sent';
resetAddUserForm();
await loadManageUsers(true);
} catch(error){
if(ui.addUserError) ui.addUserError.textContent = error.message || 'Failed to invite user';
} finally {
if(ui.submitAddUserBtn){
ui.submitAddUserBtn.disabled = false;
ui.submitAddUserBtn.textContent = 'Send Invite';
}
}
}
function escapeHtml(str){ return String(str||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;"); }
function normalizeStatusValue(status){
const raw = String(status || "").trim().toLowerCase();
if(raw === "research") return "research";
if(raw === "active outreach" || raw === "activeoutreach") return "activeOutreach";
if(raw === "engaged" || raw === "engaged for ota") return "engaged";
if(raw === "nurture") return "nurture";
if(raw === "not interested" || raw === "notinterested") return "notInterested";
return "research";
}
function getCompanyMailingAddress(company, localState){
const props = company?.properties || {};
const root = company || {};
const directAddressCandidates = [
  root.mailingAddress,
  root.address,
  root.fullAddress,
  root.full_address,
  props.mailingAddress,
  props.mailing_address,
  props.address,
  props.hs_address,
  props.street_address,
  props.street,
  props.address1,
  props.address_1
].map(value => String(value || '').trim()).filter(Boolean);

const city = String(root.city || props.city || props.hs_city || '').trim();
const stateVal = String(root.state || root.stateCode || props.state || props.hs_state || '').trim();
const zip = String(root.zip || root.postalCode || root.postal_code || props.zip || props.postalCode || props.postal_code || props.hs_postal_code || '').trim();
const lineTwo = [city, stateVal, zip].filter(Boolean).join(', ').replace(', ,', ',').replace(/,\s*$/, '').trim();

for(const candidate of directAddressCandidates){
  if(!candidate) continue;
  const normalizedCandidate = candidate.toLowerCase();
  const normalizedLineTwo = lineTwo.toLowerCase();
  if(lineTwo && normalizedCandidate.includes(normalizedLineTwo)){
    return [candidate];
  }
  if(!lineTwo){
    return [candidate];
  }
}

const street = String(root.street || root.streetAddress || root.street_address || props.street || props.street_address || props.address || props.hs_address || '').trim();
return [street, lineTwo].filter(Boolean);
}
function getCompanyMailingAddressHtml(company){
const parts = getCompanyMailingAddress(company, null);
if(!parts.length) return '';
const query = parts.join(', ');
return `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}" target="_blank" rel="noopener noreferrer">${escapeHtml(parts.join(', '))}</a>`;
}
function getStatusLabel(status){ const raw = String(status || "").trim(); if(raw === "notInterested") return "Not Interested"; return ({research:"Research", activeOutreach:"Active Outreach", engaged:"Engaged for OTA", nurture:"Nurture"})[normalizeStatusValue(status)] || "Research"; }
function normalizeLinkedInUrl(url){ const raw = String(url || "").trim(); if(!raw) return ""; if(raw.startsWith("http://") || raw.startsWith("https://")) return raw; return `https://${raw}`; }
/* -- Capture / scan / add-company (moved to capture.js Phase 4) -- */
function normalizeDomainValue(v){ return window.normalizeDomainValue ? window.normalizeDomainValue(v) : ''; }
function formatDesktopNearbyDistance(v){ return window.formatDesktopNearbyDistance ? window.formatDesktopNearbyDistance(v) : ''; }
function setAddProspectMode(m){ if(window.setAddProspectMode) window.setAddProspectMode(m); }
function getCleanNearbyAddress(m){ return window.getCleanNearbyAddress ? window.getCleanNearbyAddress(m) : ''; }
function getCleanNearbyMetaParts(m){ return window.getCleanNearbyMetaParts ? window.getCleanNearbyMetaParts(m) : []; }
function renderDesktopNearbyMatches(){ if(window.renderDesktopNearbyMatches) window.renderDesktopNearbyMatches(); }
function fillAddCompanyFormFromNearbyMatch(m){ if(window.fillAddCompanyFormFromNearbyMatch) window.fillAddCompanyFormFromNearbyMatch(m); }
function isNearbyAbortError(e){ return window.isNearbyAbortError ? window.isNearbyAbortError(e) : false; }
function getNearbyFriendlyErrorMessage(e,f){ return window.getNearbyFriendlyErrorMessage ? window.getNearbyFriendlyErrorMessage(e,f) : f||''; }
async function fetchNearbyJsonWithTimeout(p,t){ return window.fetchNearbyJsonWithTimeout ? window.fetchNearbyJsonWithTimeout(p,t) : null; }
async function loadDesktopNearbyMatches(){ if(window.loadDesktopNearbyMatches) return window.loadDesktopNearbyMatches(); }
function readFileAsDataUrl(f){ return window.readFileAsDataUrl ? window.readFileAsDataUrl(f) : Promise.resolve(''); }
function splitName(n){ return window.splitName ? window.splitName(n) : [n,'']; }
function guessNameLine(l){ return window.guessNameLine ? window.guessNameLine(l) : ''; }
function guessTitleLine(l,e){ return window.guessTitleLine ? window.guessTitleLine(l,e) : ''; }
function guessCompanyLine(l,e){ return window.guessCompanyLine ? window.guessCompanyLine(l,e) : ''; }
function extractDesktopScanFields(t){ return window.extractDesktopScanFields ? window.extractDesktopScanFields(t) : {}; }
function populateAddCompanyFormFromScan(f){ if(window.populateAddCompanyFormFromScan) window.populateAddCompanyFormFromScan(f); }
function stopDesktopLiveCamera(){ if(window.stopDesktopLiveCamera) window.stopDesktopLiveCamera(); }
function updateDesktopScanStepUI(){ if(window.updateDesktopScanStepUI) window.updateDesktopScanStepUI(); }
function updateDesktopScanPreview(d){ if(window.updateDesktopScanPreview) window.updateDesktopScanPreview(d); }
function openDesktopScanModal(){ if(window.openDesktopScanModal) window.openDesktopScanModal(); }
function closeDesktopScanModal(){ if(window.closeDesktopScanModal) window.closeDesktopScanModal(); }
function prefersMobileCameraMode(){ return window.prefersMobileCameraMode ? window.prefersMobileCameraMode() : false; }
function exitDesktopLiveCamera(){ if(window.exitDesktopLiveCamera) window.exitDesktopLiveCamera(); }
function captureDesktopCameraFrame(){ if(window.captureDesktopCameraFrame) window.captureDesktopCameraFrame(); }
async function startDesktopLiveCamera(){ if(window.startDesktopLiveCamera) return window.startDesktopLiveCamera(); }
async function attachDesktopLiveVideoStream(s){ if(window.attachDesktopLiveVideoStream) return window.attachDesktopLiveVideoStream(s); }
async function requestDesktopCameraStream(){ if(window.requestDesktopCameraStream) return window.requestDesktopCameraStream(); }
async function ensureDesktopTesseractLoaded(){ if(window.ensureDesktopTesseractLoaded) return window.ensureDesktopTesseractLoaded(); }
async function warmupDesktopOcr(){ if(window.warmupDesktopOcr) return window.warmupDesktopOcr(); }
async function runDesktopBusinessCardScan(){ if(window.runDesktopBusinessCardScan) return window.runDesktopBusinessCardScan(); }
function resetAddCompanyForm(){ if(window.resetAddCompanyForm) window.resetAddCompanyForm(); }
function openAddCompanyModal(){ if(window.openAddCompanyModal) window.openAddCompanyModal(); }
function closeAddCompanyModal(){ if(window.closeAddCompanyModal) window.closeAddCompanyModal(); }
function showCompanyStatusOverlay(m,mode){ if(window.showCompanyStatusOverlay) window.showCompanyStatusOverlay(m,mode); }
function collapseSidebarAfterAdd(){ if(window.collapseSidebarAfterAdd) window.collapseSidebarAfterAdd(); }
function collapseSidebarForSelection(){ if(window.collapseSidebarForSelection) window.collapseSidebarForSelection(); }
function upsertCompanyIntoState(c){ if(window.upsertCompanyIntoState) window.upsertCompanyIntoState(c); }
async function deleteSelectedCompany(){ if(window.deleteSelectedCompany) return window.deleteSelectedCompany(); }
function setTouchPatternExpanded(v){ if(window.setTouchPatternExpanded) window.setTouchPatternExpanded(v); }
function resetTouchPatternSection(){ if(window.resetTouchPatternSection) window.resetTouchPatternSection(); }
function getPostAddTaskOptions(){ return window.getPostAddTaskOptions ? window.getPostAddTaskOptions() : []; }
function fillPostAddTaskSelect(d){ if(window.fillPostAddTaskSelect) window.fillPostAddTaskSelect(d); }
function syncPostAddPromptSelection(c){ if(window.syncPostAddPromptSelection) window.syncPostAddPromptSelection(c); }
function resetPostAddTaskPicker(){ if(window.resetPostAddTaskPicker) window.resetPostAddTaskPicker(); }
function openPostAddPrompt(id){ if(window.openPostAddPrompt) window.openPostAddPrompt(id); }
function animatePostAddPromptButton(btn){ if(window.animatePostAddPromptButton) window.animatePostAddPromptButton(btn); }
function closePostAddPrompt(){ if(window.closePostAddPrompt) window.closePostAddPrompt(); }
async function runPostAddTouchOneFlow(m,t,d){ if(window.runPostAddTouchOneFlow) return window.runPostAddTouchOneFlow(m,t,d); }
async function createCompanyFromModal(){ if(window.createCompanyFromModal) return window.createCompanyFromModal(); }

function getMonthKey(date = new Date()){
const d = new Date(date);
d.setHours(0,0,0,0);
return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function isSameTrackedMonth(value, reference = new Date()){
if(!value) return false;
const d = new Date(value);
if(Number.isNaN(d.getTime())) return false;
return getMonthKey(d) === getMonthKey(reference);
}
function getTouchCategory(touch){
if(touch?.statCategory) return touch.statCategory;
const title = String(touch?.title || '').toLowerCase();
const meta = String(touch?.meta || '').toLowerCase();
if(
title.includes('letter') ||
title.includes('mailer') ||
title.includes('mail') ||
title.includes('postcard') ||
meta.includes('letter') ||
meta.includes('mailer') ||
meta.includes('mail') ||
meta.includes('postcard')
) return 'letters';
if(title.includes('linkedin') || title.includes('facebook') || title.includes('social')) return 'social';
if(title.includes('call')) return 'calls';
if(title.includes('e-mail') || title.includes('email')) return 'emails';
if(title.includes('video') || title.includes('meeting') || title.includes('zoom') || title.includes('teams')) return 'meetings';
if(title.includes('stop-in') || title.includes('stop in') || title.includes('walk-in') || title.includes('walk in') || title.includes('in person')) return 'meetings';
return null;
}
function pulseStatCard(category){
const card = category === 'calls'
? ui.callsStatCard
: category === 'emails'
? ui.emailsStatCard
: category === 'social'
? ui.socialStatCard
: category === 'letters'
? ui.lettersStatCard
: category === 'meetings' || category === 'stopIns'
? ui.stopInsStatCard
: null;
if(!card) return;
playStatRiseSound(category);
const riseClass = category === 'letters' || category === 'meetings' || category === 'stopIns' ? 'letter-rise' : 'stat-rise';
card.classList.remove('stat-rise', 'letter-rise');
requestAnimationFrame(() => {
card.classList.add(riseClass);
setTimeout(() => card.classList.remove(riseClass), category === 'letters' ? 1100 : 950);
});
}
function renderWeeklyStats(triggerCategory = null){
const stats = state.selectedOwnerId
? (state.remote.statsByOwner[String(state.selectedOwnerId)] || createEmptyStatsTotals())
: createEmptyStatsTotals();
if(ui.callsStatValue) ui.callsStatValue.textContent = stats.calls;
if(ui.emailsStatValue) ui.emailsStatValue.textContent = stats.emails;
if(ui.socialStatValue) ui.socialStatValue.textContent = stats.social;
if(ui.lettersStatValue) ui.lettersStatValue.textContent = stats.letters;
if(ui.stopInsStatValue) ui.stopInsStatValue.textContent = Number(stats.meetings || 0) + Number(stats.stopIns || 0);
if(triggerCategory){
pulseStatCard(triggerCategory);
}
}
function handleTouchCompletionEffects(companyId, touchIndex){
const touch = getEffectiveTouch(companyId, touchIndex) || getTouchTemplate(companyId)[touchIndex];
const category = getTouchCategory(touch);
renderWeeklyStats(category);
}
function getPriorityLabel(priority){ return ({hot:"Hot", warm:"Warm", cold:"Cold"})[priority] || "Cold"; }
function getHotBadgeMarkup(priority, variant="inline"){ if(String(priority||"") !== "hot") return ""; const extra = variant === "float" ? " float" : (variant === "compact" ? " compact" : " inline"); return `<span class="fireBadge${extra}">🔥 Hot</span>`; }
function getPriorityRank(priority){ return ({hot:0, warm:1, cold:2})[priority] ?? 3; }
function getCompanyPriority(companyId){
const local = getCompanyState(companyId);
if(local.priority) return local.priority;
const status = local.status;
if(status === "engaged") return "hot";
if(status === "activeOutreach") return "warm";
return "cold";
}
function getWhyHot(company){
const local = getCompanyState(company.id);
const status = normalizeStatusValue(company.properties?.prospecting_status || local.status);
const score = getCompanyScore(company.id).total;
const nextIndex = getCurrentNextTouchZeroIndex(company.id);
if(getCompanyPriority(company.id) === "hot") return status === "engaged" ? "Engaged for OTA and still needs follow-through." : "Marked hot and ready for outreach right now.";
if(score >= 5) return `Built ${score} activity points this month and still has momentum.`;
if(nextIndex === 0) return "Fresh lead with no touches completed yet.";
return `Next touch is ready and the company is still in active play.`;
}
function getDueLabel(companyId){
const nextIndex = getCurrentNextTouchZeroIndex(companyId);
if(nextIndex === -1) return "Completed";
return isDueToday(companyId) ? "Today" : (getProspectingState(companyId)?.next_touch_due_at ? "Scheduled" : "Queue");
}
function buildRuntimeTouchFromCadenceStep(step, idx){
const rawType = String(step?.type || '').trim();
const normalizedType = rawType.toLowerCase();
let resolvedType = 'phone';
if(['call','phone','phone call'].includes(normalizedType)) resolvedType = 'phone';
else if(['video','video call','meeting'].includes(normalizedType)) resolvedType = 'video';
else if(normalizedType === 'email') resolvedType = 'email';
else if(['sms','text','text message'].includes(normalizedType)) resolvedType = 'sms';
else if(['social','social message','linkedin','facebook','digital'].includes(normalizedType)) resolvedType = 'social';
else if(['stopin','stop-in','stop in','in person','in person stop-in','walk-in','walk in','visit'].includes(normalizedType)) resolvedType = 'stopIn';
else if(['mailer','mail','letter','postcard'].includes(normalizedType)) resolvedType = 'mailer';
const config = TASK_TYPE_CONFIG[resolvedType] || TASK_TYPE_CONFIG.phone;
const fallbackContent = TASK_TYPE_DEFAULT_CONTENT[resolvedType] || {};
const touchNumber = idx + 1;
const cleanLabel = String(step?.label || step?.title || `Step ${touchNumber}`).replace(/^Touch\s*\d+\s*[—-]\s*/i, '').trim() || `Step ${touchNumber}`;
const instructionText = String(step?.instructionText || step?.details || '').trim();
return {
 touch: touchNumber,
 week: Number(step?.week || touchNumber) || touchNumber,
 title: `Touch ${touchNumber} — ${cleanLabel}`,
 meta: String(step?.meta || config?.label || ''),
 details: instructionText || String(fallbackContent.details || ''),
 instructionText: instructionText || String(fallbackContent.details || ''),
 delayDays: Math.max(0, Number(step?.delayDays ?? 0) || 0),
 points: Math.max(0, Number(step?.points ?? config?.defaultPoints ?? 0) || 0),
 type: resolvedType,
 templateKey: (resolvedType === 'email' || resolvedType === 'mailer') ? String(step?.templateKey || step?.template_key || '').trim() : '',
 tag: (step?.tag && typeof step.tag === 'object') ? step.tag : { ...(config?.tag || { label: 'Task', color: 'blue' }) }
};
}
function buildTouchTemplateRuntimeFromCadenceSteps(steps){
return (Array.isArray(steps) ? steps : []).map((step, idx) => buildRuntimeTouchFromCadenceStep(step, idx));
}
function getCadenceTemplateById(templateId){
const normalizedId = String(templateId || '').trim();
if(!normalizedId) return null;
const templates = Array.isArray(state.cadenceDesigner?.templates) ? state.cadenceDesigner.templates : [];
return templates.find(template => String(template?.id || '').trim() === normalizedId) || null;
}
function getAssignedCadenceTemplateId(companyId){
const prospecting = getProspectingState(companyId);
return String(prospecting?.template_id || '').trim();
}
function getAssignedCadenceTemplate(companyId){
const templateId = getAssignedCadenceTemplateId(companyId);
return templateId ? getCadenceTemplateById(templateId) : null;
}
function getTouchTemplate(companyId){
const base = getBaseTouchTemplate(companyId);
const nextZeroIndex = getCurrentNextTouchZeroIndex(companyId);
if(nextZeroIndex >= base.length){
 base.push(buildExtendedTouch(nextZeroIndex + 1));
}
return base;
}
function getDefaultTaskTypeFromTouch(touch){
const directType = normalizeTaskTypeKey(touch?.effectiveType || touch?.type || touch?.taskType || touch?.tag?.label || '');
if(directType) return directType;
const title = String(touch?.title || "").toLowerCase();
const meta = String(touch?.meta || "").toLowerCase();
if(title.includes("linkedin") || title.includes("facebook") || title.includes("social")) return "social";
if(title.includes("video")) return "video";
if(title.includes("sms") || title.includes("text")) return "sms";
if(title.includes("call")) return "phone";
if(title.includes("e-mail") || title.includes("email")) return "email";
if(
title.includes("mail") ||
title.includes("letter") ||
title.includes("postcard") ||
meta.includes("letter") ||
meta.includes("postcard") ||
meta.includes("mail")
) return "mailer";
if(
title.includes("stop-in") ||
title.includes("stop in") ||
title.includes("walk-in") ||
title.includes("walk in") ||
title.includes("in person")
) return "stopIn";
return null;
}
function getTouchOverrideType(companyId, zeroIndex){
const local = getCompanyState(companyId);
return local.touchOverrides?.[String(zeroIndex)] || "";
}
function getEffectiveTouch(companyId, zeroIndex){
const companyTemplate = getTouchTemplate(companyId);
const baseTouch = companyTemplate[zeroIndex] || (zeroIndex >= companyTemplate.length ? buildExtendedTouch(zeroIndex + 1) : null);
if(!baseTouch) return null;
const overrideType = getTouchOverrideType(companyId, zeroIndex);
const config = TASK_TYPE_CONFIG[overrideType];
if(!config){
const effectiveType = getDefaultTaskTypeFromTouch(baseTouch) || (baseTouch.isExtended ? "detail" : null);
const taskTypeKey = normalizeTaskTypeKey(effectiveType);
return {
...baseTouch,
effectiveType,
taskTypeKey,
isStopIn: taskTypeKey === 'stopIn',
isOverride: false
};
}
const touchNumber = baseTouch.touch || zeroIndex + 1;
const overrideContent = TASK_TYPE_DEFAULT_CONTENT[overrideType] || {};
const taskTypeKey = normalizeTaskTypeKey(overrideType || config.label || config.tag?.label || '');
return {
...baseTouch,
title: `Touch ${touchNumber} — ${config.label}`,
meta: overrideContent.meta || baseTouch.meta,
details: overrideContent.details || baseTouch.details,
tag: { ...config.tag },
points: config.defaultPoints ?? baseTouch.points,
effectiveType: overrideType,
taskTypeKey,
isStopIn: taskTypeKey === 'stopIn',
isOverride: true,
defaultTitle: baseTouch.title,
actionLabel: config.actionLabel,
actionKind: config.actionKind,
statCategory: config.statCategory,
icon: config.icon
};
}
function setTouchOverrideLocal(companyId, zeroIndex, taskType){
const local = getCompanyState(companyId);
if(!local.touchOverrides || typeof local.touchOverrides !== "object") local.touchOverrides = {};
if(taskType){
local.touchOverrides[String(zeroIndex)] = taskType;
} else {
delete local.touchOverrides[String(zeroIndex)];
}
}
function setTouchOverride(companyId, zeroIndex, taskType){
setTouchOverrideLocal(companyId, zeroIndex, taskType);
queueCompanyStateSave(companyId);
}
function getTemplateOptionLabel(options, templateKey, fallbackLabel = ""){
const normalizedKey = String(templateKey || "").trim();
const match = Array.isArray(options) ? options.find(option => String(option?.value || "") === normalizedKey) : null;
return String(match?.label || fallbackLabel || "").trim();
}
function getCompactTemplateLabel(label){
const value = String(label || "").trim();
if(!value) return "";
return value.split(/\s+/)[0];
}
function inferMailerTemplateKeyFromTouchTitle(touchTitle){
const value = String(touchTitle || "").toLowerCase();
if(value.includes("crumpled")) return "crumpled";
if(value.includes("simple")) return "simple";
if(value.includes("stable")) return "stable";
if(value.includes("secure")) return "secure";
if(value.includes("supported")) return "supported";
return "simple";
}
function getCompanyTouchTemplateSelections(companyId){
const local = getCompanyState(companyId);
if(!local.touchTemplateSelections || typeof local.touchTemplateSelections !== "object") local.touchTemplateSelections = {};
return local.touchTemplateSelections;
}
function getCadenceStepTemplateSelection(companyId, zeroIndex){
const touch = getEffectiveTouch(companyId, zeroIndex) || getTouchTemplate(companyId)[zeroIndex];
return String(touch?.templateKey || "").trim();
}
function getCompanyTouchTemplateSelection(companyId, zeroIndex){
return getCompanyTouchTemplateSelections(companyId)[String(zeroIndex)] || "";
}
function setCompanyTouchTemplateSelection(companyId, zeroIndex, templateKey){
const selections = getCompanyTouchTemplateSelections(companyId);
if(templateKey){
selections[String(zeroIndex)] = String(templateKey);
} else {
delete selections[String(zeroIndex)];
}
queueCompanyStateSave(companyId);
}
function isMailerTouchType(companyId, zeroIndex){
const touch = getEffectiveTouch(companyId, zeroIndex) || getTouchTemplate(companyId)[zeroIndex];
const taskType = getTouchOverrideType(companyId, zeroIndex) || getDefaultTaskTypeFromTouch(touch) || "";
return String(taskType) === "mailer";
}
function getTouchTemplateDescriptor(companyId, zeroIndex){
const touch = getEffectiveTouch(companyId, zeroIndex) || getTouchTemplate(companyId)[zeroIndex];
const taskType = getTouchOverrideType(companyId, zeroIndex) || getDefaultTaskTypeFromTouch(touch) || "detail";
const storedKey = getCompanyTouchTemplateSelection(companyId, zeroIndex) || getCadenceStepTemplateSelection(companyId, zeroIndex);
if(taskType === "email") {
const ownerId = state.selectedOwnerId || "default";
const templateKey = storedKey || getOwnerEmailTemplateSelection(ownerId, zeroIndex) || "default";
return {
taskType,
templateKey,
templateLabel: getTemplateOptionLabel(getAllEmailTemplateOptions(ownerId, zeroIndex), templateKey, "Default")
};
}
if(taskType === "mailer") {
const templateKey = storedKey || inferMailerTemplateKeyFromTouchTitle(touch?.title || "");
return {
taskType,
templateKey,
templateLabel: getTemplateOptionLabel(MAILER_TEMPLATE_OPTIONS, templateKey, templateKey ? String(templateKey).charAt(0).toUpperCase() + String(templateKey).slice(1) : "")
};
}
return { taskType, templateKey: "", templateLabel: "" };
}
function getOwnerEmailTemplates(ownerId){
const ownerState = getOwnerUserStatePayload(ownerId);
const raw = ownerState.ownerEmailTemplates;
if(!raw || typeof raw !== "object" || Array.isArray(raw)){
ownerState.ownerEmailTemplates = { overrides: {}, custom: {} };
return ownerState.ownerEmailTemplates;
}
const hasStructuredShape = raw.overrides || raw.custom;
if(!hasStructuredShape){
const migratedOverrides = {};
Object.entries(raw).forEach(([key, value]) => {
if(key === '_custom') return;
if(value && typeof value === 'object' && !Array.isArray(value)) migratedOverrides[key] = { ...value };
});
const migratedCustom = raw._custom && typeof raw._custom === 'object' && !Array.isArray(raw._custom)
? Object.fromEntries(Object.entries(raw._custom).map(([key, value]) => [key, { ...value }]))
: {};
ownerState.ownerEmailTemplates = { overrides: migratedOverrides, custom: migratedCustom };
return ownerState.ownerEmailTemplates;
}
if(!raw.overrides || typeof raw.overrides !== "object" || Array.isArray(raw.overrides)) raw.overrides = {};
if(!raw.custom || typeof raw.custom !== "object" || Array.isArray(raw.custom)) raw.custom = {};
return raw;
}
function getOwnerEmailTemplateOverrides(ownerId){
return getOwnerEmailTemplates(ownerId).overrides;
}
function getOwnerCustomEmailTemplates(ownerId){
return getOwnerEmailTemplates(ownerId).custom;
}
function getOwnerEmailTouchSelections(ownerId){
const ownerState = getOwnerUserStatePayload(ownerId);
if(!ownerState.ownerEmailTouchSelections || typeof ownerState.ownerEmailTouchSelections !== "object") ownerState.ownerEmailTouchSelections = {};
return ownerState.ownerEmailTouchSelections;
}
function getOwnerEmailTemplateSelection(ownerId, touchIndex){
return getOwnerEmailTouchSelections(ownerId)[String(touchIndex)] || "default";
}
function setOwnerEmailTemplateSelection(ownerId, touchIndex, templateKey){
const selections = getOwnerEmailTouchSelections(ownerId);
selections[String(touchIndex)] = templateKey || "default";
queueOwnerUserStateSave(ownerId);
}
function createCustomEmailTemplateKey(){
state.detailTemplateEditor.draftCounter = Number(state.detailTemplateEditor.draftCounter || 0) + 1;
return `custom_${Date.now()}_${state.detailTemplateEditor.draftCounter}`;
}
function isCustomEmailTemplate(ownerId, templateKey){
return !!getOwnerCustomEmailTemplates(ownerId)[String(templateKey || '')];
}
function getAllEmailTemplateOptions(ownerId, touchIndex){
const ownerCustomTemplates = getOwnerCustomEmailTemplates(ownerId);
const builtIns = EMAIL_TEMPLATE_OPTIONS.map(option => ({ ...option }));
const customOptions = Object.entries(ownerCustomTemplates)
.map(([value, template]) => ({
value,
label: String(template?.name || template?.label || 'Custom Template').trim() || 'Custom Template',
isCustom: true,
createdAt: template?.createdAt || ''
}))
.sort((a, b) => String(a.label).localeCompare(String(b.label)));
const options = [...builtIns, ...customOptions];
const selectedKey = String(getOwnerEmailTemplateSelection(ownerId, touchIndex) || 'default');
if(selectedKey !== 'default' && !options.some(option => option.value === selectedKey)){
options.push({ value: selectedKey, label: 'Missing Template', isMissing: true });
}
return options;
}
function getDefaultEmailTemplateContent(templateKey, touchIndex){
const base = {
default: getEmailTemplate("dental", touchIndex, "{{firstName}}"),
websiteVisit: {
subject: "Quick website note",
body: `Hi {{firstName}},
I was on your website today and wanted to reach out. I work with dental practices locally and always like seeing how teams present themselves online.
If you ever want a second set of eyes on anything around technology, cybersecurity, or day-to-day IT support, I’m happy to be a resource.
Have a great day!`
},
meetingInvite: {
subject: "Quick intro meeting",
body: `Hi {{firstName}},
I wanted to reach out and see if you would be open to a quick introductory conversation sometime soon.
We support dental practices in the area with IT support, cybersecurity, and technology planning, and I thought it may be helpful to connect briefly and introduce myself as a resource.
Let me know what works best for you.`
},
otaPitch: {
subject: "Onsite Technology Analysis",
body: `Hi {{firstName}},
I wanted to see if it would make sense to schedule a quick Onsite Technology Analysis sometime this quarter.
It is simply an independent look at your technology and cybersecurity to help make sure everything is aligned and that nothing important is being missed. Even if no major changes are needed, it usually gives practices a clearer picture of where things stand today.
Let me know if you would be open to exploring that.`
},
followUp: {
subject: "Following up",
body: `Hi {{firstName}},
I just wanted to follow up and stay on your radar.
If questions ever come up around IT support, cybersecurity, backups, or technology planning for the practice, I’m always happy to be a resource.
Hope all is going well on your end.`
}
};
return base[templateKey] || { subject: '', body: '' };
}
function getDefaultTouchTemplateOverrideKey(touchIndex){
const idx = Number.isInteger(Number(touchIndex)) ? Number(touchIndex) : 0;
return `default_touch_${idx}`;
}
function getOwnerEmailTemplateOverride(ownerId, templateKey, touchIndex){
const overrides = getOwnerEmailTemplateOverrides(ownerId);
if(!templateKey) return null;
if(templateKey === 'default'){
return overrides[getDefaultTouchTemplateOverrideKey(touchIndex)] || null;
}
const customTemplate = getOwnerCustomEmailTemplates(ownerId)[templateKey];
if(customTemplate) return customTemplate;
return overrides[templateKey] || null;
}
function getResolvedEmailTemplate(ownerId, touchIndex, firstName){
const templateKey = getOwnerEmailTemplateSelection(ownerId, touchIndex);
const override = getOwnerEmailTemplateOverride(ownerId, templateKey, touchIndex);
const fallback = getDefaultEmailTemplateContent(templateKey, touchIndex);
const replaceName = (value) => String(value || "").replaceAll("{{firstName}}", firstName || "Sarah");
return {
templateKey,
subject: replaceName(override?.subject ?? fallback.subject),
body: replaceName(override?.body ?? fallback.body)
};
}
function getEditableOwnerEmailTemplate(ownerId, touchIndex){
const templateKey = getOwnerEmailTemplateSelection(ownerId, touchIndex);
const override = getOwnerEmailTemplateOverride(ownerId, templateKey, touchIndex);
const fallback = getDefaultEmailTemplateContent(templateKey, touchIndex);
const customTemplate = getOwnerCustomEmailTemplates(ownerId)[templateKey] || null;
const options = getAllEmailTemplateOptions(ownerId, touchIndex);
return {
templateKey,
label: (options.find(option => option.value === templateKey)?.label) || "Default",
name: customTemplate?.name || '',
isCustom: !!customTemplate,
subject: override?.subject ?? fallback.subject,
body: override?.body ?? fallback.body
};
}
function getDetailTemplateOptions(){
const ownerId = state.selectedOwnerId || 'default';
return getAllEmailTemplateOptions(ownerId, 0).filter(option => option.value !== 'default');
}

function getCadenceDesignerEmailTemplateOptions(ownerId){
const resolvedOwnerId = String(ownerId || state.selectedOwnerId || 'default').trim() || 'default';
const options = getAllEmailTemplateOptions(resolvedOwnerId, 0);
return options.map((option) => ({
value: String(option?.value || ''),
label: option?.value === 'default'
? 'Default / None'
: (String(option?.label || option?.name || option?.value || 'Template').trim() || 'Template'),
isCustom: !!option?.isCustom,
isMissing: !!option?.isMissing
}));
}
window.getCadenceDesignerEmailTemplateOptions = getCadenceDesignerEmailTemplateOptions;
function createOwnerCustomEmailTemplate(ownerId, name, subject, body){
const customTemplates = getOwnerCustomEmailTemplates(ownerId);
const key = createCustomEmailTemplateKey();
const cleanName = String(name || '').trim() || 'Custom Template';
customTemplates[key] = {
name: cleanName,
subject: String(subject || ''),
body: String(body || ''),
createdAt: new Date().toISOString(),
updatedAt: new Date().toISOString()
};
queueOwnerUserStateSave(ownerId);
return key;
}
function saveOwnerEmailTemplateOverride(ownerId, templateKey, subject, body, name, touchIndex){
if(!templateKey) return;
if(isCustomEmailTemplate(ownerId, templateKey)){
const customTemplates = getOwnerCustomEmailTemplates(ownerId);
const existing = customTemplates[templateKey] || {};
customTemplates[templateKey] = {
...existing,
name: String(name || existing.name || 'Custom Template').trim() || 'Custom Template',
subject: String(subject || ''),
body: String(body || ''),
createdAt: existing.createdAt || new Date().toISOString(),
updatedAt: new Date().toISOString()
};
} else {
const templates = getOwnerEmailTemplateOverrides(ownerId);
const overrideKey = templateKey === 'default' ? getDefaultTouchTemplateOverrideKey(touchIndex) : templateKey;
templates[overrideKey] = { subject: String(subject || ''), body: String(body || '') };
}
queueOwnerUserStateSave(ownerId);
}
function deleteOwnerCustomEmailTemplate(ownerId, templateKey){
if(!isCustomEmailTemplate(ownerId, templateKey)) return false;
const customTemplates = getOwnerCustomEmailTemplates(ownerId);
delete customTemplates[templateKey];
const selections = getOwnerEmailTouchSelections(ownerId);
Object.keys(selections).forEach((touchIndex) => {
if(String(selections[touchIndex]) === String(templateKey)) selections[touchIndex] = 'default';
});
queueOwnerUserStateSave(ownerId);
return true;
}
function resetOwnerEmailTemplateOverride(ownerId, templateKey){
if(isCustomEmailTemplate(ownerId, templateKey)){
deleteOwnerCustomEmailTemplate(ownerId, templateKey);
return;
}
const templates = getOwnerEmailTemplateOverrides(ownerId);
delete templates[templateKey];
queueOwnerUserStateSave(ownerId);
}
function openDetailTemplateSettings(templateKey){
const options = getDetailTemplateOptions();
const safeTemplateKey = options.some(option => option.value === templateKey) ? templateKey : (state.detailTemplateEditor.templateKey || options[0]?.value || "websiteVisit");
state.detailTemplateEditor.open = true;
state.detailTemplateEditor.templateKey = safeTemplateKey;
if(ui.detailTemplateSelect){
ui.detailTemplateSelect.innerHTML = options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('');
ui.detailTemplateSelect.value = safeTemplateKey;
}
renderDetailTemplateEditor();
requestAnimationFrame(() => {
ui.detailSettingsPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
});
}
function closeDetailTemplateSettings(){
state.detailTemplateEditor.open = false;
if(ui.detailSettingsPanel) ui.detailSettingsPanel.classList.remove('open');
}
function renderDetailTemplateEditor(){
if(!ui.detailSettingsPanel || !ui.detailTemplateSelect || !ui.detailTemplateSubject || !ui.detailTemplateBody) return;
const ownerId = state.selectedOwnerId || "default";
const options = getDetailTemplateOptions();
if(!options.length){
ui.detailSettingsPanel.classList.remove('open');
return;
}
const fallbackKey = state.detailTemplateEditor.templateKey || options[0]?.value || "websiteVisit";
const templateKey = options.some(option => option.value === fallbackKey) ? fallbackKey : (options[0]?.value || 'websiteVisit');
state.detailTemplateEditor.templateKey = templateKey;
ui.detailTemplateSelect.innerHTML = options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('');
ui.detailTemplateSelect.value = templateKey;
const template = getOwnerEmailTemplateOverride(ownerId, templateKey) || getDefaultEmailTemplateContent(templateKey, 3);
const customTemplate = getOwnerCustomEmailTemplates(ownerId)[templateKey] || null;
ui.detailSettingsPanel.classList.toggle('open', !!state.detailTemplateEditor.open);
if(ui.detailTemplateNameWrap) ui.detailTemplateNameWrap.style.display = customTemplate ? '' : 'none';
if(ui.detailTemplateName) ui.detailTemplateName.value = customTemplate?.name || '';
if(ui.detailTemplateDeleteBtn) ui.detailTemplateDeleteBtn.disabled = !customTemplate;
if(ui.detailTemplateResetBtn) ui.detailTemplateResetBtn.textContent = customTemplate ? 'Reset Content' : 'Reset Template';
ui.detailTemplateSubject.value = template.subject || '';
ui.detailTemplateBody.value = template.body || '';
}
function isEmailTouchType(companyId, touchIndex){
return (getTouchActionMeta(companyId, touchIndex)?.kind || "") === "email";
}
function getActiveVertical(companyId){ return "dental"; }
function getEmailTemplate(vertical, touchIndex, firstName){
const name = firstName || "Sarah";
const templates = {
3: {
subject: "Local dental IT resource",
body: `Hi ${name},
I wanted to introduce myself. I work with a premier client and other dental practices in the area and spend most of my time helping offices think through their technology, support, and cybersecurity in a practical way.
Every practice is a little different, but a lot of what we see tends to revolve around the same things, practice management systems like Dentrix or Eaglesoft, imaging and cone beam setups, backups, and making sure everything is actually working together the way it should.
No ask here, just wanted to put a name to Advantage Technologies in case you ever want a second opinion or need a resource locally.
If nothing else, you’ll at least know who to call if something comes up.
Have a great week.`
},
12: {
subject: "Closing the loop",
body: `Hi ${name},
I wanted to follow up and close the loop. I haven’t heard back and didn’t want to be a nuisance.
Would it make sense to schedule an onsite technology assessment in the next month or so, or should I plan to reconnect down the road?
Either way, I appreciate your time.`
}
};
return templates[touchIndex] || { subject: "", body: "" };
}
const VERTICAL_OPTIONS = ["", "CPA", "Dental", "Legal"];
function getCompanyVertical(companyId){
const local = getCompanyState(companyId);
const value = String(local?.vertical || "").trim();
return VERTICAL_OPTIONS.includes(value) ? value : "";
}
function getCompanyVerticalLabel(companyId){
const value = getCompanyVertical(companyId);
return value || "Vertical?";
}
function ensureDetailVerticalPill(){
const row = document.getElementById('detailFocusRow');
if(!row) return null;
let btn = document.getElementById('detailVerticalPill');
if(!btn){
  btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'detailVerticalPill';
  btn.className = 'detailVerticalPill';
  btn.setAttribute('aria-label', 'Cycle vertical');
  row.appendChild(btn);
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if(!state.selectedCompanyId) return;
    if(window.WorkspaceDoor?.cycleCompanyVertical){
      window.WorkspaceDoor.cycleCompanyVertical(state.selectedCompanyId);
      return;
    }
    const key = String(state.selectedCompanyId || '').trim();
    if(!key) return;
    const local = getCompanyState(key);
    const current = getCompanyVertical(key);
    const options = ['', 'CPA', 'Dental', 'Legal'];
    const currentIndex = options.indexOf(current);
    const nextValue = options[(currentIndex + 1 + options.length) % options.length];
    local.vertical = nextValue;
    queueCompanyStateSave(key, { delay: 0 });
    renderDetailPane();
    renderProspectList();
  });
}
return btn;
}

function parseLocalDate(dateStr) {
if (!dateStr) return null;
const clean = String(dateStr).slice(0, 10);
const [y, m, d] = clean.split("-").map(Number);
if (!y || !m || !d) return null;
return new Date(y, m - 1, d);
}
function formatDisplayDate(dateStr) {
const d = parseLocalDate(dateStr);
if (!d) return "Not set";
return d.toLocaleDateString(undefined, {
month: "short",
day: "numeric"
});
}
function isSameLocalCalendarDate(a, b) {
if (!a || !b) return false;
return (
a.getFullYear() === b.getFullYear() &&
a.getMonth() === b.getMonth() &&
a.getDate() === b.getDate()
);
}
function getIsoDateWithOffset(days){
const date = new Date();
date.setHours(0,0,0,0);
date.setDate(date.getDate() + days);
return date.toISOString().slice(0,10);
}

function clearCompanyDueDateState(companyId){
if(!companyId) return;
const local = getCompanyState(companyId);
local.nextDuePrompt = true;
const company = getCompanyById(companyId);
if(company){
company.prospecting = {
...(company.prospecting || {}),
next_touch_due_at: null
};
company.properties = company.properties || {};
company.properties.prospecting_due_date = "";
}
}
function hasPendingNextDueLock(companyId = state.selectedCompanyId){
const id = String(companyId || "").trim();
if(!id) return false;
const local = getCompanyState(id);
if(!local?.nextDuePrompt) return false;
return !getRawDueDate(id);
}
function showNextDueLockToast(){
if(typeof showAdvanceToast === "function"){
showAdvanceToast("↗ Set next follow up date first", { tone: 'error' });
}
ui.sidebarStatus.textContent = "Set next follow up date first";
}
function showNextDuePrompt(companyId){
clearCompanyDueDateState(companyId);
saveLocalState();
state.selectedCompanyId = companyId;
state.pinnedCompanyId = companyId;
setView("detail");
renderProspectList();
CQBus.emit('render:detail');
CQBus.emit('render:board');
if(typeof showAdvanceToast === "function"){
showAdvanceToast("↗ Set next follow up date", { tone: 'error' });
}
setTimeout(() => {
ui.nextDuePrompt?.scrollIntoView({ behavior: "smooth", block: "center" });
ui.nextDueTodayBtn?.focus();
}, 80);
}
async function applyNextDueDate(companyId, dueDate){
if(!companyId || !dueDate) return;
try{
state.selectedCompanyId = companyId;
state.pinnedCompanyId = companyId;
await saveDueDateToBackend(companyId, dueDate);
const local = getCompanyState(companyId);
local.nextDuePrompt = false;
saveLocalState();
renderProspectList();
CQBus.emit('render:detail');
CQBus.emit('render:board');
ui.sidebarStatus.textContent = "Due date saved";
} catch(error){
console.error(error);
ui.sidebarStatus.textContent = "Due date failed to save";
}
}
function getDueDateDisplay(companyId){
return formatDisplayDate(getRawDueDate(companyId));
}
function getDueDateSortValue(companyId){
const date = parseLocalDate(getRawDueDate(companyId));
if (!date) return Number.MAX_SAFE_INTEGER;
date.setHours(0,0,0,0);
return date.getTime();
}
function isCompanyPastDue(companyId){
const due = parseLocalDate(getRawDueDate(companyId));
if(!due) return false;
due.setHours(0,0,0,0);
const today = new Date();
today.setHours(0,0,0,0);
return due.getTime() < today.getTime();
}
function parseAddedDateValue(value){
if(value == null || value === "") return null;
if(value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
if(typeof value === "number" && Number.isFinite(value)){
const date = new Date(value > 1e12 ? value : value * 1000);
return Number.isNaN(date.getTime()) ? null : date;
}
const raw = String(value).trim();
if(!raw) return null;
if(/^\d{13}$/.test(raw)){
const date = new Date(Number(raw));
return Number.isNaN(date.getTime()) ? null : date;
}
if(/^\d{10}$/.test(raw)){
const date = new Date(Number(raw) * 1000);
return Number.isNaN(date.getTime()) ? null : date;
}
if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return parseLocalDate(raw);
const date = new Date(raw);
return Number.isNaN(date.getTime()) ? null : date;
}
function getCompanyAddedDate(companyOrId){
const company = typeof companyOrId === "object" && companyOrId ? companyOrId : getCompanyById(companyOrId);
if(!company) return null;
const local = getCompanyState(company.id);
const props = company.properties || {};
return parseAddedDateValue(
props.prospecting_added_at ||
props.createdate ||
props.hs_createdate ||
props.createdAt ||
company.createdAt ||
company.created_at ||
local.addedAt ||
""
);
}
function getAddedDateSortValue(companyOrId){
const date = getCompanyAddedDate(companyOrId);
if(!date) return Number.NEGATIVE_INFINITY;
return date.getTime();
}
function isAddedToday(companyOrId){
const date = getCompanyAddedDate(companyOrId);
if(!date) return false;
return isSameLocalCalendarDate(date, new Date());
}
function isAddedYesterday(companyOrId){
const date = getCompanyAddedDate(companyOrId);
if(!date) return false;
const yesterday = new Date();
yesterday.setHours(0,0,0,0);
yesterday.setDate(yesterday.getDate() - 1);
return isSameLocalCalendarDate(date, yesterday);
}
function hasDueDateSet(companyOrId){
const companyId = typeof companyOrId === "object" && companyOrId ? companyOrId.id : companyOrId;
return getDueDateSortValue(companyId) !== Number.MAX_SAFE_INTEGER;
}
function shouldShowNewBadge(companyOrId){
const company = typeof companyOrId === "object" && companyOrId ? companyOrId : getCompanyById(companyOrId);
if(!company) return false;
return company.is_new === true || company.isNew === true || company?.properties?.is_new === true || String(company?.properties?.is_new || "").toLowerCase() === "true";
}
function shouldShowUntouchedBadge(companyOrId){
const company = typeof companyOrId === "object" && companyOrId ? companyOrId : getCompanyById(companyOrId);
if(!company) return false;
return company.is_untouched === true || company.isUntouched === true || company?.properties?.is_untouched === true || String(company?.properties?.is_untouched || "").toLowerCase() === "true";
}
function isDueToday(companyId){
const dueDate = parseLocalDate(getRawDueDate(companyId));
if (!dueDate) return false;
return isSameLocalCalendarDate(dueDate, new Date());
}
function inferActionKindFromNextTouchText(text){
const value = String(text || "").toLowerCase();
if(value.includes("social") || value.includes("linkedin") || value.includes("facebook")) return "linkedin";
if(value.includes("email") || value.includes("e-mail")) return "email";
if(value.includes("stop-in") || value.includes("in person") || value.includes("visit") || value.includes("walk-in")) return "map";
if(value.includes("call") || value.includes("phone") || value.includes("video")) return "phone";
if(value.includes("mailer") || value.includes("postcard") || value.includes("letter")) return "print";
return "detail";
}
function performActionKindForCompany(companyId, actionKind){
const company = getCompanyById(companyId);
const local = getCompanyState(companyId);
const props = company?.properties || {};
const normalizedKind = String(actionKind || "").trim().toLowerCase();
if(normalizedKind === "linkedin"){
const url = normalizeLinkedInUrl(
(ui.prospectLinkedIn && ui.prospectLinkedIn.value) ||
local.linkedin ||
props.linkedin_company_page ||
props.website ||
""
);
if(!url) return false;
window.open(url, "_blank", "noopener,noreferrer");
return true;
}
if(normalizedKind === "email"){
const touchIndex = typeof getCurrentNextTouchZeroIndex === "function" ? getCurrentNextTouchZeroIndex(companyId) : 0;
const firstName = ((ui.contactFirst && ui.contactFirst.value) || local.contactFirst || "there").trim() || "there";
const email = ((ui.prospectEmail && ui.prospectEmail.value) || local.email || props.email || "").trim();
if(!email) return false;
const tpl = getResolvedEmailTemplate(state.selectedOwnerId || "default", touchIndex, firstName);
window.location.href = `mailto:${email}?subject=${encodeURIComponent(tpl.subject)}&body=${encodeURIComponent(tpl.body)}`;
return true;
}
if(normalizedKind === "phone"){
const phoneRaw =
(ui.prospectPhone && ui.prospectPhone.value) ||
local.phone ||
props.phone ||
props.hs_phone_number ||
props.mobilephone ||
props.phone_number ||
"";
const phone = String(phoneRaw).replace(/[^\d+]/g,"");
if(!phone) return false;
triggerPhoneCall(phone);
return true;
}
if(normalizedKind === "map"){
return openMapsForNearbyDentists();
}
if(normalizedKind === "print"){
const touchIndex = typeof getCurrentNextTouchZeroIndex === "function" ? getCurrentNextTouchZeroIndex(companyId) : 0;
const touch = getEffectiveTouch(companyId, touchIndex) || getTouchTemplate(companyId)[touchIndex] || {};
const descriptor = getTouchTemplateDescriptor(companyId, touchIndex);
openMailerReviewModal(companyId, {
  touchIndex,
  touchTitle: `${touch.touch || touchIndex + 1} - ${getCleanTouchTitle(touch, touchIndex)}`,
  templateKey: descriptor?.templateKey || "",
  templateLabel: descriptor?.templateLabel || ""
});
return true;
}
window.WorkspaceDoor?.openCompanyDetail?.(companyId);
return true;
}
function getTouchActionMeta(companyId, touchIndex){
const touch = getEffectiveTouch(companyId, touchIndex) || getTouchTemplate(companyId)[touchIndex];
if(!touch) return null;
if(touch.actionKind && touch.actionLabel) return { label: touch.actionLabel, kind: touch.actionKind };
const title = String(touch.title || "").toLowerCase();
if(title.includes("linkedin") || title.includes("facebook") || title.includes("social")) return { label: "Open LinkedIn", kind: "linkedin" };
if(title.includes("e-mail") || title.includes("email")) return { label: "Send Email", kind: "email" };
if(title.includes("call") || title.includes("phone")) return { label: "Call Prospect", kind: "phone" };
if(title.includes("walk-in") || title.includes("office introduction") || title.includes("stop-in") || title.includes("in person") || title.includes("visit")) return { label: "Open Map", kind: "map" };
if(title.includes("letter") || title.includes("postcard")) return { label: "Open Print Kit", kind: "print" };
return { label: "Action", kind: "detail" };
}
function getCompanyMapQuery(companyId){
const company = state.companies.find(c => c.id === companyId);
const local = getCompanyState(companyId);
const props = company?.properties || {};
const localAddress = String(local.companyAddress || "").trim();
const street = String(props.address || props.hs_address || "").trim();
const city = String(props.city || props.hs_city || "").trim();
const stateVal = String(props.state || props.hs_state || "").trim();
const zip = String(props.zip || props.hs_postal_code || "").trim();
const addressParts = [street, city, stateVal, zip].filter(Boolean);
return localAddress || addressParts.join(", ") || String(props.name || "").trim();
}
function openMapsForNearbyDentists() {
if (!navigator.geolocation) {
alert("Geolocation is not supported on this device.");
return false;
}
navigator.geolocation.getCurrentPosition(
(position) => {
const lat = position.coords.latitude;
const lng = position.coords.longitude;
const ua = navigator.userAgent || "";
const isAppleDevice = /iPhone|iPad|iPod|Mac/i.test(ua);
const isAndroid = /Android/i.test(ua);
const isMobile = isAppleDevice || isAndroid || /Mobile/i.test(ua);
if (isMobile) {
const nativeUrl = isAppleDevice
? `maps://?q=dentists&sll=${lat},${lng}`
: `geo:${lat},${lng}?q=dentists`;
window.location.href = nativeUrl;
return;
}
const desktopUrl = `https://www.google.com/maps/search/dentists/@${lat},${lng},14z`;
window.open(desktopUrl, "_blank", "noopener,noreferrer");
},
(error) => {
let message = "Unable to get your location.";
if (error.code === error.PERMISSION_DENIED) {
message = "Location permission was denied. Please allow location access in your browser settings and try again.";
} else if (error.code === error.POSITION_UNAVAILABLE) {
message = "Your location is currently unavailable. Please try again.";
} else if (error.code === error.TIMEOUT) {
message = "Location request timed out. Please try again.";
}
alert(message);
},
{
enableHighAccuracy: true,
timeout: 10000,
maximumAge: 0
}
);
return true;
}
function runTouchAction(companyId, touchIndex){
const local = getCompanyState(companyId);
const company = getCompanyById(companyId);
const props = company?.properties || {};
const action = getTouchActionMeta(companyId, touchIndex);
if(!action) return false;
if(action.kind === "linkedin"){
const url = normalizeLinkedInUrl((ui.prospectLinkedIn && ui.prospectLinkedIn.value) || local.linkedin || props.linkedin_company_page || props.website || "");
if(url){
window.open(url, "_blank", "noopener,noreferrer");
return true;
}
return false;
}
if(action.kind === "email"){
const email = ((ui.prospectEmail && ui.prospectEmail.value) || local.email || props.email || "").trim();
if(!email) return false;
state.emailEditor = { companyId, touchIndex };
state.selectedCompanyId = companyId;
openQuillComposerModal();
return true;
}
if(action.kind === "phone"){
const phoneRaw =
(ui.prospectPhone && ui.prospectPhone.value) ||
local.phone ||
props.phone ||
props.hs_phone_number ||
props.mobilephone ||
props.phone_number ||
"";
const phone = String(phoneRaw).replace(/[^\d+]/g,"");
if(!phone) return false;
triggerPhoneCall(phone);
return true;
}
if(action.kind === "map"){
return openMapsForNearbyDentists();
}
if(action.kind === "print"){
const touch = getEffectiveTouch(companyId, touchIndex) || getTouchTemplate(companyId)[touchIndex] || {};
const descriptor = getTouchTemplateDescriptor(companyId, touchIndex);
openMailerReviewModal(companyId, {
  touchTitle: `${touch.touch || touchIndex + 1} - ${getCleanTouchTitle(touch, touchIndex)}`,
  templateLabel: descriptor?.templateLabel || ""
});
return true;
}
window.WorkspaceDoor?.openCompanyDetail?.(companyId);
return true;
}

function getMailerReviewElements(){
return {
  backdrop: document.getElementById("mailerReviewModal"),
  title: document.getElementById("mailerReviewTitle"),
  sub: document.getElementById("mailerReviewSub"),
  templateName: document.getElementById("mailerReviewTemplateName"),
  contact: document.getElementById("mailerReviewContactName"),
  address: document.getElementById("mailerReviewAddress"),
  closeBtns: Array.from(document.querySelectorAll("[data-close-mailer-review]"))
};
}
function normalizeMailerAddressValue(value){
  return String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim();
}
function escapeMailerAddressRegex(value){
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function looksLikeMailerFullAddress(value, city = '', stateVal = '', zip = ''){
  const normalized = normalizeMailerAddressValue(value).toLowerCase();
  if(!normalized) return false;
  const cityNorm = normalizeMailerAddressValue(city).toLowerCase();
  const stateNorm = normalizeMailerAddressValue(stateVal).toLowerCase();
  const zipNorm = normalizeMailerAddressValue(zip).toLowerCase();
  if(zipNorm && normalized.includes(zipNorm)) return true;
  if(cityNorm && stateNorm && normalized.includes(cityNorm) && normalized.includes(stateNorm)) return true;
  return /\d{5}(?:-\d{4})?/.test(normalized);
}
function stripMailerTrailingLocality(value, city = '', stateVal = '', zip = ''){
  let output = normalizeMailerAddressValue(value);
  if(!output) return '';
  const cityNorm = normalizeMailerAddressValue(city);
  const stateNorm = normalizeMailerAddressValue(stateVal);
  const zipNorm = normalizeMailerAddressValue(zip);
  const tails = [];
  if(cityNorm && stateNorm && zipNorm){
    tails.push(`${cityNorm}, ${stateNorm}, ${zipNorm}`);
    tails.push(`${cityNorm}, ${stateNorm} ${zipNorm}`);
    tails.push(`${cityNorm} ${stateNorm} ${zipNorm}`);
  }
  if(cityNorm && stateNorm){
    tails.push(`${cityNorm}, ${stateNorm}`);
    tails.push(`${cityNorm} ${stateNorm}`);
  }
  for(const tail of tails.filter(Boolean)){
    const pattern = new RegExp(`(?:,?\\s*)${escapeMailerAddressRegex(tail)}\\s*$`, 'i');
    if(pattern.test(output)){
      output = output.replace(pattern, '').replace(/[\s,]+$/, '').trim();
      break;
    }
  }
  return output;
}
function splitMailerStreetAndUnit(value){
  const normalized = normalizeMailerAddressValue(value);
  if(!normalized) return { line1: '', line2: '' };
  const unitMatch = normalized.match(/^(.*?)(?:,?\s+)(Suite|Ste\.?|Unit|Apt\.?|Apartment|Bldg\.?|Building|Fl\.?|Floor|#)\s*([^,]+)$/i);
  if(unitMatch){
    return {
      line1: normalizeMailerAddressValue(unitMatch[1]),
      line2: normalizeMailerAddressValue(`${unitMatch[2]} ${unitMatch[3]}`)
    };
  }
  return { line1: normalized, line2: '' };
}
function formatMailerRawAddress(rawValue){
  const normalized = normalizeMailerAddressValue(rawValue);
  if(!normalized) return '';
  if(normalized.includes('\n')){
    const lines = [];
    normalized.split('\n').map(part => normalizeMailerAddressValue(part)).filter(Boolean).forEach(line => {
      if(!lines.some(existing => existing.toLowerCase() === line.toLowerCase())) lines.push(line);
    });
    return lines.join('\n');
  }
  const commaParts = normalized.split(',').map(part => normalizeMailerAddressValue(part)).filter(Boolean);
  if(commaParts.length >= 4){
    const streetLine = commaParts.slice(0, -3).join(', ');
    const localityLine = [commaParts[commaParts.length - 3], [commaParts[commaParts.length - 2], commaParts[commaParts.length - 1]].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return [streetLine, localityLine].filter(Boolean).join('\n');
  }
  if(commaParts.length === 3){
    return [commaParts[0], `${commaParts[1]}, ${commaParts[2]}`].filter(Boolean).join('\n');
  }
  return normalized;
}
function getBackendMailerPostalAddress(companyId){
  const company = getCompanyById(companyId);
  const props = company?.properties || {};
  const root = company || {};
  const local = getCompanyState(companyId) || {};

  const streetSource = normalizeMailerAddressValue(
    root.address1 ||
    root.address_1 ||
    root.street ||
    root.streetAddress ||
    root.street_address ||
    root.address ||
    root.mailingAddress ||
    root.mailing_address ||
    props.address1 ||
    props.address_1 ||
    props.address ||
    props.hs_address ||
    props.street ||
    props.street_address ||
    props.mailingAddress ||
    props.mailing_address ||
    ''
  );
  const line2Source = normalizeMailerAddressValue(
    root.address2 ||
    root.address_2 ||
    root.street2 ||
    root.street_2 ||
    root.suite ||
    root.unit ||
    props.address2 ||
    props.address_2 ||
    props.hs_address_2 ||
    props.street2 ||
    props.street_2 ||
    props.suite ||
    props.unit ||
    ''
  );
  const city = normalizeMailerAddressValue(root.city || props.city || props.hs_city || '');
  const stateVal = normalizeMailerAddressValue(root.state || root.stateCode || props.state || props.hs_state || '');
  const zip = normalizeMailerAddressValue(root.zip || root.postalCode || root.postal_code || props.zip || props.postalCode || props.postal_code || props.hs_postal_code || '');
  const cityStateZip = [city, [stateVal, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ').trim();

  const rawFullCandidates = [
    local.companyAddress,
    root.fullAddress,
    root.full_address,
    props.fullAddress,
    props.full_address,
    root.address,
    root.mailingAddress,
    root.mailing_address,
    props.address,
    props.hs_address,
    props.mailingAddress,
    props.mailing_address
  ].map(normalizeMailerAddressValue).filter(Boolean);

  const detectedRawFull = rawFullCandidates.find(value => looksLikeMailerFullAddress(value, city, stateVal, zip)) || '';
  const cleanedStreet = stripMailerTrailingLocality(streetSource, city, stateVal, zip);
  const streetParts = splitMailerStreetAndUnit(cleanedStreet || streetSource);
  const mergedLine2Parts = [line2Source, streetParts.line2].filter(Boolean);
  const mergedLine2 = mergedLine2Parts.filter((value, index, arr) => arr.findIndex(item => item.toLowerCase() === value.toLowerCase()) === index).join('\n');
  const structuredLines = [streetParts.line1, mergedLine2, cityStateZip].filter(Boolean);

  if(streetParts.line1 && cityStateZip){
    return structuredLines.join('\n');
  }
  if(detectedRawFull){
    return formatMailerRawAddress(detectedRawFull);
  }
  if(structuredLines.length){
    return structuredLines.join('\n');
  }
  return formatMailerRawAddress(local.companyAddress || root.fullAddress || root.full_address || props.fullAddress || props.full_address || '');
}
function getBackendPrimaryContactName(companyId){
  const company = getCompanyById(companyId);
  const props = company?.properties || {};
  const root = company || {};
  const local = getCompanyState(companyId) || {};
  const first = String(
    local.contactFirst ||
    root.firstName || root.firstname || root.contactFirst || root.contact_first ||
    props.firstname || props.first_name || props.contact_first_name || props.hs_contact_firstname || ''
  ).trim();
  const last = String(
    local.contactLast ||
    root.lastName || root.lastname || root.contactLast || root.contact_last ||
    props.lastname || props.last_name || props.contact_last_name || props.hs_contact_lastname || ''
  ).trim();
  const full = [first, last].filter(Boolean).join(' ').trim();
  const namedFallback = String(
    local.primaryContact ||
    root.primaryContact || root.primary_contact || root.contactName || root.contact_name ||
    props.primary_contact || props.contact_name || props.hs_primary_contact || ''
  ).trim();
  return full || namedFallback || 'Not available';
}
function getMailerTemplateDisplay(companyId, options = {}){
  const explicitLabel = String(options.templateLabel || '').trim();
  if(explicitLabel) return explicitLabel;
  const explicitKey = String(options.templateKey || '').trim();
  if(explicitKey) return getTemplateOptionLabel(MAILER_TEMPLATE_OPTIONS, explicitKey, explicitKey.charAt(0).toUpperCase() + explicitKey.slice(1));
  const zeroIndex = Number(options.touchIndex);
  if(Number.isInteger(zeroIndex) && zeroIndex >= 0){
    const descriptor = getTouchTemplateDescriptor(companyId, zeroIndex);
    const descriptorLabel = String(descriptor?.templateLabel || '').trim();
    if(descriptorLabel) return descriptorLabel;
    const descriptorKey = String(descriptor?.templateKey || '').trim();
    if(descriptorKey) return getTemplateOptionLabel(MAILER_TEMPLATE_OPTIONS, descriptorKey, descriptorKey.charAt(0).toUpperCase() + descriptorKey.slice(1));
  }
  return '';
}
function closeMailerReviewModal(){
  const els = getMailerReviewElements();
  if(!els.backdrop) return;
  els.backdrop.classList.remove('open');
  els.backdrop.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('calendar-modal-open');
}
async function openMailerReviewModal(companyId, options = {}){
  const els = getMailerReviewElements();
  if(!els.backdrop) return false;
  const company = getCompanyById(companyId);
  const companyName = String(company?.properties?.name || 'Mailer Review').trim();
  if(els.title) els.title.textContent = options.touchTitle || 'Mailer Review';
  if(els.sub) els.sub.textContent = companyName;
  if(els.contact) els.contact.textContent = getBackendPrimaryContactName(companyId) || 'Not available';
  if(els.address) els.address.textContent = getBackendMailerPostalAddress(companyId) || 'No mailing address on file.';
  if(els.templateName){
    const templateLabel = getMailerTemplateDisplay(companyId, options);
    els.templateName.textContent = templateLabel || '';
    els.templateName.style.display = templateLabel ? '' : 'none';
  }
  els.backdrop.classList.add('open');
  els.backdrop.setAttribute('aria-hidden', 'false');
  document.body.classList.add('calendar-modal-open');

  const initialContact = getBackendPrimaryContactName(companyId);
  if(initialContact === 'Not available'){
    try{
      await loadPrimaryContact(companyId);
    } catch {}
    const refreshedContact = getBackendPrimaryContactName(companyId);
    if(els.contact && els.backdrop.classList.contains('open')){
      els.contact.textContent = refreshedContact || 'Not available';
    }
  }
  return true;
}
function initMailerReviewModal(){
  const els = getMailerReviewElements();
  if(!els.backdrop || els.backdrop.dataset.bound === 'true') return;
  els.backdrop.dataset.bound = 'true';
  els.closeBtns.forEach(btn => btn.addEventListener('click', closeMailerReviewModal));
  els.backdrop.addEventListener('click', (event) => {
    if(event.target === els.backdrop) closeMailerReviewModal();
  });
  document.addEventListener('keydown', (event) => {
    if(event.key === 'Escape' && els.backdrop.classList.contains('open')) closeMailerReviewModal();
  });
}
window.openMailerReviewModal = openMailerReviewModal;
window.closeMailerReviewModal = closeMailerReviewModal;

function hasCompletedAnyTouch(companyId){
const history = Array.isArray(getProspectingState(companyId)?.touch_history) ? getProspectingState(companyId).touch_history : [];
return history.some(item => Number(item?.index) > 0);
}
function getCompanyDueDateKeyForSort(company){
const prospecting = company?.prospecting || {};
const propertyDue = String(company?.properties?.prospecting_due_date || '').trim().slice(0, 10);
const directDue = String(prospecting?.next_touch_due_at || '').trim().slice(0, 10);
const keyedDue = String(prospecting?.due_date_key || '').trim().slice(0, 10);
return keyedDue || directDue || propertyDue || '';
}
function getCompanyDueDateSortValueForList(company){
const date = parseLocalDate(getCompanyDueDateKeyForSort(company));
if (!date) return Number.MAX_SAFE_INTEGER;
date.setHours(0,0,0,0);
return date.getTime();
}
function compareCompaniesByDueDateForList(a, b){
const aRawDue = getCompanyDueDateKeyForSort(a);
const bRawDue = getCompanyDueDateKeyForSort(b);
const aHasDue = !!aRawDue;
const bHasDue = !!bRawDue;
if(aHasDue !== bHasDue) return aHasDue ? 1 : -1;
const aDue = aHasDue ? getCompanyDueDateSortValueForList(a) : Number.MIN_SAFE_INTEGER;
const bDue = bHasDue ? getCompanyDueDateSortValueForList(b) : Number.MIN_SAFE_INTEGER;
if(aDue !== bDue) return aDue - bDue;
const aName = (a?.properties?.name || '').toLowerCase();
const bName = (b?.properties?.name || '').toLowerCase();
return aName.localeCompare(bName);
}
function sortCompaniesForList(companies){
const sortValue = ["dueDate","temp","new","untouched"].includes(String(ui.sortBox?.value || "dueDate")) ? String(ui.sortBox?.value || "dueDate") : "dueDate";
const filtered = [...companies];
filtered.sort((a,b) => {
const aPriority = getPriorityRank(getCompanyPriority(a.id));
const bPriority = getPriorityRank(getCompanyPriority(b.id));
const aName = (a.properties?.name || "").toLowerCase();
const bName = (b.properties?.name || "").toLowerCase();
const dueComparison = compareCompaniesByDueDateForList(a, b);
if(sortValue === "temp") return aPriority - bPriority || dueComparison || aName.localeCompare(bName);
if(sortValue === "new"){
const aIsNew = shouldShowNewBadge(a);
const bIsNew = shouldShowNewBadge(b);
if(aIsNew !== bIsNew) return aIsNew ? -1 : 1;
return dueComparison || aName.localeCompare(bName);
}
if(sortValue === "untouched"){
const aIsUntouched = shouldShowUntouchedBadge(a);
const bIsUntouched = shouldShowUntouchedBadge(b);
if(aIsUntouched !== bIsUntouched) return aIsUntouched ? -1 : 1;
return dueComparison || aName.localeCompare(bName);
}
return dueComparison || aName.localeCompare(bName);
});
return filtered;
}
function buildCompanySearchText(company){
return getCompanySearchHaystack(company);
}
function getCompanySearchHaystack(company){
const local = getCompanyState(company.id);
const props = company?.properties || {};
const parts = [
props.name,
props.domain,
props.phone,
props.website,
local.contactFirst,
local.contactLast,
`${local.contactFirst || ""} ${local.contactLast || ""}`.trim(),
local.email,
local.phone,
local.linkedin,
local.address,
local.city,
local.state,
local.zip
];
return parts.filter(Boolean).join(' ').toLowerCase();
}
function getPipelineCompanies(companies = []){
return (companies || []).filter(company => !isCompanyExcludedFromActive(company));
}
function getSearchFilteredCompanies(companies = []){
const q = String(ui.searchBox?.value || '').trim().toLowerCase();
const base = getPipelineCompanies(companies);
if(!q) return base;
return base.filter(company => buildCompanySearchText(company).includes(q));
}
function getVisibleCompanies(){
return sortCompaniesForList(getSearchFilteredCompanies(state.companies));
}
function getTodayFocusCompanies(){
return (getAllCompaniesForSelectedOwner() || []).filter(company => !isCompanyExcludedFromActive(company));
}
function getAllCompaniesForSelectedOwner(){
const selectedOwnerId = String(state.selectedOwnerId || '').trim();
if(!selectedOwnerId) return [];
return (state.companies || []).filter(company => {
const companyOwnerId = String(company?.properties?.hubspot_owner_id || '').trim();
const local = getCompanyState(company.id);
const localOwnerId = String(local?.hubspotOwnerId || local?.ownerId || '').trim();
return companyOwnerId === selectedOwnerId || localOwnerId === selectedOwnerId;
});
}
function getOwnerPipelineCounts(){
const companies = getAllCompaniesForSelectedOwner();
return companies.reduce((acc, company) => {
const exitState = getCompanyExitState(company);
acc.total += 1;
if(exitState === 'notInterested'){
acc.notInterested += 1;
} else if(exitState === 'nurture'){
acc.nurture += 1;
} else {
acc.active += 1;
}
return acc;
}, { total: 0, active: 0, notInterested: 0, nurture: 0 });
}
function scrollWorkspaceToTop(){
const headerEl = document.querySelector("header");
const targetEl = ui.workspacePanel || ui.detailShell || document.body;
const headerOffset = headerEl ? headerEl.getBoundingClientRect().height + 12 : 16;
const targetTop = window.scrollY + targetEl.getBoundingClientRect().top - headerOffset;
window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
const focusTarget = ui.detailShell || ui.workspacePanel;
if(focusTarget){
focusTarget.setAttribute("tabindex","-1");
requestAnimationFrame(() => focusTarget.focus({ preventScroll:true }));
}
}
function isMobileViewport(){
return window.matchMedia('(max-width: 980px)').matches;
}
let swipeFeedbackAudioUnlocked = false;
function ensureFeedbackAudio(){
try{
const AudioCtx = window.AudioContext || window.webkitAudioContext;
if(!AudioCtx) return null;
if(!statAudioCtx) statAudioCtx = new AudioCtx();
if(statAudioCtx.state === "suspended") statAudioCtx.resume();
swipeFeedbackAudioUnlocked = true;
return statAudioCtx;
}catch(_err){
return null;
}
}
function playSwipePremiumClick(direction = "next"){
try{
const ctx = ensureFeedbackAudio();
if(!ctx) return;
const now = ctx.currentTime;
const master = ctx.createGain();
master.gain.setValueAtTime(0.0001, now);
master.gain.exponentialRampToValueAtTime(0.16, now + 0.006);
master.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
master.connect(ctx.destination);
const click = ctx.createOscillator();
const clickGain = ctx.createGain();
click.type = "square";
click.frequency.setValueAtTime(direction === "next" ? 820 : 760, now);
click.frequency.exponentialRampToValueAtTime(direction === "next" ? 430 : 390, now + 0.018);
clickGain.gain.setValueAtTime(0.0001, now);
clickGain.gain.exponentialRampToValueAtTime(0.08, now + 0.003);
clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
click.connect(clickGain);
clickGain.connect(master);
click.start(now);
click.stop(now + 0.03);
const thump = ctx.createOscillator();
const thumpGain = ctx.createGain();
thump.type = "triangle";
thump.frequency.setValueAtTime(direction === "next" ? 118 : 108, now + 0.004);
thump.frequency.exponentialRampToValueAtTime(74, now + 0.05);
thumpGain.gain.setValueAtTime(0.0001, now + 0.002);
thumpGain.gain.exponentialRampToValueAtTime(0.05, now + 0.012);
thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
thump.connect(thumpGain);
thumpGain.connect(master);
thump.start(now + 0.003);
thump.stop(now + 0.065);
const noiseBuffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.02)), ctx.sampleRate);
const data = noiseBuffer.getChannelData(0);
for(let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
const noise = ctx.createBufferSource();
noise.buffer = noiseBuffer;
const noiseFilter = ctx.createBiquadFilter();
noiseFilter.type = "bandpass";
noiseFilter.frequency.setValueAtTime(direction === "next" ? 2100 : 1800, now);
noiseFilter.Q.value = 1.1;
const noiseGain = ctx.createGain();
noiseGain.gain.setValueAtTime(0.0001, now);
noiseGain.gain.exponentialRampToValueAtTime(0.022, now + 0.002);
noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
noise.connect(noiseFilter);
noiseFilter.connect(noiseGain);
noiseGain.connect(master);
noise.start(now);
noise.stop(now + 0.024);
}catch(e){
console.warn("Swipe feedback unavailable", e);
}
}
function triggerSwipeVibrate(){
try{
if(typeof navigator !== "undefined" && typeof navigator.vibrate === "function"){
navigator.vibrate(10);
}
}catch(_err){}
}
function triggerPremiumSwipeFeedback(direction = "next"){
const panel = ui && ui.workspacePanel;
if(panel){
panel.classList.remove('swipe-haptic-pop','swipe-click-next','swipe-click-prev');
void panel.offsetWidth;
panel.classList.add('swipe-haptic-pop', direction === 'next' ? 'swipe-click-next' : 'swipe-click-prev');
clearTimeout(triggerPremiumSwipeFeedback._panelTimer);
triggerPremiumSwipeFeedback._panelTimer = setTimeout(() => {
panel.classList.remove('swipe-haptic-pop','swipe-click-next','swipe-click-prev');
}, 220);
}
document.body.classList.remove('premium-haptic-tick');
void document.body.offsetWidth;
document.body.classList.add('premium-haptic-tick');
clearTimeout(triggerPremiumSwipeFeedback._bodyTimer);
triggerPremiumSwipeFeedback._bodyTimer = setTimeout(() => {
document.body.classList.remove('premium-haptic-tick');
}, 110);
playSwipePremiumClick(direction);
triggerSwipeVibrate();
}
/* --- Calendar modal (moved to reporting.js Phase 3) --- */
function formatCalendarIso(date){ return window.formatCalendarIso ? window.formatCalendarIso(date) : ''; }
function getCalendarTaskItemsByDate(){ return window.getCalendarTaskItemsByDate ? window.getCalendarTaskItemsByDate() : {}; }
function ensureCalendarWeekdays(){ if(window.ensureCalendarWeekdays) window.ensureCalendarWeekdays(); }
function setCalendarSelectedDate(iso){ if(window.setCalendarSelectedDate) window.setCalendarSelectedDate(iso); }
function shiftCalendarMonth(delta){ if(window.shiftCalendarMonth) window.shiftCalendarMonth(delta); }
function getCalendarItemTaskKind(item){ return window.getCalendarItemTaskKind ? window.getCalendarItemTaskKind(item) : ''; }
function renderCalendarModal(){ if(window.renderCalendarModal) window.renderCalendarModal(); }
function openCalendarTasksModal(){ if(window.openCalendarTasksModal) window.openCalendarTasksModal(); }
function closeCalendarTasksModal(){ if(window.closeCalendarTasksModal) window.closeCalendarTasksModal(); }
function syncViewToggleButtons(){
const isBoard = state.currentView !== "detail";
ui.actionBoardBtn?.classList.toggle("active", isBoard);
ui.companyDetailBtn?.classList.toggle("active", !isBoard);
}
function removeLegacyTopVerticalControl(){
document.querySelectorAll('.detailTopVerticalWrap, .detailVerticalSelectWrap, .detailVerticalWrap, .companyVerticalWrap').forEach(el => el.remove());
}
function setView(view, direction = "none"){
state.currentView = view;
syncViewToggleButtons();
setTimeout(removeLegacyTopVerticalControl,0);
const isBoardView = view === "board";
const isDetailView = view === "detail";
ui.actionBoardBtn.classList.toggle("active", isBoardView);
ui.companyDetailBtn.classList.toggle("active", isDetailView);
ui.focusBoard.classList.toggle("active", isBoardView);
ui.detailShell.classList.toggle("active", isDetailView);
ui.focusBoard.hidden = !isBoardView;
ui.detailShell.hidden = !isDetailView;
ui.focusBoard.setAttribute("aria-hidden", String(!isBoardView));
ui.detailShell.setAttribute("aria-hidden", String(!isDetailView));
ui.workspacePanel.classList.toggle("focusGlow", isBoardView);
if(window.matchMedia('(max-width: 980px)').matches){
ui.workspacePanel.classList.remove('view-swipe-next','view-swipe-prev');
if(direction === 'next' || direction === 'prev'){
void ui.workspacePanel.offsetWidth;
ui.workspacePanel.classList.add(direction === 'next' ? 'view-swipe-next' : 'view-swipe-prev');
clearTimeout(setView._animTimer);
setView._animTimer = setTimeout(() => {
ui.workspacePanel.classList.remove('view-swipe-next','view-swipe-prev');
}, 320);
}
}
}
function renderPriorityPills(companyId){
if(!companyId){
ui.detailMetaRow.style.display = "none";
return;
}
const priority = getCompanyPriority(companyId);
ui.detailMetaRow.style.display = "grid";
ui.priorityCurrentBtn.textContent = getPriorityLabel(priority);
ui.priorityCurrentBtn.className = `detailValueBtn ${priority}`;
ui.priorityCurrentBtn.style.cursor = "pointer";
if(ui.detailMetaRow) ui.detailMetaRow.style.cursor = "pointer";
ui.priorityMenu.querySelectorAll("[data-priority-option]").forEach(btn => {
btn.classList.toggle("active", btn.dataset.priorityOption === priority);
});
}
/* -- Workspace render helpers (moved to workspace.js Phase 5) -- */
function getActionItems(){ return window.getActionItems ? window.getActionItems() : []; }
function getActionIconSvg(k){ return window.getActionIconSvg ? window.getActionIconSvg(k) : ''; }
function getFocusInstructionKey(c,t){ return window.getFocusInstructionKey ? window.getFocusInstructionKey(c,t) : ''; }
function getFocusQueueOwnerKey(){ return window.getFocusQueueOwnerKey ? window.getFocusQueueOwnerKey() : ''; }
function getStoredFocusQueueOrder(){ return window.getStoredFocusQueueOrder ? window.getStoredFocusQueueOrder() : []; }
function setStoredFocusQueueOrder(ids){ if(window.setStoredFocusQueueOrder) window.setStoredFocusQueueOrder(ids); }
function sortFocusItemsByStoredOrder(items){ return window.sortFocusItemsByStoredOrder ? window.sortFocusItemsByStoredOrder(items) : items; }
function promoteCompanyToTopOfFocusQueue(id){ if(window.promoteCompanyToTopOfFocusQueue) window.promoteCompanyToTopOfFocusQueue(id); }
function getCompanyWebsiteUrl(c){ return window.getCompanyWebsiteUrl ? window.getCompanyWebsiteUrl(c) : ''; }
function getCompanyFaviconUrl(c){ return window.getCompanyFaviconUrl ? window.getCompanyFaviconUrl(c) : ''; }
function openCompanyWebsite(e,url){ if(window.openCompanyWebsite) window.openCompanyWebsite(e,url); }
function buildFocusCard(item,opts){ return window.buildFocusCard ? window.buildFocusCard(item,opts) : ''; }
function formatTouchTimestamp(v){ return window.formatTouchTimestamp ? window.formatTouchTimestamp(v) : ''; }
function isInCurrentMonth(v){ return window.isInCurrentMonth ? window.isInCurrentMonth(v) : false; }
function closeAllStatusMenus(){ if(window.closeAllStatusMenus) window.closeAllStatusMenus(); }
function closeAllTaskChangeMenus(){ if(window.closeAllTaskChangeMenus) window.closeAllTaskChangeMenus(); }
function closeAllEmailTemplateMenus(){ if(window.closeAllEmailTemplateMenus) window.closeAllEmailTemplateMenus(); }
function closeDetailSettingsMenu(){ if(window.closeDetailSettingsMenu) window.closeDetailSettingsMenu(); }
function closeAllFocusTaskChangeMenus(){ if(window.closeAllFocusTaskChangeMenus) window.closeAllFocusTaskChangeMenus(); }
function closeAllFocusTemplateMenus(){ if(window.closeAllFocusTemplateMenus) window.closeAllFocusTemplateMenus(); }

function showStatusFlash(container, message = 'Saved'){
if(!container) return;
const existing = container.querySelector('.statusFlash');
if(existing) existing.remove();
const flash = document.createElement('div');
flash.className = 'statusFlash';
flash.textContent = message;
container.appendChild(flash);
setTimeout(() => flash.remove(), 1250);
}
const MARKETING_HUBSPOT_OWNER_ID = "86189865";
function getCompanyExitState(companyOrId){
const companyId = typeof companyOrId === 'object' ? companyOrId?.id : companyOrId;
const company = typeof companyOrId === 'object' ? companyOrId : getCompanyById(companyId);
const local = getCompanyState(companyId);
const hubspotRawStatus = String(company?.properties?.prospecting_status || '').trim();
const hubspotNormalizedStatus = hubspotRawStatus ? normalizeStatusValue(hubspotRawStatus) : '';
if(hubspotRawStatus){
if(hubspotNormalizedStatus === 'research' || hubspotNormalizedStatus === 'activeOutreach' || hubspotNormalizedStatus === 'engaged'){
return '';
}
if(hubspotNormalizedStatus === 'nurture') return 'nurture';
if(hubspotNormalizedStatus === 'notInterested') return 'notInterested';
}
const normalizedLocalStatus = normalizeStatusValue(local?.status || '');
if(local?.exitState) return String(local.exitState);
if(normalizedLocalStatus === 'nurture') return 'nurture';
if(normalizedLocalStatus === 'notInterested') return 'notInterested';
return '';
}
function isCompanyExcludedFromActive(companyOrId){
const exitState = getCompanyExitState(companyOrId);
return exitState === 'nurture' || exitState === 'notInterested';
}
async function exitCompanyFromSeries(companyId, exitState){
const normalizedExitState = normalizeStatusValue(exitState);
if(normalizedExitState !== 'nurture' && normalizedExitState !== 'notInterested') return false;
const local = getCompanyState(companyId);
local.exitState = normalizedExitState;
local.exitLabel = getStatusLabel(normalizedExitState);
local.exitAt = new Date().toISOString();
local.status = normalizedExitState;
local.statusUpdatedAt = local.exitAt;
queueCompanyStateSave(companyId, { delay: 50 });
const company = state.companies.find(c => String(c.id) === String(companyId));
if(company){
company.properties = company.properties || {};
company.properties.prospecting_status = normalizedExitState;
if(normalizedExitState === 'nurture'){
company.properties.hubspot_owner_id = MARKETING_HUBSPOT_OWNER_ID;
}
}
if(String(state.focusCompanyId) === String(companyId)) state.focusCompanyId = '';
if(String(state.pinnedCompanyId) === String(companyId)) state.pinnedCompanyId = '';
if(String(state.selectedCompanyId) === String(companyId)){
state.selectedCompanyId = window.WorkspaceDoor?.getDefaultDetailCompanyId?.() || '';
}
renderProspectList();
CQBus.emit('render:detail');
renderLeaderboard();
CQBus.emit('render:board');
updateProgress();
renderWeeklyStats();
const ok = await updateStatusInHubSpot(
companyId,
normalizedExitState,
normalizedExitState === 'nurture' ? { hubspotOwnerId: MARKETING_HUBSPOT_OWNER_ID } : {}
);
if(!ok){
ui.sidebarStatus.textContent = normalizedExitState === 'nurture'
? 'Nurture sync failed in HubSpot'
: 'Not Interested sync failed in HubSpot';
return false;
}
return true;
}
async function applyCompanyStatusChange(companyId, status, options = {}){
const { flashContainer = null } = options;
const normalizedStatus = normalizeStatusValue(status);
if(normalizedStatus === "nurture"){
const exited = await exitCompanyFromSeries(companyId, "nurture");
if(exited && flashContainer) showStatusFlash(flashContainer, 'Saved');
return exited;
}
if(normalizedStatus === "notInterested"){
const exited = await exitCompanyFromSeries(companyId, "notInterested");
if(exited && flashContainer) showStatusFlash(flashContainer, 'Saved');
return exited;
}
const local = getCompanyState(companyId);
local.exitState = "";
local.exitLabel = "";
local.exitAt = "";
local.status = normalizeStatusValue(status);
if(!local.priority || (local.priority === "cold" && normalizedStatus === "engaged") || (local.priority === "cold" && normalizedStatus === "activeOutreach")){
local.priority = getDefaultPriority({ status: normalizedStatus, priority: local.priority });
}
local.statusUpdatedAt = new Date().toISOString();
queueCompanyStateSave(companyId);
const company = state.companies.find(c => c.id === companyId);
if(company){
company.properties = company.properties || {};
company.properties.prospecting_status = normalizeStatusValue(status);
}
renderProspectList();
if(state.selectedCompanyId === companyId){
renderStatusPills(companyId);
CQBus.emit('render:detail');
}
renderLeaderboard();
CQBus.emit('render:board');
updateProgress();
renderWeeklyStats();
if(flashContainer) showStatusFlash(flashContainer, 'Saved');
const ok = await updateStatusInHubSpot(companyId, status);
if(!ok){
ui.sidebarStatus.textContent = 'Status update failed to sync';
return false;
}
return true;
}
function getCompanyScore(companyId){
const local = getCompanyState(companyId);
const template = getTouchTemplate(companyId);
const touchPoints = template.reduce((sum, touch, index) => {
return sum + (isTouchChecked(companyId, index) && isInCurrentMonth(getTouchTimestamp(companyId, index)) ? touch.points : 0);
}, 0);
const engagedBonus = local.status === "engaged" && isInCurrentMonth(local.statusUpdatedAt) ? 5 : 0;
const completionBonus = template.length && isTouchChecked(companyId, template.length - 1) && isInCurrentMonth(getTouchTimestamp(companyId, template.length - 1)) ? 5 : 0;
const completedTouchesThisMonth = template.reduce((sum, _touch, index) => {
return sum + (isTouchChecked(companyId, index) && isInCurrentMonth(getTouchTimestamp(companyId, index)) ? 1 : 0);
}, 0);
return {
total: touchPoints + engagedBonus + completionBonus,
touchPoints,
engagedBonus,
completionBonus,
completedTouches: completedTouchesThisMonth
};
}
function getOwnerScores(){
const totals = {};
const selectedOwnerId = String(state.selectedOwnerId || '').trim();
const companies = selectedOwnerId ? getAllCompaniesForSelectedOwner() : (state.companies || []);
companies.forEach(company => {
const ownerId = selectedOwnerId || String(company?.properties?.hubspot_owner_id || getCompanyState(company.id)?.hubspotOwnerId || getCompanyState(company.id)?.ownerId || "");
if(!ownerId) return;
totals[ownerId] = (totals[ownerId] || 0) + getCompanyScore(company.id).total;
});
return totals;
}
function renderLeaderboard(){}
function buildTaskChangeOptionsMarkup(companyId, touchIndex){
const overrideType = getTouchOverrideType(companyId, touchIndex);
const changeTaskOptions = TASK_CHANGE_OPTIONS.map(option => `
<button class="focusTaskChangeOption ${overrideType === option.value ? 'active' : ''}" type="button" data-focus-task-type="${option.value}" data-focus-company="${escapeHtml(companyId)}" data-focus-index="${touchIndex}"><span class="taskTypeIcon">${escapeHtml(TASK_TYPE_CONFIG[option.value].icon)}</span><span>${escapeHtml(option.label)}</span></button>
`).join('');
const resetOption = overrideType
? `<button class="focusTaskChangeOption reset" type="button" data-focus-task-type="" data-focus-company="${escapeHtml(companyId)}" data-focus-index="${touchIndex}"><span class="taskTypeIcon">↺</span><span>Reset to Default</span></button>`
: "";
return `${changeTaskOptions}${resetOption}`;
}
function buildTemplateSelectionOptionsMarkup(companyId, touchIndex){
const templateDescriptor = getTouchTemplateDescriptor(companyId, touchIndex);
if(!templateDescriptor?.taskType || templateDescriptor.taskType === 'detail') return "";
if(templateDescriptor.taskType === 'email'){
const ownerIdForTouch = state.selectedOwnerId || 'default';
const selectedKey = getCompanyTouchTemplateSelection(companyId, touchIndex) || getCadenceStepTemplateSelection(companyId, touchIndex) || getOwnerEmailTemplateSelection(ownerIdForTouch, touchIndex);
return getAllEmailTemplateOptions(ownerIdForTouch, touchIndex)
.filter(option => option.value !== 'default')
.map(option => `
<button class="focusTaskChangeOption ${selectedKey === option.value ? 'activeTemplate' : ''}" type="button" data-focus-email-template="${option.value}" data-focus-company="${escapeHtml(companyId)}" data-focus-index="${touchIndex}"><span class="taskTypeIcon">✉</span><span>${escapeHtml(option.label)}</span></button>
`).join('');
}
if(templateDescriptor.taskType === 'mailer'){
const selectedKey = getCompanyTouchTemplateSelection(companyId, touchIndex) || getCadenceStepTemplateSelection(companyId, touchIndex) || inferMailerTemplateKeyFromTouchTitle((getEffectiveTouch(companyId, touchIndex) || getTouchTemplate(companyId)[touchIndex])?.title || "");
return MAILER_TEMPLATE_OPTIONS.map(option => `
<button class="focusTaskChangeOption ${selectedKey === option.value ? 'activeTemplate' : ''}" type="button" data-focus-mailer-template="${option.value}" data-focus-company="${escapeHtml(companyId)}" data-focus-index="${touchIndex}"><span class="taskTypeIcon">📬</span><span>${escapeHtml(option.label)}</span></button>
`).join('');
}
return "";
}
function getCleanTouchTitle(touch, fallbackIndex){
const rawTitle = String(touch?.title || `Touch ${fallbackIndex + 1}`);
return rawTitle.replace(/^Touch\s+\d+\s+[—-]\s+/, '').trim();
}
function getCalendarBadgeParts(dueDateIso){
const iso = String(dueDateIso || "").slice(0, 10);
if(!iso){
return { month: "SET", day: "--", meta: "", isEmpty: true };
}
const parsed = parseLocalDate(iso);
if(!(parsed instanceof Date) || Number.isNaN(parsed.getTime())){
return { month: "SET", day: "--", meta: "", isEmpty: true };
}
return {
month: parsed.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
day: String(parsed.getDate()),
meta: String(parsed.getFullYear()),
isEmpty: false
};
}
function getCalendarBadgeMarkup(dueDateIso, options = {}){
const parts = getCalendarBadgeParts(dueDateIso);
const wrapClass = options.wrapClass || "calendarBadgeTrigger dueInlineRow";
const inputId = options.inputId ? ` id="${escapeHtml(options.inputId)}"` : "";
const inputName = options.inputName ? ` name="${escapeHtml(options.inputName)}"` : "";
const inputAttrs = options.inputAttrs ? ` ${options.inputAttrs}` : "";
const ariaLabel = escapeHtml(options.ariaLabel || "Set due date");
return `
<button class="${wrapClass}" type="button" aria-label="${ariaLabel}"><div class="calendarBadge"><div class="calendarBadgeTop"><div class="calendarBadgeMonth">${escapeHtml(parts.month)}</div></div><div class="calendarBadgeDay">${escapeHtml(parts.day)}</div><div class="calendarBadgeMeta${parts.isEmpty ? " is-empty" : ""}">${escapeHtml(parts.meta)}</div></div><span class="calendarBadgeInputWrap"><input class="input dueDateInput calendarBadgeInput"${inputId}${inputName} type="date" value="${escapeHtml(String(dueDateIso || "").slice(0, 10))}"${inputAttrs}></span></button>
`;
}
function syncDetailCalendarBadge(companyId){
const dueDateIso = getBackendDueDateIso(companyId) || "";
const parts = getCalendarBadgeParts(dueDateIso);
if(ui.detailCalendarBadgeMonth) ui.detailCalendarBadgeMonth.textContent = parts.month;
if(ui.detailCalendarBadgeDay) ui.detailCalendarBadgeDay.textContent = parts.day;
if(ui.detailCalendarBadgeMeta){
ui.detailCalendarBadgeMeta.textContent = parts.meta;
ui.detailCalendarBadgeMeta.classList.toggle("is-empty", parts.isEmpty);
}
if(ui.detailCalendarBadge){
ui.detailCalendarBadge.setAttribute("aria-label", parts.isEmpty ? "Set due date" : `Due date ${parts.month} ${parts.day}, ${parts.meta}`);
}
if(ui.dueDateInput) ui.dueDateInput.value = dueDateIso;
}

function syncDetailActionButtons(){
const calendarFieldStyles = {
  width: '52px',
  height: '52px',
  minWidth: '52px',
  minHeight: '52px',
  borderRadius: '16px',
  border: '1px solid rgba(91,161,214,.30)',
  background: 'linear-gradient(180deg, rgba(20,45,93,.96), rgba(10,27,60,.98))',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 10px 24px rgba(0,0,0,.18), 0 0 0 1px rgba(11,135,224,.06)',
  display: 'grid',
  placeItems: 'center',
  padding: '0',
  overflow: 'hidden',
  flex: '0 0 auto'
};
const cadenceFieldStyles = {
  width: '44px',
  height: '44px',
  minWidth: '44px',
  minHeight: '44px',
  borderRadius: '14px',
  border: '1px solid rgba(91,161,214,.26)',
  background: 'linear-gradient(180deg, rgba(20,45,93,.92), rgba(10,27,60,.96))',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 8px 20px rgba(0,0,0,.16), 0 0 0 1px rgba(11,135,224,.05)',
  display: 'grid',
  placeItems: 'center',
  padding: '0',
  overflow: 'hidden',
  flex: '0 0 auto'
};
const innerBtnStyles = {
  width: '100%',
  height: '100%',
  border: '0',
  background: 'transparent',
  boxShadow: 'none',
  padding: '0',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer'
};

const calendarField = ui.dueDateField || document.getElementById('dueDateField');
const calendarBtn = ui.detailCalendarBadge || document.getElementById('detailCalendarBadge');
const calendarMonth = ui.detailCalendarBadgeMonth || document.getElementById('detailCalendarBadgeMonth');
const calendarDay = ui.detailCalendarBadgeDay || document.getElementById('detailCalendarBadgeDay');
const calendarMeta = ui.detailCalendarBadgeMeta || document.getElementById('detailCalendarBadgeMeta');
const focusRow = document.getElementById('detailFocusRow');
const detailVerticalPill = ensureDetailVerticalPill();

let cadenceField = document.getElementById('detailCadenceViewField');
let cadenceBtn = document.getElementById('detailCadenceViewBtn');
let cadenceImg = cadenceBtn ? cadenceBtn.querySelector('img') : null;

if(!cadenceField){
  cadenceField = document.createElement('div');
  cadenceField.id = 'detailCadenceViewField';
  cadenceField.className = 'detailCadenceViewField';
  cadenceField.innerHTML = `<button class="btn iconBtn detailCadenceViewBtn" id="detailCadenceViewBtn" type="button" aria-label="Choose company cadence" title="Choose company cadence"><img alt="" src="/QueueSelector.png"></button>`;
}
if(focusRow && cadenceField.parentElement !== focusRow){
  if(detailVerticalPill && detailVerticalPill.parentElement === focusRow){
    focusRow.insertBefore(cadenceField, detailVerticalPill);
  } else {
    focusRow.appendChild(cadenceField);
  }
}

if(calendarField){
  Object.assign(calendarField.style, calendarFieldStyles);
  calendarField.style.display = 'flex';
  calendarField.style.alignItems = 'center';
  calendarField.style.justifyContent = 'center';
  calendarField.style.position = 'relative';
  calendarField.style.margin = '0';
  calendarField.style.flex = '0 0 auto';
  calendarField.style.alignSelf = 'flex-end';
  calendarField.style.transform = 'none';
}
if(calendarBtn){
  Object.assign(calendarBtn.style, innerBtnStyles);
}
if(calendarMonth){
  calendarMonth.style.fontSize = '9px';
  calendarMonth.style.letterSpacing = '.12em';
}
if(calendarDay){
  calendarDay.style.fontSize = '16px';
  calendarDay.style.lineHeight = '1';
}
if(calendarMeta){
  calendarMeta.style.fontSize = '0';
  calendarMeta.style.minHeight = '0';
  calendarMeta.style.margin = '0';
}

if(cadenceField){
  cadenceField.classList.add('detailCadenceViewField--queueSelector');
  cadenceField.style.display = 'flex';
  cadenceField.style.alignItems = 'center';
  cadenceField.style.justifyContent = 'center';
  cadenceField.style.position = 'relative';
  cadenceField.style.margin = '0';
  cadenceField.style.flex = '0 0 auto';
  cadenceField.style.alignSelf = 'center';
  cadenceField.style.transform = 'none';
  Object.assign(cadenceField.style, cadenceFieldStyles);
}
if(cadenceBtn){
  cadenceBtn.type = 'button';
  cadenceBtn.setAttribute('aria-label', 'Choose company cadence');
  cadenceBtn.setAttribute('title', 'Choose company cadence');
  cadenceBtn.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openDetailCadencePicker(cadenceBtn, state.selectedCompanyId || '');
  };
  Object.assign(cadenceBtn.style, innerBtnStyles);
}
if(cadenceImg){
  cadenceImg.setAttribute('src', '/QueueSelector.png');
  cadenceImg.style.width = '24px';
  cadenceImg.style.height = '24px';
  cadenceImg.style.objectFit = 'contain';
  cadenceImg.style.display = 'block';
}
}

function closeDetailCadencePicker(){
const existing = document.getElementById('detailCadencePickerMenu');
if(existing) existing.remove();
document.removeEventListener('click', handleDetailCadencePickerOutsideClick, true);
window.removeEventListener('resize', closeDetailCadencePicker);
window.removeEventListener('scroll', closeDetailCadencePicker, true);
}
function handleDetailCadencePickerOutsideClick(event){
const menu = document.getElementById('detailCadencePickerMenu');
if(!menu) return;
if(menu.contains(event.target)) return;
if(event.target && event.target.closest && event.target.closest('#detailCadenceViewBtn')) return;
closeDetailCadencePicker();
}
function openDetailCadencePicker(anchorEl, companyId){
const normalizedCompanyId = String(companyId || state.selectedCompanyId || '').trim();
if(!anchorEl || !normalizedCompanyId) return;
const templates = Array.isArray(state.cadenceDesigner?.templates) ? state.cadenceDesigner.templates.slice() : [];
if(!templates.length){
  showToast('No cadence templates loaded yet', { type: 'error' });
  return;
}
closeDetailCadencePicker();
const assignedTemplateId = getAssignedCadenceTemplateId(normalizedCompanyId);
const globalDefaultId = String(state.cadenceDesigner?.globalDefaultTemplateId || 'global-default').trim();
const menu = document.createElement('div');
menu.id = 'detailCadencePickerMenu';
menu.className = 'detailCadencePickerMenu';
const options = ['<option value="">Use Global Default</option>'].concat(templates.map((template) => {
  const templateId = String(template?.id || '').trim();
  const label = String(template?.name || templateId || 'Untitled Template').trim();
  const suffix = templateId === globalDefaultId ? ' • Global Default' : '';
  return `<option value="${escapeHtml(templateId)}"${templateId === assignedTemplateId ? ' selected' : ''}>${escapeHtml(label + suffix)}</option>`;
}));
menu.innerHTML = `
  <div class="detailCadencePickerHead">
    <div class="detailCadencePickerTitle">Company Cadence</div>
    <button class="detailCadencePickerClose" type="button" aria-label="Close cadence picker">×</button>
  </div>
  <div class="detailCadencePickerSub">Choose which cadence this company follows.</div>
  <label class="detailCadencePickerField">
    <span>Template</span>
    <select class="input detailCadencePickerSelect">${options.join('')}</select>
  </label>
`;
document.body.appendChild(menu);
const rect = anchorEl.getBoundingClientRect();
const menuWidth = 300;
const left = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.right - menuWidth));
menu.style.left = left + 'px';
menu.style.top = Math.min(window.innerHeight - menu.offsetHeight - 12, rect.bottom + 10) + 'px';
const select = menu.querySelector('.detailCadencePickerSelect');
const closeBtn = menu.querySelector('.detailCadencePickerClose');
if(closeBtn) closeBtn.addEventListener('click', closeDetailCadencePicker);
if(select){
  select.addEventListener('change', async function(event){
    try{
      await assignCadenceTemplateToCompany(normalizedCompanyId, event.target.value || '');
      closeDetailCadencePicker();
    } catch(error){
      showToast(error?.message || 'Failed to update cadence assignment', { type: 'error' });
    }
  });
  window.setTimeout(() => { try{ select.focus(); } catch(_){ } }, 0);
}
document.addEventListener('click', handleDetailCadencePickerOutsideClick, true);
window.addEventListener('resize', closeDetailCadencePicker);
window.addEventListener('scroll', closeDetailCadencePicker, true);
}

function buildCadenceAssignmentSelectMarkup(companyId){
const templates = Array.isArray(state.cadenceDesigner?.templates) ? state.cadenceDesigner.templates : [];
if(!templates.length) return '';
const assignedTemplateId = getAssignedCadenceTemplateId(companyId);
const globalDefaultId = String(state.cadenceDesigner?.globalDefaultTemplateId || 'global-default').trim();
const options = ['<option value="">Use Global Default</option>']
  .concat(templates.map(template => {
    const templateId = String(template?.id || '').trim();
    const label = String(template?.name || templateId || 'Untitled Template').trim();
    const suffix = templateId === globalDefaultId ? ' • Global Default' : '';
    return `<option value="${escapeHtml(templateId)}"${templateId === assignedTemplateId ? ' selected' : ''}>${escapeHtml(label + suffix)}</option>`;
  }));
return `<label class="cadenceAssignmentField"><span class="cadenceAssignmentLabel">Cadence</span><select class="input cadenceAssignmentSelect" id="detailCadenceAssignmentSelect" data-cadence-assignment-company="${escapeHtml(companyId)}">${options.join('')}</select></label>`;
}
function renderCadenceAssignmentControl(companyId){
if(!ui.detailSettingsPanel) return;
let mount = document.getElementById('detailCadenceAssignmentMount');
if(!mount){
  mount = document.createElement('div');
  mount.id = 'detailCadenceAssignmentMount';
  mount.className = 'cadenceAssignmentMount';
  ui.detailSettingsPanel.insertAdjacentElement('afterbegin', mount);
}
const canAssign = !!companyId && isAdminUser() && Array.isArray(state.cadenceDesigner?.templates) && state.cadenceDesigner.templates.length;
if(!canAssign){
  mount.innerHTML = '';
  mount.style.display = 'none';
  return;
}
const assignedTemplate = getAssignedCadenceTemplate(companyId);
const assignedLabel = assignedTemplate?.name ? `Assigned: ${assignedTemplate.name}` : 'Using global default cadence';
mount.style.display = '';
mount.innerHTML = `<div class="detailSettingsPanelHead cadenceAssignmentHead"><div><div class="detailSettingsPanelTitle">Cadence Assignment</div><div class="detailSettingsPanelSub">Choose which cadence this company follows. ${escapeHtml(assignedLabel)}</div></div></div><div class="detailSettingsTemplateRow cadenceAssignmentRow">${buildCadenceAssignmentSelectMarkup(companyId)}</div>`;
const select = mount.querySelector('#detailCadenceAssignmentSelect');
if(select && !select.dataset.bound){
  select.dataset.bound = '1';
  select.addEventListener('change', async function(event){
    const targetCompanyId = String(event.target?.dataset?.cadenceAssignmentCompany || companyId || '').trim();
    if(!targetCompanyId) return;
    await assignCadenceTemplateToCompany(targetCompanyId, event.target.value || '');
  });
}
}
async function assignCadenceTemplateToCompany(companyId, templateId){
const normalizedCompanyId = String(companyId || '').trim();
if(!normalizedCompanyId) return;
const selectedTemplateId = String(templateId || '').trim();
const res = await fetch(`${API}/api/app/company/${encodeURIComponent(normalizedCompanyId)}/cadence-template`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ templateId: selectedTemplateId || null })
});
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!res.ok || !data.ok) throw new Error(data.message || 'Failed to update cadence assignment');
const company = getCompanyById(normalizedCompanyId);
if(company){
  company.prospecting = {
    ...(company.prospecting || {}),
    ...(data.prospecting || {}),
    template_id: String(data.prospecting?.template_id || '') || null
  };
}
  if(data.companyState){
    state.remote.companyStateById[normalizedCompanyId] = {
      ...getDefaultCompanyState(normalizedCompanyId),
      ...(data.companyState || {}),
      companyId: normalizedCompanyId
    };
  }
  renderDetailSummary(normalizedCompanyId);
  renderProspectList();
  CQBus.emit('render:detail');
  CQBus.emit('render:board');
  showAdvanceToast(selectedTemplateId ? 'Cadence Assigned' : 'Using Global Default');
}
function renderDetailSummary(companyId){
const local = getCompanyState(companyId);
const score = getCompanyScore(companyId);
const template = getTouchTemplate(companyId);
const fullName = `${local.contactFirst || ""} ${local.contactLast || ""}`.trim();
ui.detailContactHero.style.display = "grid";
ui.detailPrimaryName.textContent = fullName || "Primary contact not set";
const detailWebsiteBtn = document.getElementById("detailWebsiteIcon");
const detailWebsiteFavicon = document.getElementById("detailWebsiteFavicon");
const detailWebsiteHref = getCompanyWebsiteUrl(companyId);
const detailFaviconHref = getCompanyFaviconUrl(companyId);
if(detailWebsiteBtn && detailWebsiteFavicon){
if(detailWebsiteHref && detailFaviconHref){
detailWebsiteBtn.hidden = false;
detailWebsiteBtn.dataset.openWebsite = String(companyId);
detailWebsiteFavicon.onerror = function(){
  this.onerror = null;
  this.style.display = "none";
  if(detailWebsiteBtn) detailWebsiteBtn.hidden = true;
};
detailWebsiteFavicon.style.display = "";
detailWebsiteFavicon.src = detailFaviconHref;
detailWebsiteFavicon.alt = "";
} else {
detailWebsiteBtn.hidden = true;
detailWebsiteBtn.dataset.openWebsite = "";
detailWebsiteFavicon.removeAttribute("src");
}
}
ui.detailPrimaryEmail.innerHTML = local.email ? `<a href="mailto:${escapeHtml(local.email)}">${escapeHtml(local.email)}</a>` : "No email listed";
ui.detailPrimaryPhone.innerHTML = local.phone ? `<a href="tel:${escapeHtml(local.phone.replace(/[^\d+]/g,''))}">${escapeHtml(local.phone)}</a>` : "No phone listed";
ui.detailMailingAddress.innerHTML = getCompanyMailingAddressHtml(getCompanyById(companyId));
renderDetailEmailEngagement(companyId);
const detailVerticalPill = ensureDetailVerticalPill();
if(detailVerticalPill){
  detailVerticalPill.textContent = getCompanyVerticalLabel(companyId);
  detailVerticalPill.classList.toggle("is-empty", !getCompanyVertical(companyId));
}
if(ui.detailHotBadgeSlot){
const detailPriority = getCompanyPriority(companyId);
ui.detailHotBadgeSlot.innerHTML = detailPriority === "hot" ? getHotBadgeMarkup(detailPriority, "inline") : "";
}
const nextTouchIndex = getCurrentNextTouchZeroIndex(companyId);
if(ui.detailNextTouch){
if(nextTouchIndex === -1){
ui.detailNextTouch.textContent = "Completed";
if(ui.detailNextTouchTemplate){
ui.detailNextTouchTemplate.textContent = "";
ui.detailNextTouchTemplate.hidden = true;
}
} else {
const nextTouch = getEffectiveTouch(companyId, nextTouchIndex) || template[nextTouchIndex];
const nextTitle = getCleanTouchTitle(nextTouch, nextTouchIndex);
const templateDescriptor = getTouchTemplateDescriptor(companyId, nextTouchIndex);
ui.detailNextTouch.textContent = `${nextTouchIndex + 1} - ${nextTitle}`;
if(ui.detailNextTouchTemplate){
const compactTemplateLabel = getCompactTemplateLabel(templateDescriptor?.templateLabel || (String((nextTouch?.touch || nextTouch?.title || "")).toLowerCase().includes("mail") ? "Simple" : ""));
const templateMenu = buildTemplateSelectionOptionsMarkup(companyId, nextTouchIndex);
if(compactTemplateLabel && templateMenu){
ui.detailNextTouchTemplate.innerHTML = `<button class="tfTemplateBtn" type="button" data-focus-template-toggle="${escapeHtml(companyId)}" data-focus-index="${nextTouchIndex}" aria-label="Choose template">${escapeHtml(compactTemplateLabel)}</button><div class="focusTemplateMenu">${templateMenu}</div>`;
ui.detailNextTouchTemplate.hidden = false;
ui.detailNextTouchTemplate.title = String(templateDescriptor?.templateLabel || compactTemplateLabel || '');
} else {
ui.detailNextTouchTemplate.innerHTML = "";
ui.detailNextTouchTemplate.hidden = true;
ui.detailNextTouchTemplate.title = "";
}
}
}
}
if(ui.detailSettingsWrap){
ui.detailSettingsWrap.style.display = companyId ? 'flex' : 'none';
}
renderCadenceAssignmentControl(companyId);
renderDetailTemplateEditor();
if(ui.detailTaskChangeBtn && ui.detailTaskChangeMenu && ui.detailNextTouchRow){
ui.detailTaskChangeMenu.classList.remove("open");
ui.detailTaskChangeMenu.style.display = "";
ui.detailTaskChangeMenu.style.opacity = "";
ui.detailTaskChangeMenu.style.visibility = "";
if(nextTouchIndex === -1){
ui.detailTaskChangeBtn.style.display = "none";
ui.detailTaskChangeBtn.dataset.focusTaskToggle = "";
ui.detailTaskChangeBtn.dataset.focusIndex = "";
ui.detailTaskChangeMenu.innerHTML = "";
ui.detailNextTouchRow.classList.remove("taskSelectable");
} else {
ui.detailTaskChangeBtn.style.display = "grid";
ui.detailTaskChangeBtn.dataset.focusTaskToggle = String(companyId);
ui.detailTaskChangeBtn.dataset.focusIndex = String(nextTouchIndex);
ui.detailTaskChangeMenu.innerHTML = buildTaskChangeOptionsMarkup(companyId, nextTouchIndex);
ui.detailNextTouchRow.classList.add("taskSelectable");
}
}
const hasPendingDuePrompt = !!local.nextDuePrompt && nextTouchIndex !== -1;

if(hasPendingDuePrompt && ui.dueDateField && ui.dueDateField.contains(document.activeElement)){
try { document.activeElement.blur(); } catch(_) {}
}

if(ui.dueDateField){
ui.dueDateField.style.display = hasPendingDuePrompt ? "none" : "flex";
ui.dueDateField.inert = hasPendingDuePrompt;
ui.dueDateField.style.cursor = hasPendingDuePrompt ? "default" : "pointer";
}

ui.nextDuePrompt?.classList.toggle("active", hasPendingDuePrompt);

if(ui.nextDuePrompt){
ui.nextDuePrompt.inert = !hasPendingDuePrompt;
}

ui.nextDueCustomWrap?.classList.remove("active");
if(ui.nextDueCustomInput) ui.nextDueCustomInput.value = "";
if(ui.dueDateInput) ui.dueDateInput.value = getBackendDueDateIso(companyId) || "";
syncDetailCalendarBadge(companyId);
syncDetailActionButtons();

if(hasPendingDuePrompt){
requestAnimationFrame(() => {
ui.nextDueTodayBtn?.focus();
});
}
if(ui.detailNextTouchRow){
const nextTouchLabel = ui.detailNextTouch ? ui.detailNextTouch.textContent : "";
const inferredActionKind = inferActionKindFromNextTouchText(nextTouchLabel);
ui.detailNextTouchRow.dataset.touchActionRow = String(companyId);
ui.detailNextTouchRow.dataset.touchIndex = String(Math.max(nextTouchIndex, 0));
ui.detailNextTouchRow.dataset.actionKind = inferredActionKind;
ui.detailNextTouchRow.setAttribute("aria-label", nextTouchIndex === -1 ? "No next touch" : `Run ${inferredActionKind} action`);
}
const detailCompleteBtn = document.getElementById("detailCompleteBtn");
if(detailCompleteBtn){
detailCompleteBtn.dataset.completeTouch = nextTouchIndex === -1 ? "" : String(companyId);
detailCompleteBtn.style.display = nextTouchIndex === -1 ? "none" : "grid";
setAdvanceButtonVisualState(detailCompleteBtn, 'idle');
if(!detailCompleteBtn.dataset.bound){
detailCompleteBtn.addEventListener("click", async (e) => {
e.stopPropagation();
const cid = detailCompleteBtn.dataset.completeTouch;
if(!cid || detailCompleteBtn.disabled) return;
const idx = getCurrentNextTouchZeroIndex(cid);
if(idx === -1) return;
await runAdvanceCompletion(cid, idx, detailCompleteBtn);
});
detailCompleteBtn.dataset.bound = "1";
}
}
if(ui.detailFocusBtn){
const showFocus = isDueToday(companyId);
ui.detailFocusBtn.classList.toggle("active", showFocus);
ui.detailFocusBtn.style.display = showFocus ? "inline-flex" : "none";
ui.detailFocusBtn.dataset.companyId = showFocus ? String(companyId) : "";
ui.detailFocusBtn.setAttribute("aria-pressed", String(showFocus && String(state.focusCompanyId) === String(companyId)));
if(ui.detailActionBtn){ ui.detailActionBtn.style.display = "none"; }
}
}
let lastProgressOwnerId = null;
let lastProgressPoints = 0;
function updateProgress(){
if(!state.selectedOwnerId){
lastProgressOwnerId = null;
lastProgressPoints = 0;
ui.ownerProgressName.textContent = "";
ui.progressText.textContent = `0 pts`;
ui.progressText.classList.remove("progress-active", "pulse-boost", "progress-flash");
ui.progressText.style.boxShadow = "";
ui.progressText.style.borderColor = "";
ui.progressText.style.background = "";
state.remote.statsDebug = null;
renderStatsDebugLine();
return;
}
const owner = state.owners.find(o => String(o.id) === String(state.selectedOwnerId));
const ownerName = owner ? (owner.name || owner.email || "Owner") : "Owner";
const firstName = String(ownerName || '').trim().split(/\s+/)[0] || ownerName;
const pipelineCounts = getOwnerPipelineCounts();
ui.ownerProgressName.textContent = `${firstName}'s Prospects`;
if(ui.ownerProgressName){
ui.ownerProgressName.title = `Total: ${pipelineCounts.total} • Active: ${pipelineCounts.active} • Not Interested: ${pipelineCounts.notInterested} • Nurture: ${pipelineCounts.nurture}`;
}
const remoteStats = getSelectedOwnerRemoteStats();
const ownerPoints = Number(remoteStats.points ?? remoteStats.totalActivities ?? 0) || 0;
const pct = Math.min((ownerPoints / PROGRESS_VISUAL_MAX_POINTS) * 100, 100);
const previousPoints = String(lastProgressOwnerId) === String(state.selectedOwnerId) ? lastProgressPoints : ownerPoints;
ui.progressText.textContent = `${ownerPoints} pts`;
if(ownerPoints > 0){
ui.progressText.classList.add("progress-active");
const glowA = 0.07 + (pct / 100) * 0.08;
const glowB = 0.06 + (pct / 100) * 0.07;
ui.progressText.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,.14), inset 0 -6px 14px rgba(0,0,0,.12), 0 0 0 1px rgba(11,135,224,${glowA}), 0 0 ${8 + pct * 0.08}px rgba(11,135,224,${glowB}), 0 6px 14px rgba(0,0,0,.12)`;
ui.progressText.style.borderColor = `rgba(11,135,224,${0.16 + pct * 0.12})`;
ui.progressText.style.background = `linear-gradient(180deg, rgba(11,135,224,${0.11 + pct * 0.02}), rgba(11,135,224,${0.04 + pct * 0.015}))`;
} else {
ui.progressText.classList.remove("progress-active");
ui.progressText.style.boxShadow = "";
ui.progressText.style.borderColor = "";
ui.progressText.style.background = "";
}
if(ownerPoints > previousPoints){
ui.progressText.classList.remove("pulse-boost", "progress-flash");
void ui.progressText.offsetWidth;
ui.progressText.classList.add("pulse-boost", "progress-flash");
setTimeout(() => ui.progressText.classList.remove("pulse-boost"), 950);
setTimeout(() => ui.progressText.classList.remove("progress-flash"), 980);
}
lastProgressOwnerId = state.selectedOwnerId;
lastProgressPoints = ownerPoints;
}
function isMobileDrawerViewport(){
return window.innerWidth <= 980;
}
function renderSidebarState(){
if(!ui.sidebarPanel || !ui.mainGrid) return;
const sidebarCollapsed = isMobileDrawerViewport() ? state.sidebarCollapsed : false;
ui.sidebarPanel.classList.toggle("collapsed", sidebarCollapsed);
ui.mainGrid.classList.toggle("sidebar-collapsed", sidebarCollapsed);
ui.mainGrid.classList.toggle("sidebar-open", !sidebarCollapsed);
if(ui.sidebarToggleLabel) ui.sidebarToggleLabel.textContent = sidebarCollapsed ? "Show All Prospects" : "Hide Prospects";
if(ui.sidebarToggleBtn) ui.sidebarToggleBtn.textContent = sidebarCollapsed ? "⌃" : "⌄";
document.body.classList.toggle("mobile-drawer-open", isMobileDrawerViewport() && !sidebarCollapsed);
if(ui.mobileDrawerBackdrop) ui.mobileDrawerBackdrop.setAttribute("aria-hidden", String(sidebarCollapsed || !isMobileDrawerViewport()));
}
function toggleSidebar(){
if(!isMobileDrawerViewport()) return;
state.sidebarCollapsed = !state.sidebarCollapsed;
renderSidebarState();
}
function getPreferredSelectedOwnerId(){
const selectableOwners = getSelectableOwners();
const authOwnerId = String(state.authUser?.hubspotOwnerId || '').trim();
if(authOwnerId && selectableOwners.some(o => String(o.id) === authOwnerId)){
return authOwnerId;
}
const existingOwnerId = String(state.selectedOwnerId || '').trim();
if(existingOwnerId && selectableOwners.some(o => String(o.id) === existingOwnerId)){
return existingOwnerId;
}
const domOwnerValue = String(ui.ownerSelect?.value || '').trim();
if(domOwnerValue && selectableOwners.some(o => String(o.id) === domOwnerValue)){
return domOwnerValue;
}
const patricOwner = selectableOwners.find(o => String(o.name || o.email || "").toLowerCase().includes("patric beckman"));
if(patricOwner) return String(patricOwner.id);
if(selectableOwners.length) return String(selectableOwners[0].id);
return "";
}
function ensureOwnerPlainTextDisplay(){
if(!ui.ownerSelect?.parentElement) return null;
let display = document.getElementById("ownerPlainTextDisplay");
if(display) return display;
display = document.createElement("div");
display.id = "ownerPlainTextDisplay";
display.className = "input";
display.setAttribute("aria-live", "polite");
display.style.display = "none";
display.style.alignItems = "center";
display.style.padding = "0 14px";
display.style.fontWeight = "700";
display.style.cursor = "default";
display.style.userSelect = "text";
ui.ownerSelect.parentElement.appendChild(display);
return display;
}
function syncOwnerSelectorUi(){
const display = ensureOwnerPlainTextDisplay();
const lockedToAssignedOwner = !isAdminUser();
const selectedOwner = getSelectableOwners().find(owner => String(owner.id) === String(state.selectedOwnerId || ui.ownerSelect?.value || ""));
if(ui.ownerSelect){
ui.ownerSelect.disabled = lockedToAssignedOwner;
ui.ownerSelect.style.display = lockedToAssignedOwner ? "none" : "";
}
if(display){
if(lockedToAssignedOwner){
const ownerLabel = selectedOwner?.name || selectedOwner?.email || "Assigned owner";
display.textContent = ownerLabel;
display.style.display = "flex";
} else {
display.style.display = "none";
}
}
}
function renderOwners(){
const selectableOwners = getSelectableOwners();
ui.ownerSelect.innerHTML = '<option value="">Select company owner</option>' + selectableOwners.map(o=>`<option value="${o.id}">${escapeHtml(o.name||o.email)}</option>`).join("");
state.selectedOwnerId = getPreferredSelectedOwnerId();
if(state.selectedOwnerId) ui.ownerSelect.value = state.selectedOwnerId;
syncOwnerSelectorUi();
renderLeaderboard();
updateProgress();
renderWeeklyStats();
renderStatsDebugLine();
}
function renderProspectList(){
const STATUS_OPTIONS = window.STATUS_OPTIONS || [
  { value: "research", label: "Research", className: "research" },
  { value: "activeOutreach", label: "Active Outreach", className: "activeOutreach" },
  { value: "engaged", label: "Engaged", className: "engaged" },
  { value: "nurture", label: "Nurture", className: "nurture" },
  { value: "notInterested", label: "Not Interested", className: "research" }
];
ui.prospectList.innerHTML="";
if(!state.selectedOwnerId){
ui.prospectList.innerHTML='<div class="emptyState">Choose an owner to load assigned companies.</div>';
return;
}
const visibleCompanies = getVisibleCompanies();
if(!visibleCompanies.length){
state.prospectHasMore = false;
const hasSearch = !!String(ui.searchBox?.value || '').trim();
ui.prospectList.innerHTML = `<div class="emptyState">${state.loadingCompanies ? 'Loading companies...' : (hasSearch ? 'No companies match that search yet.' : 'No companies match this priority filter.')}</div>`;
return;
}
state.prospectHasMore = !!state.serverHasMore;
visibleCompanies.forEach(company=>{
const local=getCompanyState(company.id);
const fullName=`${local.contactFirst||""} ${local.contactLast||""}`.trim();
const nextIndex=getCurrentNextTouchZeroIndex(company.id);
const templateLength = getTouchTemplate(company.id).filter(touch => !touch?.isExtended).length || TOUCH_TEMPLATE.length;
const nextTouch=nextIndex>=0?`${nextIndex+1} / ${templateLength}`:"Done";
const statusValue=normalizeStatusValue(company.properties?.prospecting_status || local.status);
const score=getCompanyScore(company.id).total;
const priority = getCompanyPriority(company.id);
const statusMenu = STATUS_OPTIONS.map(option => `
<button class="statusMenuBtn ${option.className} ${option.value===statusValue ? 'active' : ''}" type="button" data-status-option="${option.value}">${option.label}</button>
`).join('');
const newBadge = shouldShowNewBadge(company) ? '<span class="newBadge">New</span>' : '';
const untouchedBadge = shouldShowUntouchedBadge(company) ? '<span class="untouchedBadge">Untouched</span>' : '';
const pastDueBadge = isCompanyPastDue(company.id) ? '<span class="pastDueBadge">Past Due</span>' : '';
const card=document.createElement("div");
card.className="cardRow"+(state.selectedCompanyId===company.id?" active":"");
const hotBadge = getHotBadgeMarkup(priority);
const websiteHref = getCompanyWebsiteUrl(company);
const badgeStack = (untouchedBadge || hotBadge || pastDueBadge) ? `<div class="badgeStack">${untouchedBadge}${hotBadge}${pastDueBadge}</div>` : '';
const topRightBadges = badgeStack || '';
card.innerHTML=`${newBadge}<div class="rowTop"><div class="rowMain"><div class="name companyNameLink" data-open-company="${escapeHtml(company.id)}">${escapeHtml(company.properties?.name||"Unnamed Company")}</div><div class="subMeta"><span class="subK">Primary:</span> ${fullName?escapeHtml(fullName):'<span style="opacity:.55">Not set</span>'}</div><div class="subMeta"><span class="subK">Priority:</span> ${escapeHtml(getPriorityLabel(priority))}</div><div class="subMeta"><span class="subK">Due Date:</span> ${escapeHtml(getDueDateDisplay(company.id))}</div></div><div class="cardTopRight">${topRightBadges}<div class="statusMenuWrap"><button class="statusChip statusChipButton ${statusValue}" type="button">${escapeHtml(getStatusLabel(statusValue))}</button><div class="statusMenu">${statusMenu}</div></div></div></div>`;
card.addEventListener("click", async ()=>{
openCompanyDetail(company.id);
});
card.querySelectorAll("[data-open-website]").forEach(btn => {
btn.addEventListener("click", (e) => {
openCompanyWebsite(e, btn.dataset.openWebsite);
});
});
const statusWrap = card.querySelector('.statusMenuWrap');
const statusButton = card.querySelector('.statusChipButton');
const statusMenuEl = card.querySelector('.statusMenu');
statusButton.addEventListener('click', (e) => {
e.stopPropagation();
const isOpen = statusMenuEl.classList.contains('open');
closeAllStatusMenus();
if(!isOpen) statusMenuEl.classList.add('open');
});
statusMenuEl.querySelectorAll('[data-status-option]').forEach(btn => {
btn.addEventListener('click', async (e) => {
e.stopPropagation();
const nextStatus = btn.dataset.statusOption;
statusMenuEl.classList.remove('open');
if(nextStatus === statusValue){
showStatusFlash(statusWrap, 'No change');
return;
}
await applyCompanyStatusChange(company.id, nextStatus, { flashContainer: statusWrap });
CQBus.emit('render:board');
});
});
ui.prospectList.appendChild(card);
});
if(state.prospectHasMore){
const loader = document.createElement("div");
loader.className = "emptyState prospectLoader";
loader.textContent = state.loadingMoreCompanies ? "Loading more companies..." : "Scroll for more companies...";
ui.prospectList.appendChild(loader);
}
}
function insertTextAtCursor(el, textToInsert){
if(!el) return;
const start = typeof el.selectionStart === "number" ? el.selectionStart : el.value.length;
const end = typeof el.selectionEnd === "number" ? el.selectionEnd : el.value.length;
const value = el.value || "";
el.value = value.slice(0, start) + textToInsert + value.slice(end);
const caret = start + textToInsert.length;
el.focus();
if(typeof el.setSelectionRange === "function") el.setSelectionRange(caret, caret);
}
function renderTouches(companyId){
const local=getCompanyState(companyId);
const nextIndex=getCurrentNextTouchZeroIndex(companyId);
const historyMap = getTouchHistoryMap(companyId);
ui.touchContainer.innerHTML="";
getTouchTemplate(companyId).forEach((baseTouch,index)=>{
const touch = getEffectiveTouch(companyId, index) || baseTouch;
const row=document.createElement("div");
row.className="task"+(index===nextIndex?" next":"");
const actionMeta = getTouchActionMeta(companyId, index) || { label: "Open Company", kind: "detail" };
const actionButton = `<button class="iconBtn taskActionQuickBtn" type="button" title="${escapeHtml(actionMeta.label)}" aria-label="${escapeHtml(actionMeta.label)}">${getActionIconSvg(actionMeta.kind)}</button>`;
const changeTaskOptions = TASK_CHANGE_OPTIONS.map(option => `
<button class="taskChangeOption ${getTouchOverrideType(companyId, index) === option.value ? 'active' : ''}" type="button" data-task-type="${option.value}"><span class="taskTypeIcon">${escapeHtml(TASK_TYPE_CONFIG[option.value].icon)}</span><span>${escapeHtml(option.label)}</span></button>
`).join('');
const resetOption = getTouchOverrideType(companyId, index)
? `<button class="taskChangeOption reset" type="button" data-task-type=""><span class="taskTypeIcon">↺</span><span>Reset to Default</span></button>`
: "";
const isEmailTouch = isEmailTouchType(companyId, index);
const isMailerTouch = isMailerTouchType(companyId, index);
const ownerIdForTouch = state.selectedOwnerId || "default";
const selectedEmailTemplateKey = getCompanyTouchTemplateSelection(companyId, index) || getCadenceStepTemplateSelection(companyId, index) || getOwnerEmailTemplateSelection(ownerIdForTouch, index);
const emailTemplateOptions = getAllEmailTemplateOptions(ownerIdForTouch, index).map(option => `
<button class="gearMenuOption ${selectedEmailTemplateKey === option.value ? 'active' : ''}" type="button" data-email-template="${option.value}"><span>${escapeHtml(option.label)}</span></button>
`).join('');
const selectedMailerTemplateKey = getCompanyTouchTemplateSelection(companyId, index) || getCadenceStepTemplateSelection(companyId, index) || inferMailerTemplateKeyFromTouchTitle((getEffectiveTouch(companyId, index) || getTouchTemplate(companyId)[index])?.title || "");
const mailerTemplateOptions = MAILER_TEMPLATE_OPTIONS.map(option => `
<button class="gearMenuOption ${selectedMailerTemplateKey === option.value ? 'active' : ''}" type="button" data-mailer-template="${option.value}"><span>${escapeHtml(option.label)}</span></button>
`).join('');
const editableTemplate = isEmailTouch ? getEditableOwnerEmailTemplate(ownerIdForTouch, index) : null;
const editorOpen = isEmailTouch && String(state.emailEditor.companyId) === String(companyId) && Number(state.emailEditor.touchIndex) === index;
const gearMenuOptions = `
${changeTaskOptions}
${resetOption}
${isEmailTouch ? `<div class="gearMenuDivider"></div>${emailTemplateOptions}` : ``}
${isMailerTouch ? `<div class="gearMenuDivider"></div>${mailerTemplateOptions}` : ``}
`;
const emailEditor = isEmailTouch ? `
<div class="emailTemplateEditor ${editorOpen ? 'open' : ''}"><div class="emailTemplateField"><label class="emailTemplateLabel" for="emailTemplateSubject-${companyId}-${index}">Subject</label><input class="input emailTemplateSubject" id="emailTemplateSubject-${companyId}-${index}" name="emailTemplateSubject-${companyId}-${index}" type="text" value="${escapeHtml(editableTemplate.subject)}"></div><div class="emailTemplateField"><label class="emailTemplateLabel" for="emailTemplateBody-${companyId}-${index}">Body</label><textarea class="notesBox emailTemplateBody" id="emailTemplateBody-${companyId}-${index}" name="emailTemplateBody-${companyId}-${index}" style="min-height:170px;">${escapeHtml(editableTemplate.body)}</textarea></div><div class="emailTemplateActions"><button class="emailTemplateSaveBtn" type="button">Save for ${escapeHtml(state.owners.find(o => String(o.id) === String(ownerIdForTouch))?.name || 'TC')}</button><button class="emailTemplateResetBtn" type="button">Reset Template</button></div></div>
` : "";
const completedStamp = isTouchChecked(companyId, index) ? formatTouchTimestamp(getTouchTimestamp(companyId, index)) : "";
row.innerHTML=`<label class="srOnly" for="touchCheck-${companyId}-${index}">Mark ${escapeHtml(touch.title)} complete</label><input id="touchCheck-${companyId}-${index}" name="touchCheck-${companyId}-${index}" type="checkbox" ${isTouchChecked(companyId, index)?"checked":""}><div><div class="main"><span class="main-title">${escapeHtml(touch.title)}</span><div class="main-actions">
${actionButton}
<div class="taskChangeWrap"><button class="gearOnlyBtn" type="button" aria-label="Task options">⚙</button><div class="gearMenu taskChangeMenu">${gearMenuOptions}</div></div><button class="chevBtn" type="button" aria-label="Expand details"><span class="chev">⌄</span></button></div></div><div class="meta"><span class="metaText">${escapeHtml(touch.meta)}</span><span class="tag ${touch.tag.color}">${escapeHtml(touch.tag.label)}</span><span class="tag">${touch.points} pt${touch.points>1?"s":""}</span></div>
${completedStamp ? `<div class="touchStamp">${escapeHtml(completedStamp)}</div>` : ""}
${emailEditor}
<div class="details"><pre>${escapeHtml(touch.details)}</pre></div></div>`;
row.querySelector(".chevBtn").addEventListener("click",(e)=>{
e.stopPropagation();
row.classList.toggle("open");
});
const taskActionBtn = row.querySelector(".taskActionQuickBtn");
if(taskActionBtn){
taskActionBtn.addEventListener("click",(e)=>{
e.stopPropagation();
runTouchAction(companyId, index);
});
}
const changeTaskBtn = row.querySelector(".gearOnlyBtn");
const changeTaskMenu = row.querySelector(".taskChangeMenu");
changeTaskBtn.addEventListener("click", (e) => {
e.stopPropagation();
const open = changeTaskMenu.classList.contains("open");
closeAllTaskChangeMenus();
if(!open){
  smartPositionMenu(changeTaskBtn, changeTaskMenu);
  changeTaskMenu.classList.add("open");
}
});
changeTaskMenu.querySelectorAll("[data-task-type]").forEach(btn => {
btn.addEventListener("click", async (e) => {
e.stopPropagation();
const taskType = btn.dataset.taskType || "";
const touch = getEffectiveTouch(companyId, index) || getTouchTemplate(companyId)[index];
const previousType = getTouchOverrideType(companyId, index) || getDefaultTaskTypeFromTouch(touch) || "detail";
const wasCompleted = isTouchChecked(companyId, index);
const touchHistory = Array.isArray(getProspectingState(companyId)?.touch_history) ? getProspectingState(companyId).touch_history : [];
const completedRecord = touchHistory.find(item => Number(item?.index) === index + 1) || null;
try{
const baseTouch = getTouchTemplate(companyId)[index];
const resolvedTaskType = taskType || getDefaultTaskTypeFromTouch(baseTouch) || "detail";
const result = await saveTouchOverrideOnBackend(companyId, index, taskType, {
touchIndex: index + 1,
resolvedTaskType,
oldTaskType: previousType,
completedAt: wasCompleted && completedRecord?.completedAt ? completedRecord.completedAt : null,
ownerId: completedRecord?.ownerId || null,
ownerName: completedRecord?.ownerName || null,
touchTitle: `Touch ${index + 1} — ${(TASK_TYPE_CONFIG[resolvedTaskType]?.label || baseTouch?.title || `Touch ${index + 1}`)}`,
notes: completedRecord?.notes || String(ui.notesBox?.value || getCompanyState(companyId).notes || "").trim(),
nextDueDate: getBackendDueDateIso(companyId)
});
if(wasCompleted && completedRecord?.completedAt){
completedRecord.taskType = result?.activityUpdate?.newTaskType || resolvedTaskType;
completedRecord.statCategory = result?.activityUpdate?.statCategory || mapTaskTypeToStatCategory(resolvedTaskType) || "other";
await refreshSelectedOwnerCompletedStats();
ui.sidebarStatus.textContent = "Completed task updated";
} else {
ui.sidebarStatus.textContent = taskType ? "Task type updated" : "Task reset to default";
}
} catch(error){
console.error(error);
ui.sidebarStatus.textContent = error.message || "Could not update task";
}
changeTaskMenu.classList.remove("open");
renderTouches(companyId);
CQBus.emit('render:board');
renderProspectList();
renderWeeklyStats();
});
});
const templateMenu = row.querySelector(".taskChangeMenu");
templateMenu.querySelectorAll("[data-email-template]").forEach(btn => {
btn.addEventListener("click", (e) => {
e.stopPropagation();
const nextTemplateKey = btn.dataset.emailTemplate || "default";
setOwnerEmailTemplateSelection(ownerIdForTouch, index, nextTemplateKey);
setCompanyTouchTemplateSelection(companyId, index, nextTemplateKey);
templateMenu.classList.remove("open");
renderTouches(companyId);
CQBus.emit('render:board');
ui.sidebarStatus.textContent = "Template updated for this technology consultant";
showAdvanceToast("Template Updated");
});
});
templateMenu.querySelectorAll("[data-mailer-template]").forEach(btn => {
btn.addEventListener("click", (e) => {
e.stopPropagation();
setCompanyTouchTemplateSelection(companyId, index, btn.dataset.mailerTemplate || "");
templateMenu.classList.remove("open");
renderTouches(companyId);
CQBus.emit('render:board');
ui.sidebarStatus.textContent = "Mailer template saved";
showAdvanceToast("Mailer Saved");
});
});
const adjustTemplateBtn = row.querySelector(".adjustTemplateOption");
if(adjustTemplateBtn){
adjustTemplateBtn.addEventListener("click", (e) => {
e.stopPropagation();
const isOpen = String(state.emailEditor.companyId) === String(companyId) && Number(state.emailEditor.touchIndex) === index;
state.emailEditor = isOpen ? { companyId: "", touchIndex: -1 } : { companyId, touchIndex: index };
renderTouches(companyId);
});
}
const saveTemplateBtn = row.querySelector(".emailTemplateSaveBtn");
const resetTemplateBtn = row.querySelector(".emailTemplateResetBtn");
const subjectInput = row.querySelector(".emailTemplateSubject");
const bodyInput = row.querySelector(".emailTemplateBody");
if(saveTemplateBtn && subjectInput && bodyInput){
saveTemplateBtn.addEventListener("click", (e) => {
e.stopPropagation();
const currentTemplateKey = getOwnerEmailTemplateSelection(ownerIdForTouch, index);
saveOwnerEmailTemplateOverride(ownerIdForTouch, currentTemplateKey, subjectInput.value, bodyInput.value, '', index);
state.emailEditor = { companyId: "", touchIndex: -1 };
ui.sidebarStatus.textContent = "Template saved for this technology consultant";
renderTouches(companyId);
CQBus.emit('render:board');
showAdvanceToast("Template Saved");
});
}
if(resetTemplateBtn){
resetTemplateBtn.addEventListener("click", (e) => {
e.stopPropagation();
const currentTemplateKey = getOwnerEmailTemplateSelection(ownerIdForTouch, index);
resetOwnerEmailTemplateOverride(ownerIdForTouch, currentTemplateKey);
ui.sidebarStatus.textContent = "Template reset to default";
renderTouches(companyId);
showAdvanceToast("Template Reset");
});
}
row.querySelector('input[type="checkbox"]').addEventListener("change", async (e)=>{
e.stopPropagation();
const checkbox = e.target;
const expectedIndex = getCurrentNextTouchZeroIndex(companyId);
if(checkbox.checked){
if(index !== expectedIndex){
checkbox.checked = isTouchChecked(companyId, index);
ui.sidebarStatus.textContent = "Only the current next step can be completed";
return;
}
try{
const payload = buildTouchCompletionPayload(companyId, index);
const completionData = await completeTouchOnBackend(companyId, index + 1, payload);
const resolvedNextDueAt = syncCompletedTouchDueDate(companyId, completionData || {});
await refreshSelectedOwnerCompletedStats();
showAdvanceToast(getCompletionToastMessage(completionData || {}), { tone: 'success' });
handleTouchCompletionEffects(companyId, index);
if(completionData?.needsNextDueDate){
showNextDuePrompt(companyId);
}
ui.sidebarStatus.textContent = resolvedNextDueAt
? `Follow up set for ${formatDisplayDate(resolvedNextDueAt)}`
: "Touch completed";
renderLeaderboard();
updateProgress();
} catch(error){
console.error(error);
checkbox.checked = false;
ui.sidebarStatus.textContent = "Could not complete touch";
}
} else {
checkbox.checked = true;
}
});
const checkboxEl = row.querySelector('input[type="checkbox"]');
checkboxEl.disabled = isTouchChecked(companyId, index) || (nextIndex !== -1 && index !== nextIndex);
ui.touchContainer.appendChild(row);
});
}
function syncFormFieldsFromState(companyId){
const local = getCompanyState(companyId);
const company = getCompanyById(companyId);
ui.notesBox.value = (local.notes ?? company?.properties?.prospecting_notes ?? "") || "";
ui.contactFirst.value = local.contactFirst || "";
ui.contactLast.value = local.contactLast || "";
ui.prospectEmail.value = local.email || "";
ui.prospectPhone.value = local.phone || "";
ui.prospectLinkedIn.value = normalizeLinkedInUrl(local.linkedin);
ui.companyDomain.value = local.websiteDomain || normalizeDomainValue(company?.properties?.domain || "");
ui.companyAddress.value = local.companyAddress || getCompanyMailingAddress(company, local).join(", ");
}
function saveFormFieldsToState(){
if(!state.selectedCompanyId) return;
const local=getCompanyState(state.selectedCompanyId);
local.notes=ui.notesBox.value;
const company = getCompanyById(state.selectedCompanyId);
if(company){
company.properties = company.properties || {};
company.properties.prospecting_notes = ui.notesBox.value;
}
local.contactFirst=ui.contactFirst.value;
local.contactLast=ui.contactLast.value;
local.email=ui.prospectEmail.value;
local.phone=ui.prospectPhone.value;
local.linkedin=normalizeLinkedInUrl(ui.prospectLinkedIn.value.trim());
local.websiteDomain=normalizeDomainValue(ui.companyDomain.value);
local.companyAddress=String(ui.companyAddress.value || "").trim();
if(company){
company.properties.domain = local.websiteDomain;
company.properties.address = local.companyAddress;
}
queueCompanyStateSave(state.selectedCompanyId);
renderProspectList();
if(state.currentView === "detail") renderDetailSummary(state.selectedCompanyId);
}
function renderStatusPills(companyId){
const company=state.companies.find(c=>c.id===companyId);
const local=getCompanyState(companyId);
const currentExitState = getCompanyExitState(companyId);
const currentStatus = currentExitState === "notInterested"
? "notInterested"
: normalizeStatusValue(company?.properties?.prospecting_status || local.status);
ui.statusCurrentBtn.textContent = getStatusLabel(currentStatus);
ui.statusCurrentBtn.className = `detailValueBtn ${currentStatus === "notInterested" ? "research" : currentStatus}`;
ui.statusCurrentBtn.style.cursor = "pointer";
if(ui.statusRow) ui.statusRow.style.cursor = "pointer";
ui.statusMenu.querySelectorAll("[data-status-option]").forEach(btn => {
btn.classList.toggle("active", btn.dataset.statusOption === currentStatus);
});
}

function getCadenceDesignerFallbackSteps(){
return (Array.isArray(TOUCH_TEMPLATE) ? TOUCH_TEMPLATE : []).map((step, idx) => ({
...step,
touch: idx + 1,
index: idx + 1,
delayDays: Math.max(0, Number(step?.delayDays ?? 7) || 0),
points: Math.max(0, Number(step?.points ?? 0) || 0),
type: String(step?.type || step?.tag?.label || 'task').trim().toLowerCase(),
instructionText: String(step?.instructionText || step?.details || '').trim(),
details: String(step?.instructionText || step?.details || '').trim()
}));
}
function syncTouchTemplateFromCadenceSteps(steps){
const nextSteps = (Array.isArray(steps) ? steps : []).map((step, idx) => {
const rawType = String(step?.type || '').trim();
const normalizedType = rawType.toLowerCase();
let resolvedType = 'phone';
if(['call','phone','phone call'].includes(normalizedType)) resolvedType = 'phone';
else if(['video','video call','meeting'].includes(normalizedType)) resolvedType = 'video';
else if(normalizedType === 'email') resolvedType = 'email';
else if(['sms','text','text message'].includes(normalizedType)) resolvedType = 'sms';
else if(['social','social message','linkedin','facebook','digital'].includes(normalizedType)) resolvedType = 'social';
else if(['stopin','stop-in','stop in','in person','in person stop-in','walk-in','walk in','visit'].includes(normalizedType)) resolvedType = 'stopIn';
else if(['mailer','mail','letter','postcard'].includes(normalizedType)) resolvedType = 'mailer';

const config = TASK_TYPE_CONFIG[resolvedType] || TASK_TYPE_CONFIG.phone;
const fallbackContent = TASK_TYPE_DEFAULT_CONTENT[resolvedType] || {};
const touchNumber = idx + 1;
const cleanLabel = String(step?.label || step?.title || `Step ${touchNumber}`).replace(/^Touch\s*\d+\s*[—-]\s*/i, '').trim() || `Step ${touchNumber}`;
const instructionText = String(step?.instructionText || step?.details || '').trim();

return {
  touch: touchNumber,
  week: Number(step?.week || touchNumber) || touchNumber,
  title: `Touch ${touchNumber} — ${cleanLabel}`,
  meta: String(step?.meta || config?.label || ''),
  details: instructionText || String(fallbackContent.details || ''),
  instructionText: instructionText || String(fallbackContent.details || ''),
  delayDays: Math.max(0, Number(step?.delayDays ?? 0) || 0),
  points: Math.max(0, Number(step?.points ?? config?.defaultPoints ?? 0) || 0),
  type: resolvedType,
  tag: (step?.tag && typeof step.tag === 'object') ? step.tag : { ...(config?.tag || { label: 'Task', color: 'blue' }) }
};
});
if(nextSteps.length) TOUCH_TEMPLATE = nextSteps;
}

function getGlobalDefaultCadenceTemplate(){
const templates = Array.isArray(state.cadenceDesigner?.templates) ? state.cadenceDesigner.templates : [];
return templates.find(template => String(template?.id || '') === String(state.cadenceDesigner.globalDefaultTemplateId || 'global-default')) || null;
}
window.activeCadenceTemplate = window.activeCadenceTemplate || null;
window.activeCadenceTemplateId = window.activeCadenceTemplateId || null;
function setActiveCadenceTemplateRuntime(template){
const normalizedTemplate = template && typeof template === 'object' ? {
  id: String(template.id || '').trim(),
  name: String(template.name || '').trim(),
  description: String(template.description || '').trim(),
  steps: Array.isArray(template.steps) ? template.steps.map(step => ({ ...step })) : []
} : null;
window.activeCadenceTemplate = normalizedTemplate;
window.activeCadenceTemplateId = normalizedTemplate ? String(normalizedTemplate.id || '').trim() : null;
state.cadenceDesigner = state.cadenceDesigner || { templates: [], globalDefaultTemplateId: 'global-default', loading: false, saving: false };
state.cadenceDesigner.activeTemplateId = window.activeCadenceTemplateId || state.cadenceDesigner.globalDefaultTemplateId || 'global-default';
if(normalizedTemplate && Array.isArray(normalizedTemplate.steps) && normalizedTemplate.steps.length){
  syncTouchTemplateFromCadenceSteps(normalizedTemplate.steps);
}
return normalizedTemplate;
}
async function refreshCadenceExecutionTemplate(force = false){
state.cadenceDesigner = state.cadenceDesigner || { templates: [], globalDefaultTemplateId: 'global-default', loading: false, saving: false };
const shouldFetch = force || !Array.isArray(state.cadenceDesigner.templates) || !state.cadenceDesigner.templates.length;
if(shouldFetch){
  const res = await fetch(`${API}/api/app/cadence/templates`, { cache: 'no-store' });
  if(!res.ok) throw new Error('cadence_templates_route_unavailable');
  const data = await res.json();
  if(!data.ok) throw new Error(data.message || 'Failed to load cadence templates');
  state.cadenceDesigner.templates = Array.isArray(data.templates) ? data.templates.slice() : [];
  state.cadenceDesigner.globalDefaultTemplateId = String(data.globalDefaultTemplateId || state.cadenceDesigner.globalDefaultTemplateId || 'global-default');
}
const active = getGlobalDefaultCadenceTemplate() || null;
return setActiveCadenceTemplateRuntime(active);
}
window.refreshCadenceExecutionTemplate = refreshCadenceExecutionTemplate;
window.setActiveCadenceTemplateRuntime = setActiveCadenceTemplateRuntime;
function renderCadenceDesigner(){
if(window.CadenceDesignerDoor && typeof window.CadenceDesignerDoor.render === 'function'){
  return window.CadenceDesignerDoor.render();
}
}
async function loadCadenceDesigner(force = false){
if(window.CadenceDesignerDoor && typeof window.CadenceDesignerDoor.load === 'function'){
  return window.CadenceDesignerDoor.load(force);
}
}
function openCadenceDesigner(){
if(window.CadenceDesignerDoor && typeof window.CadenceDesignerDoor.open === 'function'){
  return window.CadenceDesignerDoor.open();
}
}
function closeCadenceDesigner(){
if(window.CadenceDesignerDoor && typeof window.CadenceDesignerDoor.close === 'function'){
  return window.CadenceDesignerDoor.close();
}
}
window.openCadenceDesigner = openCadenceDesigner;
window.closeCadenceDesigner = closeCadenceDesigner;
window.renderCadenceDesigner = renderCadenceDesigner;
window.loadCadenceDesigner = loadCadenceDesigner;
// Cadence Designer owned by cadence-designer.js
function getCadenceDesignerDraftSteps(){
const template = getGlobalDefaultCadenceTemplate();
const steps = Array.isArray(template?.steps) ? template.steps : [];
return steps.length ? steps : getCadenceDesignerFallbackSteps();
}
async function saveCadenceDesigner(){
if(window.CadenceDesignerDoor && typeof window.CadenceDesignerDoor.save === 'function'){
  return window.CadenceDesignerDoor.save();
}
}
window.saveCadenceDesigner = saveCadenceDesigner;

async function loadBootstrap(){
const preservedAuthUser = state.authUser;
resetSessionUiState({ preserveAuthUser: true });
state.authUser = preservedAuthUser;
window.__prospectAuthUser = preservedAuthUser || null;
const res = await fetch(`${API}/api/app/bootstrap`, { cache: "no-store" });
const data = await res.json();
if(!data.ok) throw new Error(data.message || "Bootstrap failed");
if(!data.connected){
window.location.href = `${API}/auth/hubspot/start`;
return;
}
state.owners = data.owners || [];
state.cadenceDesigner = state.cadenceDesigner || { templates: [], globalDefaultTemplateId: "global-default", loading: false, saving: false };
state.cadenceDesigner.bootstrapTouchSequence = Array.isArray(data.touchSequence) ? data.touchSequence.slice() : [];
if(Array.isArray(data.touchSequence) && data.touchSequence.length && (!state.cadenceDesigner.templates || !state.cadenceDesigner.templates.length)){
TOUCH_TEMPLATE = data.touchSequence.map((touch, idx) => {
  const normalizedType = normalizeTaskTypeKey(touch.type || touch.taskType || touch.label || '');
  const config = getTaskTypeConfig(normalizedType);
  return {
  touch: idx + 1,
  week: idx + 1,
  title: `Touch ${idx + 1} — ${touch.label || config?.label || `Step ${idx + 1}`}`,
  meta: String(config?.label || ''),
  details: '',
  type: normalizedType || 'mailer',
  delayDays: Math.max(0, Number(touch.delayDays || 0) || 0),
  points: Math.max(0, Number(touch.points ?? config?.defaultPoints ?? 0) || 0),
  tag: { ...(config?.tag || { label: String(touch.type || 'Task'), color: 'blue' }) }
};
});
}
try {
await refreshCadenceExecutionTemplate(true);
} catch(error){
console.warn('Failed to refresh cadence execution template; using bootstrap touch sequence', error);
}
if(isAdminUser()){
try {
state.manageUsers = await fetchManageUsers();
syncBackendSelectableUsersFromManageUsers();
renderManageUsers();
} catch(error){
console.error('Failed to preload managed users', error);
}
}
renderOwners();
state.selectedOwnerId = getPreferredSelectedOwnerId();
if(state.selectedOwnerId){
ui.ownerSelect.value = state.selectedOwnerId;
}
ui.sidebarStatus.textContent = `Connected to HubSpot • ${data.totalCompanies || 0} cached companies`;
}
function resetProspectPagination(){
state.prospectRenderCount = state.prospectPageSize || 50;
state.prospectHasMore = false;
state.serverPage = 1;
state.serverHasMore = false;
state.serverTotal = 0;
}
async function loadMoreProspects(){
if(state.loadingMoreCompanies || !state.serverHasMore || !state.selectedOwnerId) return;
state.loadingMoreCompanies = true;
renderProspectList();
try{
await fetchCompaniesPage({ append: true });
} finally {
state.loadingMoreCompanies = false;
renderProspectList();
}
}
async function loadAllCompaniesForCurrentOwner(){
const chosenOwnerId = String(state.selectedOwnerId || ui.ownerSelect?.value || "").trim();
if(!chosenOwnerId) return;
if(state.loadingMoreCompanies) return;
state.loadingMoreCompanies = true;
ui.sidebarStatus.textContent = "Loading all companies for New sort...";
renderProspectList();
try{
const limit = Number(state.serverLimit || 50) || 50;
const search = String(state.serverSearchQuery || "").trim();
let page = 1;
let hasMore = false;
let total = 0;
const collected = [];
while(true){
const params = new URLSearchParams({
ownerId: chosenOwnerId,
search,
sort: "dueDate",
page: String(page),
limit: String(limit)
});
const res = await fetch(`${API}/api/app/companies?${params.toString()}`, { cache: "no-store" });
const data = await res.json().catch(() => ({}));
if(data && data.apiUsage) setNearbyApiUsage(data.apiUsage);
if(!data.ok){
throw new Error(data.message || "Failed to load companies");
}
collected.push(...(data.companies || []));
hasMore = !!data.hasMore;
total = Number(data.total || collected.length || 0);
if(!hasMore) break;
page += 1;
}
mergeCompaniesFromServer(collected, { append: false });
state.serverPage = page;
state.serverLimit = limit;
state.serverHasMore = false;
state.serverTotal = total || state.companies.length || 0;
state.prospectHasMore = false;
state.companies.forEach(company => {
const local = getCompanyState(company.id);
const hubspotStatus = normalizeStatusValue(company?.properties?.prospecting_status);
local.status = hubspotStatus || local.status;
if(!local.priority){
local.priority = getDefaultPriority(local);
}
const hubspotDueDate = String(company?.properties?.prospecting_due_date || "").slice(0, 10);
const hasBackendDueDate = !!String(company?.prospecting?.next_touch_due_at || "").slice(0, 10);
const addedDate = getCompanyAddedDate(company);
if(addedDate && !local.addedAt) local.addedAt = addedDate.toISOString();
if(hubspotDueDate && !hasBackendDueDate){
company.prospecting = {
...(company.prospecting || {}),
next_touch_due_at: hubspotDueDate
};
}
company.properties = company.properties || {};
if(hubspotDueDate){
company.properties.prospecting_due_date = hubspotDueDate;
}
if(local.notes) company.properties.prospecting_notes = local.notes;
});
saveLocalState();
window.WorkspaceDoor?.ensureValidCompanySelection?.();
} finally {
state.loadingMoreCompanies = false;
renderProspectList();
ui.sidebarStatus.textContent = state.serverSearchQuery ? `${state.serverTotal} matching companies` : `${state.serverTotal} assigned companies`;
}
}
function mergeCompaniesFromServer(companies = [], options = {}){
const append = !!options.append;
const normalized = (companies || []).map(company => {
const companyState = company.companyState || company.company_state || null;
if(companyState){
state.remote.companyStateById[String(company.id)] = {
...getDefaultCompanyState(company.id),
...(companyState || {}),
companyId: String(company.id)
};
}
const hubspotRawStatus = String(company?.properties?.prospecting_status || '').trim();
if(hubspotRawStatus){
const hubspotNormalizedStatus = normalizeStatusValue(hubspotRawStatus);
const localState = getCompanyState(company.id);
const shouldRestoreToActive = !!localState?.exitState && (
hubspotNormalizedStatus === 'research' ||
hubspotNormalizedStatus === 'activeOutreach' ||
hubspotNormalizedStatus === 'engaged'
);
if(shouldRestoreToActive){
setCompanyState(company.id, {
status: hubspotNormalizedStatus,
exitState: '',
exitLabel: '',
exitAt: ''
});
queueCompanyStateSave(company.id, { delay: 50 });
} else if(hubspotNormalizedStatus){
localState.status = hubspotNormalizedStatus;
}
}
return company;
});
if(!append){
state.companies = normalized;
return;
}
const existing = new Map((state.companies || []).map(item => [String(item.id), item]));
normalized.forEach(company => {
existing.set(String(company.id), company);
});
state.companies = Array.from(existing.values());
}
async function fetchCompaniesPage(options = {}){
const append = !!options.append;
const chosenOwnerId = state.selectedOwnerId || ui.ownerSelect.value || "";
if(!chosenOwnerId) return { ok: true, companies: [] };
const requestedPage = append ? (state.serverPage + 1) : 1;
const params = new URLSearchParams({
ownerId: chosenOwnerId,
search: state.serverSearchQuery || "",
sort: (["dueDate","temp","new","untouched"].includes(String(ui.sortBox?.value || "dueDate")) ? String(ui.sortBox?.value || "dueDate") : "dueDate"),
page: String(requestedPage),
limit: String(state.serverLimit || 50)
});
const res = await fetch(`${API}/api/app/companies?${params.toString()}`, { cache: "no-store" });
const data = await res.json();
if(!data.ok){
throw new Error(data.message || "Failed to load companies");
}
mergeCompaniesFromServer(data.companies || [], { append });
state.serverPage = Number(data.page || requestedPage || 1);
state.serverLimit = Number(data.limit || state.serverLimit || 50);
state.serverHasMore = !!data.hasMore;
state.serverTotal = Number(data.total || state.companies.length || 0);
state.prospectHasMore = state.serverHasMore;
state.companies.forEach(company => {
const local = getCompanyState(company.id);
const hubspotStatus = normalizeStatusValue(company?.properties?.prospecting_status);
local.status = hubspotStatus || local.status;
if(!local.priority){
local.priority = getDefaultPriority(local);
}
const hubspotDueDate = String(company?.properties?.prospecting_due_date || "").slice(0, 10);
const hasBackendDueDate = !!String(company?.prospecting?.next_touch_due_at || "").slice(0, 10);
const addedDate = getCompanyAddedDate(company);
if(addedDate && !local.addedAt) local.addedAt = addedDate.toISOString();
if(hubspotDueDate && !hasBackendDueDate){
company.prospecting = {
...(company.prospecting || {}),
next_touch_due_at: hubspotDueDate
};
}
company.properties = company.properties || {};
if(hubspotDueDate){
company.properties.prospecting_due_date = hubspotDueDate;
}
if(local.notes) company.properties.prospecting_notes = local.notes;
});
saveLocalState();
return data;
}
function refreshSearchViewportLayout(){
const viewport = window.visualViewport;
const vh = viewport ? viewport.height : window.innerHeight;
document.documentElement.style.setProperty('--app-vh', `${Math.max(320, Math.round(vh))}px`);
const headerH = document.querySelector('header')?.offsetHeight || 0;
document.documentElement.style.setProperty('--sidebar-search-top', `${headerH + 4}px`);
}
let searchReleaseTimer = null;
function pinSearchIntoView(){
if(!ui.searchBox) return;
if(searchReleaseTimer){
clearTimeout(searchReleaseTimer);
searchReleaseTimer = null;
}
if(!isMobileDrawerViewport()) return;
setSidebarCollapsed(false);
document.body.classList.add('mobile-drawer-ready');
document.body.classList.add('searching-sidebar');
refreshSearchViewportLayout();
requestAnimationFrame(() => {
requestAnimationFrame(() => {
ui.sidebarPanel?.scrollTo?.({ top: 0, behavior: 'auto' });
try{ window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }catch(_){ try{ window.scrollTo(0, 0); }catch(__){} }
ui.searchBox.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
ui.prospectList?.scrollTo({ top: 0, behavior: 'auto' });
});
});
}
function openProspectSearch(){
if(!ui.searchBox) return;
if(isMobileDrawerViewport()){
setSidebarCollapsed(false);
document.body.classList.add('mobile-drawer-ready');
}
document.body.classList.add('searching-sidebar');
refreshSearchViewportLayout();
pinSearchIntoView();
setTimeout(() => {
try{ ui.searchBox.value = ''; }catch(_){ }
try{ ui.searchBox?.focus({ preventScroll: true }); }catch(_){ ui.searchBox?.focus(); }
ui.searchBox?.select?.();
ui.prospectList?.scrollTo?.({ top: 0, behavior: 'auto' });
}, 60);
setTimeout(() => {
try{ ui.searchBox?.focus({ preventScroll: true }); }catch(_){ ui.searchBox?.focus(); }
}, 220);
}
function releaseSearchViewportPin(delay = 180){
if(searchReleaseTimer){
clearTimeout(searchReleaseTimer);
}
searchReleaseTimer = setTimeout(() => {
document.body.classList.remove('searching-sidebar');
refreshSearchViewportLayout();
try{ ui.searchBox?.blur(); }catch(_){}
searchReleaseTimer = null;
}, delay);
}
async function loadCompaniesForOwner(options = {}){
const preserveWorkspace = options.preserveWorkspace !== false;
const listOnly = !!options.listOnly;
const chosenOwnerId = state.selectedOwnerId || ui.ownerSelect.value || "";
if(!chosenOwnerId){
state.companies = [];
state.selectedCompanyId = "";
state.pinnedCompanyId = "";
state.focusCompanyId = "";
renderProspectList();
CQBus.emit('render:detail');
updateProgress();
ui.sidebarStatus.textContent = "Choose an owner to load assigned companies.";
renderEmailOpensIndicator();
return;
}
state.selectedOwnerId = chosenOwnerId;
ui.ownerSelect.value = chosenOwnerId;
state.selectedCompanyId = "";
state.pinnedCompanyId = "";
state.focusCompanyId = "";
state.serverSearchQuery = String(ui.searchBox?.value || "").trim();
state.loadingCompanies = true;
ui.sidebarStatus.textContent = state.serverSearchQuery ? "Searching companies..." : "Loading companies...";
resetProspectPagination();
state.companies = [];
renderProspectList();
try {
await syncSelectedOwnerRemoteData();
const data = await fetchCompaniesPage({ append: false });

/* Phase 6 fix: fetch ALL past-due + due-today companies in one shot
   so Today's Queue shows complete data regardless of which page is loaded.
   These are merged into state.companies before getActionItems() runs. */
try {
  const chosenOwnerId = state.selectedOwnerId || "";
  if (chosenOwnerId) {
    const dueParams = new URLSearchParams({
      ownerId: chosenOwnerId,
      dueOnly: "1",
      sort: "dueDate"
    });
    const dueRes = await fetch(`${API}/api/app/companies?${dueParams.toString()}`, { cache: "no-store" });
    const dueData = await dueRes.json();
    if (dueData.ok && Array.isArray(dueData.companies) && dueData.companies.length) {
      mergeCompaniesFromServer(dueData.companies, { append: true });
    }
  }
} catch (_dueErr) { /* non-fatal — queue works with paged data as fallback */ }

const rankedItems = getActionItems();
const visibleCompanies = getVisibleCompanies();
const currentSelectedId = String(state.selectedCompanyId || state.pinnedCompanyId || "").trim();
if(!preserveWorkspace && !listOnly){
state.selectedCompanyId = state.pinnedCompanyId && visibleCompanies.some(c => String(c.id) === String(state.pinnedCompanyId)) ? state.pinnedCompanyId : (rankedItems[0]?.company.id || visibleCompanies[0]?.id || "");
} else if(currentSelectedId){
state.selectedCompanyId = currentSelectedId;
state.pinnedCompanyId = currentSelectedId;
}
window.WorkspaceDoor?.ensureValidCompanySelection?.();
renderProspectList();
if(!listOnly){
CQBus.emit('render:detail');
CQBus.emit('render:board');
}
renderLeaderboard();
renderWeeklyStats();
updateProgress();
renderEmailOpensIndicator();
ui.sidebarStatus.textContent = state.serverSearchQuery ? `${data.total} matching companies` : `${data.total} assigned companies`;
if(state.selectedCompanyId && !listOnly){
await loadPrimaryContact(state.selectedCompanyId);
}
} catch (error) {
console.error("Company load failed:", error);
ui.sidebarStatus.textContent = "Could not reach backend";
state.companies = [];
state.selectedCompanyId = "";
state.pinnedCompanyId = "";
state.focusCompanyId = "";
renderProspectList();
CQBus.emit('render:detail');
updateProgress();
renderEmailOpensIndicator();
} finally {
state.loadingCompanies = false;
}
}
async function loadPrimaryContact(companyId){
try {
const res=await fetch(`${API}/api/app/company/${companyId}/contact`);
const data=await res.json();
if(!data.ok || !data.contact) return;
const local=getCompanyState(companyId);
local.contactFirst=local.contactFirst || data.contact.firstName||"";
local.contactLast=local.contactLast || data.contact.lastName||"";
local.email=local.email || data.contact.email||"";
local.phone=local.phone || data.contact.phone||"";
local.linkedin=local.linkedin || normalizeLinkedInUrl(data.contact.linkedinUrl||"");
queueCompanyStateSave(companyId, { delay: 50 });
if(state.selectedCompanyId===companyId){
syncFormFieldsFromState(companyId);
CQBus.emit('render:detail');
}
renderProspectList();
} catch(e){}
}
async function hydrateSearchContacts(companies = []){
return;
}
async function updateStatusInHubSpot(companyId, status, options = {}){
try{
const payload = { status };
if(options?.hubspotOwnerId){
payload.hubspotOwnerId = String(options.hubspotOwnerId);
}
const res=await fetch(`${API}/api/app/company/${companyId}/status`,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(payload)
});
const data=await res.json();
return !!data.ok;
} catch(e){ return false; }
}
async function manualRefresh(){
ui.sidebarStatus.textContent="Refreshing cache...";
const res=await fetch(`${API}/api/app/refresh`,{method:"POST"});
const data=await res.json();
if(!data.ok){
ui.sidebarStatus.textContent="Refresh failed";
return;
}
await loadBootstrap();
await loadCompaniesForOwner();
}
ui.sidebarToggleBtn?.addEventListener("click", toggleSidebar);
ui.ownerSelect.addEventListener("change", async()=>{
if(!isAdminUser()){
syncOwnerSelectorUi();
return;
}
state.selectedOwnerId=ui.ownerSelect.value;
state.focusCompanyId = "";
updateProgress();
await syncSelectedOwnerRemoteData();
await loadCompaniesForOwner({ preserveWorkspace: true, listOnly: true });
});
function syncSortUiDisplay(){
const sortSelect = ui.sortBox;
if(!sortSelect) return;
const currentValue = String(sortSelect.value || 'dueDate');
const selectedOption = Array.from(sortSelect.options || []).find(option => String(option.value || '') === currentValue) || sortSelect.options[sortSelect.selectedIndex] || null;
const proxyBtn = document.getElementById('sortProxyBtn');
const proxyLabel = proxyBtn?.querySelector('.sortProxyBtnLabel');
if(proxyLabel){
proxyLabel.textContent = selectedOption ? selectedOption.textContent : 'Sort';
}
const proxyMenu = document.getElementById('sortProxyMenu');
if(proxyMenu){
proxyMenu.querySelectorAll('[data-sort-value]').forEach(button => {
button.classList.toggle('active', String(button.getAttribute('data-sort-value') || '') === currentValue);
});
}
}
async function clearSearchAndSortBeforeBoardTools(){
const searchValue = String(ui.searchBox?.value || '').trim();
const sortValue = String(ui.sortBox?.value || 'dueDate').trim() || 'dueDate';
const needsReset = !!searchValue || sortValue !== 'dueDate';
if(!needsReset) return false;
if(ui.searchBox) ui.searchBox.value = '';
if(ui.sortBox) ui.sortBox.value = 'dueDate';
syncSortUiDisplay();
state.serverSearchQuery = '';
resetProspectPagination();
await loadCompaniesForOwner({ preserveWorkspace: true, listOnly: true });
return true;
}

ui.actionBoardBtn.addEventListener("click", async () => {
closeAllFocusTaskChangeMenus();
const currentId = String(state.selectedCompanyId || "").trim();
if(hasPendingNextDueLock(currentId)){
showNextDueLockToast();
setView("detail");
CQBus.emit('render:detail');
return;
}
await clearSearchAndSortBeforeBoardTools();
const dueTodayItems = sortFocusItemsByStoredOrder(getActionItems().filter(item => item.dueToday));
const topBoardItem = dueTodayItems[0] || getActionItems()[0] || null;
if(topBoardItem?.company?.id){
syncBoardSelection(topBoardItem.company.id);
loadPrimaryContact(String(topBoardItem.company.id));
renderProspectList();
}
setView("board");
CQBus.emit('render:board');
CQBus.emit('render:detail');
});
ui.companyDetailBtn.addEventListener("click", () => {
closeAllFocusTaskChangeMenus();
const targetCompanyId = state.selectedCompanyId || window.WorkspaceDoor?.getDefaultDetailCompanyId?.();
if(targetCompanyId){
state.selectedCompanyId = String(targetCompanyId);
state.pinnedCompanyId = String(targetCompanyId);
renderProspectList();
loadPrimaryContact(String(targetCompanyId));
}
setView("detail");
CQBus.emit('render:detail');
});
document.getElementById("detailWebsiteIcon")?.addEventListener("click", (e) => {
const companyId = e.currentTarget?.dataset?.openWebsite;
if(companyId) openCompanyWebsite(e, companyId);
});
let topGearOpenedAt = 0;
if(ui.emailTemplateGear){
const toggleTopGearMenu = (forceOpen = null) => {
if(!ui.topGearMenu) return;
const shouldOpen = forceOpen === null ? !ui.topGearMenu.classList.contains("open") : !!forceOpen;
ui.topGearMenu.classList.toggle("open", shouldOpen);
if(shouldOpen) topGearOpenedAt = Date.now();
};
ui.emailTemplateGear.addEventListener("click", (e) => {
e.preventDefault();
e.stopPropagation();
toggleTopGearMenu();
});
ui.emailTemplateGear.addEventListener("keydown", (e) => {
if(e.key !== "Enter" && e.key !== " ") return;
e.preventDefault();
e.stopPropagation();
toggleTopGearMenu();
});
ui.topGearMenu?.addEventListener("pointerdown", (e) => e.stopPropagation());
ui.topGearMenu?.addEventListener("click", (e) => e.stopPropagation());
}
if(ui.topAdjustTemplatesOption){
ui.topAdjustTemplatesOption.addEventListener("click", (e) => {
e.preventDefault();
e.stopPropagation();
ui.topGearMenu?.classList.remove("open");
openSettingsQuillComposer();
});
}
if(ui.topAddUserOption){
ui.topAddUserOption.addEventListener("click", (e) => {
e.preventDefault();
e.stopPropagation();
openAddUserModal();
});
}
if(ui.topActivityReportOption){
ui.topActivityReportOption.addEventListener("click", (e) => {
e.preventDefault();
e.stopPropagation();
openActivityReportModal();
});
}
if(ui.closeActivityReportBtn){
ui.closeActivityReportBtn.addEventListener("click", closeActivityReportModal);
}
if(ui.activityReportModal){
ui.activityReportModal.addEventListener("click", (e) => {
if(e.target === ui.activityReportModal) closeActivityReportModal();
});
}
if(ui.activityReportMineBtn){
ui.activityReportMineBtn.addEventListener("click", () => {
state.activityReportScope = "mine";
renderActivityReport();
});
}
if(ui.activityReportTeamBtn){
ui.activityReportTeamBtn.addEventListener("click", () => {
state.activityReportScope = "team";
renderActivityReport();
});
}
if(ui.completedTodayBtn){
ui.completedTodayBtn.addEventListener("click", (e) => {
e.preventDefault();
e.stopPropagation();
state.activityTrailDay = state.activityTrailDay || 'today';
openCompletedTrailModal();
});
}
if(ui.closeCompletedTrailBtn){
ui.closeCompletedTrailBtn.addEventListener("click", closeCompletedTrailModal);
}
if(ui.completedTrailModal){
ui.completedTrailModal.addEventListener("click", (e) => {
if(e.target === ui.completedTrailModal) closeCompletedTrailModal();
});
}
if(ui.completedTrailDaySelect){
ui.completedTrailDaySelect.addEventListener("change", async () => {
state.activityTrailDay = String(ui.completedTrailDaySelect.value || 'today');
await renderCompletedTrailModal();
});
}
if(ui.completedTrailShareBtn){
ui.completedTrailShareBtn.addEventListener("click", shareCompletedTrailReport);
}
if(ui.activityReportMonthSelect){
ui.activityReportMonthSelect.addEventListener("change", () => {
state.activityReportMonthOffset = Number(ui.activityReportMonthSelect.value || 0);
renderActivityReport();
});
}
if(ui.printActivityReportBtn){
ui.printActivityReportBtn.addEventListener("click", printActivityReport);
}
if(ui.shareActivityReportBtn){
ui.shareActivityReportBtn.addEventListener("click", shareActivityReport);
}
if(ui.progressText){
ui.progressText.style.cursor = "default";
ui.progressText.removeAttribute("title");
}
if(ui.calendarTasksModal){
ui.calendarTasksModal.addEventListener("click", (e) => {
if(e.target === ui.calendarTasksModal) closeCalendarTasksModal();
});
}
if(ui.calendarViewBtn){
ui.calendarViewBtn.addEventListener('click', async (e) => {
e.preventDefault();
e.stopPropagation();
await clearSearchAndSortBeforeBoardTools();
openCalendarTasksModal();
});
}
if(ui.closeCalendarTasksBtn){
ui.closeCalendarTasksBtn.addEventListener('click', closeCalendarTasksModal);
}
if(ui.calendarPrevMonthBtn){
ui.calendarPrevMonthBtn.addEventListener('click', () => shiftCalendarMonth(-1));
}
if(ui.calendarNextMonthBtn){
ui.calendarNextMonthBtn.addEventListener('click', () => shiftCalendarMonth(1));
}
function openPriorityEditor(event){
if(event){
  event.preventDefault?.();
  event.stopPropagation?.();
}
if(!state.selectedCompanyId || !ui.priorityMenu || !ui.statusMenu) return;
const open = ui.priorityMenu.classList.contains("open");
ui.statusMenu.classList.remove("open");
ui.priorityMenu.classList.toggle("open", !open);
}
function openStatusEditor(event){
if(event){
  event.preventDefault?.();
  event.stopPropagation?.();
}
if(!state.selectedCompanyId || !ui.statusMenu || !ui.priorityMenu) return;
const open = ui.statusMenu.classList.contains("open");
ui.priorityMenu.classList.remove("open");
ui.statusMenu.classList.toggle("open", !open);
}
function openDueDateEditor(event){
if(event){
  event.preventDefault?.();
  event.stopPropagation?.();
}
if(!state.selectedCompanyId) return;
openDateInputPicker(ui.dueDateInput);
}
function bindDetailTapTarget(target, handler){
if(!target || target.dataset.detailTapBound === "1") return;
const clickHandler = (event) => {
  const menuTarget = event.target?.closest?.('.gearMenu, .statusMenu, .focusTemplateMenu, .detailCadencePickerMenu, .priorityMenu, [data-priority-option], [data-status-option], input, select, textarea, a, .calendarBadgeInputWrap');
  if(menuTarget) return;
  handler(event);
};
  target.addEventListener('click', clickHandler);
  target.addEventListener('keydown', (event) => {
    if(event.key === 'Enter' || event.key === ' '){
      handler(event);
    }
  });
  target.dataset.detailTapBound = "1";
}
ui.priorityCurrentBtn.addEventListener("click", openPriorityEditor);
ui.statusCurrentBtn.addEventListener("click", openStatusEditor);
ui.priorityMenu.querySelectorAll("[data-priority-option]").forEach(btn => {
btn.addEventListener("click", async () => {
if(!state.selectedCompanyId) return;
const companyId = state.selectedCompanyId;
const previousPriority = getCompanyPriority(companyId);
const nextPriority = btn.dataset.priorityOption;
if(previousPriority === nextPriority){
ui.priorityMenu.classList.remove("open");
return;
}
setCompanyState(companyId, { priority: nextPriority });
ui.priorityMenu.classList.remove("open");
renderPriorityPills(companyId);
renderProspectList();
CQBus.emit('render:board');
try{
await savePriorityOnBackend(companyId, nextPriority);
ui.sidebarStatus.textContent = `Priority saved as ${getPriorityLabel(nextPriority)}`;
setTimeout(() => {
if(ui.sidebarStatus.textContent === `Priority saved as ${getPriorityLabel(nextPriority)}`){
ui.sidebarStatus.textContent = '';
}
}, 1600);
} catch(error){
console.error('Priority save failed:', error);
setCompanyState(companyId, { priority: previousPriority });
renderPriorityPills(companyId);
renderProspectList();
CQBus.emit('render:board');
ui.sidebarStatus.textContent = error?.message || 'Priority failed to save';
}
});
});
ui.statusMenu.querySelectorAll("[data-status-option]").forEach(btn => {
btn.addEventListener("click", async () => {
if(!state.selectedCompanyId) return;
ui.statusMenu.classList.remove("open");
await applyCompanyStatusChange(state.selectedCompanyId, btn.dataset.statusOption);
});
});
ui.dueDateInput?.addEventListener("change", async () => {
if(!state.selectedCompanyId || !ui.dueDateInput.value) return;
await applyNextDueDate(state.selectedCompanyId, ui.dueDateInput.value);
});
ui.detailCalendarBadge?.addEventListener("click", openDueDateEditor);
bindDetailTapTarget(ui.detailMetaRow, openPriorityEditor);
bindDetailTapTarget(ui.statusRow, openStatusEditor);
bindDetailTapTarget(ui.dueDateField, openDueDateEditor);
function openDateInputPicker(input){
if(!input) return;
const now = Date.now();
const lastOpenAt = Number(input.dataset.pickerOpenedAt || 0);
if(now - lastOpenAt < 250) return;
input.dataset.pickerOpenedAt = String(now);
try{
input.focus({ preventScroll:true });
}catch(_err){
try{ input.focus(); }catch(__err){}
}
try{
if(typeof input.showPicker === 'function'){
try{
  if(document.hasFocus() && document.activeElement === input && typeof input?.showPicker === "function"){
    input.showPicker();
  }
} catch(err){
  console.warn("showPicker skipped", err);
}
return;
}
}catch(_err){}
try{ input.click(); }catch(_err){}
}
function ensureFocusDuePickerModal(){
if(document.getElementById('focusDuePickerModal')) return document.getElementById('focusDuePickerModal');
const modal = document.createElement('div');
modal.id = 'focusDuePickerModal';
modal.className = 'modalBackdrop focusDuePickerModal';
modal.setAttribute('aria-hidden','true');
modal.innerHTML = `
  <div class="modalCard" role="dialog" aria-modal="true" aria-labelledby="focusDuePickerTitle">
    <div class="modalHead">
      <div>
        <h2 class="modalTitle" id="focusDuePickerTitle">Choose Due Date</h2>
        <p class="modalSub" id="focusDuePickerSub">Set the next follow-up date.</p>
      </div>
      <button class="modalCloseBtn" id="focusDuePickerCloseBtn" type="button" aria-label="Close">×</button>
    </div>
    <div class="contactField">
      <label class="contactLabel" for="focusDuePickerInput">Due Date</label>
      <input class="input" id="focusDuePickerInput" type="date" />
      <div class="focusDuePickerMeta">This keeps the picker in the same visual family as the rest of the workspace.</div>
    </div>
    <div class="focusDuePickerQuickRow">
      <button class="focusDuePickerQuickBtn" type="button" data-focus-picker-offset="0">Today</button>
      <button class="focusDuePickerQuickBtn" type="button" data-focus-picker-offset="1">Tomorrow</button>
      <button class="focusDuePickerQuickBtn" type="button" data-focus-picker-offset="7">+7 Days</button>
      <button class="focusDuePickerQuickBtn" type="button" data-focus-picker-clear="1">Clear</button>
    </div>
    <div class="modalActions">
      <button class="smallBtn" id="focusDuePickerCancelBtn" type="button">Cancel</button>
      <button class="actionBtn primary" id="focusDuePickerSaveBtn" type="button">Save Date</button>
    </div>
  </div>`;
(document.body || document.documentElement).appendChild(modal);
const close = () => closeFocusDuePickerModal();
modal.addEventListener('click', (event) => {
  if(event.target === modal) close();
});
modal.querySelector('#focusDuePickerCloseBtn')?.addEventListener('click', close);
modal.querySelector('#focusDuePickerCancelBtn')?.addEventListener('click', close);
modal.querySelector('#focusDuePickerSaveBtn')?.addEventListener('click', async () => {
  const companyId = modal.dataset.companyId || '';
  const input = modal.querySelector('#focusDuePickerInput');
  const value = String(input?.value || '').trim();
  if(!companyId || !value) return;
  await applyNextDueDate(companyId, value);
  const sourceInput = modal._sourceInput;
  if(sourceInput) sourceInput.value = value;
  closeFocusDuePickerModal();
});
modal.querySelectorAll('[data-focus-picker-offset]').forEach(btn => {
  btn.addEventListener('click', () => {
    const offset = Number(btn.getAttribute('data-focus-picker-offset') || 0);
    const input = modal.querySelector('#focusDuePickerInput');
    if(input) input.value = getIsoDateWithOffset(offset);
  });
});
modal.querySelector('[data-focus-picker-clear]')?.addEventListener('click', async () => {
  const companyId = modal.dataset.companyId || '';
  if(!companyId) return;
  await clearNextDueDate(companyId);
  const input = modal.querySelector('#focusDuePickerInput');
  if(input) input.value = '';
  const sourceInput = modal._sourceInput;
  if(sourceInput) sourceInput.value = '';
  closeFocusDuePickerModal();
});
return modal;
}
function openFocusDuePickerModal(companyId, sourceInput, label){
const modal = ensureFocusDuePickerModal();
const input = modal.querySelector('#focusDuePickerInput');
const sub = modal.querySelector('#focusDuePickerSub');
modal.dataset.companyId = String(companyId || '');
modal._sourceInput = sourceInput || null;
if(sub) sub.textContent = label ? `Set the next follow-up date for ${label}.` : 'Set the next follow-up date.';
if(input){
  input.value = String(sourceInput?.value || getBackendDueDateIso(companyId) || '').slice(0,10);
}
modal.classList.add('open');
modal.setAttribute('aria-hidden','false');
modal.inert = false;
requestAnimationFrame(() => { try{ input?.focus({ preventScroll:true }); }catch(_err){ try{ input?.focus(); }catch(__err){} } });
}
function closeFocusDuePickerModal(){
const modal = document.getElementById('focusDuePickerModal');
if(!modal) return;
modal.classList.remove('open');
modal.setAttribute('aria-hidden','true');
modal.inert = true;
}
document.addEventListener('click', async (e) => {
const dueField = e.target.closest('.dueDateField, .dueInlineRow');
if(!dueField) return;
if(e.target.closest('input, a, select, option, .focusTaskChangeWrap, .focusTaskChangeMenu')) return;
if(e.target.closest('button') && !e.target.closest('.calendarBadgeTrigger')) return;
const dateInput = dueField.querySelector('.dueDateInput');
if(!dateInput) return;
e.preventDefault();
e.stopPropagation();
openDateInputPicker(dateInput);
});
ui.nextDueTodayBtn?.addEventListener("click", async () => {
if(!state.selectedCompanyId) return;
await applyNextDueDate(state.selectedCompanyId, getIsoDateWithOffset(0));
});
ui.nextDueTomorrowBtn?.addEventListener("click", async () => {
if(!state.selectedCompanyId) return;
await applyNextDueDate(state.selectedCompanyId, getIsoDateWithOffset(1));
});
ui.nextDueThreeBtn?.addEventListener("click", async () => {
if(!state.selectedCompanyId) return;
await applyNextDueDate(state.selectedCompanyId, getIsoDateWithOffset(3));
});
ui.nextDueWeekBtn?.addEventListener("click", async () => {
if(!state.selectedCompanyId) return;
await applyNextDueDate(state.selectedCompanyId, getIsoDateWithOffset(7));
});
ui.nextDueCustomBtn?.addEventListener("click", () => {
ui.nextDueCustomWrap.classList.toggle("active");
if(ui.nextDueCustomWrap.classList.contains("active")){
ui.nextDueCustomInput.focus();
try {
  if (
    document.hasFocus() &&
    document.activeElement === ui.nextDueCustomInput &&
    typeof ui.nextDueCustomInput?.showPicker === "function"
  ) {
    ui.nextDueCustomInput.showPicker();
  }
} catch (err) {
  console.warn("showPicker skipped", err);
}
}
});
ui.nextDueCustomInput?.addEventListener("change", async () => {
if(!state.selectedCompanyId || !ui.nextDueCustomInput.value) return;
await applyNextDueDate(state.selectedCompanyId, ui.nextDueCustomInput.value);
});
ui.searchBox.addEventListener("focus", ()=>{
if(!isMobileDrawerViewport()) return;
pinSearchIntoView();
setTimeout(pinSearchIntoView, 120);
});
ui.searchBox.addEventListener("blur", ()=>{
if(!isMobileDrawerViewport()) return;
releaseSearchViewportPin(180);
});
ui.searchBox.addEventListener("input", ()=>{
state.serverSearchQuery = String(ui.searchBox?.value || "").trim();
resetProspectPagination();
clearTimeout(state.searchDebounceTimer);
state.searchDebounceTimer = setTimeout(async ()=>{
await loadCompaniesForOwner({ preserveWorkspace: true, listOnly: true });
}, 180);
});
ui.sortBox.addEventListener("change", async()=>{
state.serverSearchQuery = String(ui.searchBox?.value || "").trim();
resetProspectPagination();
await loadCompaniesForOwner({ preserveWorkspace: true, listOnly: true });
});
document.addEventListener('change', async (e) => {
const dueInput = e.target.closest('[data-focus-due-company]');
if(!dueInput) return;
const companyId = dueInput.dataset.focusDueCompany;
if(!companyId || !dueInput.value) return;
await applyNextDueDate(companyId, dueInput.value);
});
document.addEventListener('click', async (e) => {
const dueRow = e.target.closest('.dueInlineRow');
if(dueRow && !e.target.closest('input, a, select, option, .focusTaskChangeWrap, .focusTaskChangeMenu') && !(e.target.closest('button') && !e.target.closest('.calendarBadgeTrigger'))){
const dueInput = dueRow.querySelector('input[type="date"]');
if(dueInput){
e.preventDefault();
e.stopPropagation();
if (typeof dueInput.showPicker === "function") {
  try {
    if (
      document.hasFocus() &&
      document.activeElement === dueInput &&
      typeof dueInput?.showPicker === "function"
    ) {
      dueInput.showPicker();
    }
  } catch (err) {
    console.warn("showPicker skipped", err);
  }
} else {
  dueInput.focus();
  dueInput.click();
}
return;
}
}
});
document.addEventListener('click', (e) => {
const badgeTrigger = e.target.closest('.tfClusterDateTrigger');
if(!badgeTrigger) return;
const dueInput = badgeTrigger.querySelector('.dueDateInput');
if(!dueInput) return;
e.preventDefault();
e.stopPropagation();
const companyId = dueInput.dataset.focusDueCompany || dueInput.dataset.companyId || '';
const label = badgeTrigger.getAttribute('aria-label') || '';
openFocusDuePickerModal(companyId, dueInput, label.replace(/^Set due date for\s*/i,''));
});
document.addEventListener('keydown', (e) => {
if(e.key !== 'Enter' && e.key !== ' ') return;
const badgeTrigger = e.target.closest('.calendarBadgeTrigger');
if(!badgeTrigger) return;
const dueInput = badgeTrigger.querySelector('.dueDateInput');
if(!dueInput) return;
e.preventDefault();
if(badgeTrigger.classList.contains('tfClusterDateTrigger')){
  const companyId = dueInput.dataset.focusDueCompany || dueInput.dataset.companyId || '';
  const label = badgeTrigger.getAttribute('aria-label') || '';
  openFocusDuePickerModal(companyId, dueInput, label.replace(/^Set due date for\s*/i,''));
  return;
}
openDateInputPicker(dueInput);
});

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && document.getElementById('focusDuePickerModal')?.classList.contains('open')){
    closeFocusDuePickerModal();
  }
  if(e.key === 'Escape' && document.getElementById('mailerReviewModal')?.classList.contains('open')){
    closeMailerReviewModal();
  }
});
if(ui.detailSettingsBtn){
ui.detailSettingsBtn.addEventListener('click', (e) => {
e.preventDefault();
e.stopPropagation();
const isOpen = ui.detailSettingsMenu.classList.contains('open');
closeDetailSettingsMenu();
if(!isOpen) ui.detailSettingsMenu.classList.add('open');
});
}
function openSettingsQuillComposer(){
const fallbackCompanyId = String(state.selectedCompanyId || state.pinnedCompanyId || (window.WorkspaceDoor?.getDefaultDetailCompanyId?.() || '')).trim();
if(fallbackCompanyId){
state.selectedCompanyId = fallbackCompanyId;
state.pinnedCompanyId = fallbackCompanyId;
if(state.currentView !== 'detail' && typeof setView === 'function') setView('detail');
if(typeof renderProspectList === 'function') renderProspectList();
if(typeof renderCompanyWorkspace === 'function') CQBus.emit('render:detail');
if(typeof loadPrimaryContact === 'function') loadPrimaryContact(fallbackCompanyId);
if(state.emailEditor){
state.emailEditor.companyId = fallbackCompanyId;
const nextIndex = typeof getCurrentNextTouchZeroIndex === 'function' ? getCurrentNextTouchZeroIndex(fallbackCompanyId) : 0;
state.emailEditor.touchIndex = Number.isInteger(nextIndex) && nextIndex >= 0 ? nextIndex : 0;
}
}
closeDetailSettingsMenu();
openQuillComposerModal();
}
if(ui.detailAdjustTemplatesBtn){
ui.detailAdjustTemplatesBtn.addEventListener('click', (e) => {
e.preventDefault();
e.stopPropagation();
openSettingsQuillComposer();
});
}
if(ui.detailSettingsCloseBtn){
ui.detailSettingsCloseBtn.addEventListener('click', (e) => {
e.preventDefault();
closeDetailTemplateSettings();
});
}
if(ui.detailTemplateSelect){
ui.detailTemplateSelect.addEventListener('change', () => {
state.detailTemplateEditor.templateKey = ui.detailTemplateSelect.value || getDetailTemplateOptions()[0]?.value || 'websiteVisit';
renderDetailTemplateEditor();
});
}
if(ui.detailTemplateSaveBtn){
ui.detailTemplateSaveBtn.addEventListener('click', (e) => {
e.preventDefault();
const ownerId = state.selectedOwnerId || 'default';
const templateKey = ui.detailTemplateSelect.value || state.detailTemplateEditor.templateKey || 'websiteVisit';
const templateName = ui.detailTemplateName?.value || '';
saveOwnerEmailTemplateOverride(ownerId, templateKey, ui.detailTemplateSubject.value, ui.detailTemplateBody.value, templateName);
renderDetailTemplateEditor();
ui.sidebarStatus.textContent = 'Email template saved';
showAdvanceToast('Template Saved');
CQBus.emit('render:detail');
});
}
if(ui.detailTemplateResetBtn){
ui.detailTemplateResetBtn.addEventListener('click', (e) => {
e.preventDefault();
const ownerId = state.selectedOwnerId || 'default';
const templateKey = ui.detailTemplateSelect.value || state.detailTemplateEditor.templateKey || 'websiteVisit';
const wasCustom = isCustomEmailTemplate(ownerId, templateKey);
resetOwnerEmailTemplateOverride(ownerId, templateKey);
renderDetailTemplateEditor();
ui.sidebarStatus.textContent = wasCustom ? 'Custom template cleared' : 'Template reset';
showAdvanceToast(wasCustom ? 'Template Cleared' : 'Template Reset');
CQBus.emit('render:detail');
});
}
if(ui.detailTemplateAddBtn){
ui.detailTemplateAddBtn.addEventListener('click', (e) => {
e.preventDefault();
const ownerId = state.selectedOwnerId || 'default';
const selectedLabel = getDetailTemplateOptions().find(option => option.value === (ui.detailTemplateSelect.value || state.detailTemplateEditor.templateKey))?.label || 'Template';
const nextKey = createOwnerCustomEmailTemplate(ownerId, `${selectedLabel} Copy`, ui.detailTemplateSubject.value, ui.detailTemplateBody.value);
state.detailTemplateEditor.templateKey = nextKey;
renderDetailTemplateEditor();
ui.sidebarStatus.textContent = 'New template created';
showAdvanceToast('Template Added');
CQBus.emit('render:detail');
});
}
if(ui.detailTemplateDeleteBtn){
ui.detailTemplateDeleteBtn.addEventListener('click', (e) => {
e.preventDefault();
const ownerId = state.selectedOwnerId || 'default';
const templateKey = ui.detailTemplateSelect.value || state.detailTemplateEditor.templateKey || '';
if(!deleteOwnerCustomEmailTemplate(ownerId, templateKey)){
ui.sidebarStatus.textContent = 'Only custom templates can be deleted';
return;
}
state.detailTemplateEditor.templateKey = getDetailTemplateOptions()[0]?.value || 'websiteVisit';
renderDetailTemplateEditor();
ui.sidebarStatus.textContent = 'Template deleted';
showAdvanceToast('Template Deleted');
CQBus.emit('render:detail');
});
}
document.addEventListener('click', async (e) => {
const detailEngagementToggle = e.target.closest('#detailEngagementIconBtn');
if(detailEngagementToggle && ui.detailEngagementPopover){
e.preventDefault();
e.stopPropagation();
const willOpen = !ui.detailEngagementPopover.classList.contains('open');
ui.detailEngagementPopover.classList.toggle('open', willOpen);
detailEngagementToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
if(ui.detailEmailOpenStats) ui.detailEmailOpenStats.hidden = !willOpen;
return;
}
if(ui.detailEngagementPopover && !e.target.closest('#detailEngagementPopover')){
ui.detailEngagementPopover.classList.remove('open');
if(ui.detailEngagementIconBtn) ui.detailEngagementIconBtn.setAttribute('aria-expanded', 'false');
if(ui.detailEmailOpenStats) ui.detailEmailOpenStats.hidden = true;
}
const focusTaskToggle = e.target.closest('[data-focus-task-toggle], .focusTaskChangeBtn');
const focusTaskMenu = e.target.closest('.focusTaskChangeMenu');
const focusTemplateMenu = e.target.closest('.focusTemplateMenu');
if(!focusTaskToggle && !focusTaskMenu && !focusTemplateMenu && !e.target.closest('[data-focus-template-toggle]')){
closeAllFocusTaskChangeMenus();
closeAllFocusTemplateMenus();
}
if(focusTaskToggle){
e.preventDefault();
e.stopPropagation();
const wrap = focusTaskToggle.closest('.focusTaskChangeWrap');
const menu = wrap?.querySelector('.focusTaskChangeMenu');
if(!menu) return;
const isDetailToggle = focusTaskToggle.id === 'detailTaskChangeBtn' || wrap?.id === 'detailTaskChangeWrap' || menu?.id === 'detailTaskChangeMenu';
if(isDetailToggle){
const companyId = state.selectedCompanyId;
const nextTouchIndex = companyId ? getCurrentNextTouchZeroIndex(companyId) : -1;
if(!companyId || nextTouchIndex === -1) return;
focusTaskToggle.dataset.focusTaskToggle = String(companyId);
focusTaskToggle.dataset.focusIndex = String(nextTouchIndex);
menu.innerHTML = buildTaskChangeOptionsMarkup(companyId, nextTouchIndex);
}
const open = menu.classList.contains('open');
closeAllFocusTaskChangeMenus();
if(!open || isDetailToggle){
smartPositionMenu(focusTaskToggle, menu);
menu.classList.add('open');
menu.style.display = 'block';
menu.style.opacity = '1';
menu.style.visibility = 'visible';
}
return;
}
const focusTemplateToggle = e.target.closest('[data-focus-template-toggle]');
if(focusTemplateToggle){
e.preventDefault();
e.stopPropagation();
const wrap = focusTemplateToggle.parentElement;
const menu = wrap?.querySelector('.focusTemplateMenu');
if(!menu) return;
const open = menu.classList.contains('open');
closeAllFocusTaskChangeMenus();
closeAllFocusTemplateMenus();
if(!open){
smartPositionMenu(focusTemplateToggle, menu);
menu.classList.add('open');
menu.style.display = 'block';
menu.style.opacity = '1';
menu.style.visibility = 'visible';
}
return;
}
const focusEmailTemplateBtn = e.target.closest('[data-focus-email-template]');
if(focusEmailTemplateBtn){
e.preventDefault();
e.stopPropagation();
const companyId = focusEmailTemplateBtn.dataset.focusCompany;
const touchIndex = Number(focusEmailTemplateBtn.dataset.focusIndex);
const templateKey = focusEmailTemplateBtn.dataset.focusEmailTemplate || 'websiteVisit';
const ownerIdForTouch = state.selectedOwnerId || 'default';
setOwnerEmailTemplateSelection(ownerIdForTouch, touchIndex, templateKey);
setCompanyTouchTemplateSelection(companyId, touchIndex, templateKey);
closeAllFocusTemplateMenus();
if(String(state.selectedCompanyId) === String(companyId)){
renderDetailSummary(companyId);
CQBus.emit('render:detail');
}
renderTouches(companyId);
CQBus.emit('render:board');
ui.sidebarStatus.textContent = 'Email template selected';
showAdvanceToast('Template Updated');
return;
}
const focusMailerTemplateBtn = e.target.closest('[data-focus-mailer-template]');
if(focusMailerTemplateBtn){
e.preventDefault();
e.stopPropagation();
const companyId = focusMailerTemplateBtn.dataset.focusCompany;
const touchIndex = Number(focusMailerTemplateBtn.dataset.focusIndex);
const templateKey = focusMailerTemplateBtn.dataset.focusMailerTemplate || '';
setCompanyTouchTemplateSelection(companyId, touchIndex, templateKey);
closeAllFocusTemplateMenus();
if(String(state.selectedCompanyId) === String(companyId)){
renderDetailSummary(companyId);
CQBus.emit('render:detail');
}
renderTouches(companyId);
CQBus.emit('render:board');
ui.sidebarStatus.textContent = 'Mailer template selected';
showAdvanceToast('Mailer Saved');
return;
}
const focusAdjustTemplateBtn = e.target.closest('[data-focus-adjust-template]');
if(focusAdjustTemplateBtn){
e.preventDefault();
e.stopPropagation();
const touchIndex = Number(focusAdjustTemplateBtn.dataset.focusIndex);
const ownerIdForTouch = state.selectedOwnerId || 'default';
const selectedKey = getOwnerEmailTemplateSelection(ownerIdForTouch, touchIndex);
closeAllFocusTaskChangeMenus();
openDetailTemplateSettings(selectedKey);
return;
}
const focusTaskTypeBtn = e.target.closest('[data-focus-task-type]');
if(focusTaskTypeBtn){
e.preventDefault();
e.stopPropagation();
const companyId = focusTaskTypeBtn.dataset.focusCompany;
const touchIndex = Number(focusTaskTypeBtn.dataset.focusIndex);
const taskType = focusTaskTypeBtn.dataset.focusTaskType || '';
try{
const baseTouch = getTouchTemplate(companyId)[touchIndex];
const currentTouch = getEffectiveTouch(companyId, touchIndex) || baseTouch;
const wasCompleted = isTouchChecked(companyId, touchIndex);
const touchHistory = Array.isArray(getProspectingState(companyId)?.touch_history) ? getProspectingState(companyId).touch_history : [];
const completedRecord = touchHistory.find(item => Number(item?.index) === touchIndex + 1) || null;
const previousType = getTouchOverrideType(companyId, touchIndex) || getDefaultTaskTypeFromTouch(currentTouch) || "detail";
const resolvedTaskType = taskType || getDefaultTaskTypeFromTouch(baseTouch) || "detail";
const result = await saveTouchOverrideOnBackend(companyId, touchIndex, taskType, {
touchIndex: touchIndex + 1,
resolvedTaskType,
oldTaskType: previousType,
completedAt: wasCompleted && completedRecord?.completedAt ? completedRecord.completedAt : null,
ownerId: completedRecord?.ownerId || null,
ownerName: completedRecord?.ownerName || null,
touchTitle: `Touch ${touchIndex + 1} — ${(TASK_TYPE_CONFIG[resolvedTaskType]?.label || baseTouch?.title || `Touch ${touchIndex + 1}`)}`,
notes: completedRecord?.notes || String(ui.notesBox?.value || getCompanyState(companyId).notes || "").trim(),
nextDueDate: getBackendDueDateIso(companyId)
});
if(wasCompleted && completedRecord?.completedAt){
completedRecord.taskType = result?.activityUpdate?.newTaskType || resolvedTaskType;
completedRecord.statCategory = result?.activityUpdate?.statCategory || mapTaskTypeToStatCategory(resolvedTaskType) || "other";
await refreshSelectedOwnerCompletedStats();
}
closeAllFocusTaskChangeMenus();
CQBus.emit('render:board');
if(String(state.selectedCompanyId) === String(companyId)) CQBus.emit('render:detail');
renderProspectList();
renderWeeklyStats();
const pulseBox = focusTaskTypeBtn.closest('.nextStepBox, .focusInlineRow, .detailInlineRow');
if(pulseBox){
pulseBox.classList.remove('focusNextStepPulse');
void pulseBox.offsetWidth;
pulseBox.classList.add('focusNextStepPulse');
setTimeout(() => pulseBox.classList.remove('focusNextStepPulse'), 450);
}
} catch(error){
console.error(error);
ui.sidebarStatus.textContent = error.message || 'Could not update task';
}
return;
}
const calendarDateBtn = e.target.closest('[data-calendar-date]');
if(calendarDateBtn){
e.preventDefault();
e.stopPropagation();
setCalendarSelectedDate(calendarDateBtn.dataset.calendarDate || '');
return;
}
const companyLink = e.target.closest('[data-open-company]');
if(companyLink){
e.stopPropagation();
if(ui.calendarTasksModal?.classList.contains('open')) closeCalendarTasksModal();
openCompanyDetail(companyLink.dataset.openCompany);
return;
}
if(!e.target.closest('.statusMenuWrap')) closeAllStatusMenus();
if(!e.target.closest('.taskChangeWrap')) closeAllTaskChangeMenus();
if(!focusTaskMenu && !focusTaskToggle) closeAllFocusTaskChangeMenus();
if(!e.target.closest('.detailSettingsWrap')) closeDetailSettingsMenu();
if(!e.target.closest('.detailSelector')){
ui.priorityMenu.classList.remove('open');
ui.statusMenu.classList.remove('open');
}
});
["input","change"].forEach(evt=>{
ui.notesBox.addEventListener(evt, () => { saveFormFieldsToState(); queueNotesSave(); });
ui.contactFirst.addEventListener(evt, saveFormFieldsToState);
ui.contactLast.addEventListener(evt, saveFormFieldsToState);
ui.prospectEmail.addEventListener(evt, saveFormFieldsToState);
ui.prospectPhone.addEventListener(evt, saveFormFieldsToState);
ui.prospectLinkedIn.addEventListener(evt, saveFormFieldsToState);
ui.companyDomain.addEventListener(evt, saveFormFieldsToState);
ui.companyAddress.addEventListener(evt, saveFormFieldsToState);
});
ui.openLinkedInBtn.addEventListener("click", ()=>{
const url=normalizeLinkedInUrl(ui.prospectLinkedIn.value);
if(!url) return;
window.open(url,"_blank","noopener,noreferrer");
});
function toggleTouchPatternExpanded(event){
if(event){
  event.preventDefault?.();
  event.stopPropagation?.();
}
if(!state.selectedCompanyId) return;
setTouchPatternExpanded(!state.touchPatternExpanded);
}
ui.touchToggle?.addEventListener("click", toggleTouchPatternExpanded);
ui.currentTitle?.addEventListener("click", toggleTouchPatternExpanded);
ui.currentTitle?.setAttribute?.("role", "button");
ui.currentTitle?.setAttribute?.("tabindex", "0");
ui.currentTitle?.addEventListener("keydown", (e) => {
  if(e.key === 'Enter' || e.key === ' '){
    toggleTouchPatternExpanded(e);
  }
});
const touchSectionHeader = ui.touchToggle?.parentElement || null;
if(touchSectionHeader && touchSectionHeader !== ui.touchToggle && touchSectionHeader.dataset.touchHeaderBound !== "1") {
  touchSectionHeader.addEventListener("click", (e) => {
    const clickedToggle = e.target?.closest?.("#touchToggle, .gearOnlyBtn, button, input, select, textarea, a");
    if(clickedToggle && clickedToggle !== ui.currentTitle) return;
    toggleTouchPatternExpanded(e);
  });
  touchSectionHeader.dataset.touchHeaderBound = "1";
}
document.addEventListener("click", (e) => {
const toggle = e.target.closest("#touchToggle, #currentTitle");
if(!toggle) return;
toggleTouchPatternExpanded(e);
});
if(ui.addCompanyBtn) ui.addCompanyBtn.addEventListener("click", openAddCompanyModal);
if(ui.detailFocusBtn) ui.detailFocusBtn.addEventListener("click", ()=>{
const companyId = String(ui.detailFocusBtn.dataset.companyId || state.selectedCompanyId || "").trim();
if(!companyId) return;
const movedToTop = promoteCompanyToTopOfFocusQueue(companyId);
if(!movedToTop) return;
setView("board");
renderProspectList();
CQBus.emit('render:detail');
CQBus.emit('render:board');
ui.sidebarStatus.textContent = "Company moved to top of Today's Queue";
});
if(ui.detailActionBtn) ui.detailActionBtn.addEventListener("click", (event)=>{ if(ui.detailActionBtn.style.display==="none") return;
event.preventDefault();
event.stopPropagation();
const companyId = String(ui.detailActionBtn.dataset.companyId || state.selectedCompanyId || "").trim();
if(!companyId) return;
const actionKind = String(ui.detailActionBtn.dataset.actionKind || inferActionKindFromNextTouchText(ui.detailNextTouch?.textContent || "") || "").trim();
performActionKindForCompany(companyId, actionKind);
});
ui.closeQuickNotesModalBtn?.addEventListener("click", closeQuickNotesModal);
ui.cancelQuickNotesBtn?.addEventListener("click", closeQuickNotesModal);
ui.saveQuickNotesBtn?.addEventListener("click", saveQuickNotesModal);
ui.quickNotesModal?.addEventListener("click", (event) => {
if(event.target === ui.quickNotesModal) closeQuickNotesModal();
});
ui.quickNotesBox?.addEventListener("keydown", (event) => {
if((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s"){
event.preventDefault();
saveQuickNotesModal();
}
});
[ui.focusSearchBtn].filter(Boolean).forEach((btn) => {
btn.addEventListener("click", (event) => { event.preventDefault(); openProspectSearch(); });
btn.addEventListener("pointerup", (event) => { event.preventDefault(); openProspectSearch(); });
btn.addEventListener("touchend", (event) => { event.preventDefault(); openProspectSearch(); }, { passive:false });
});
[ui.focusNotesBtn].filter(Boolean).forEach((btn) => {
const triggerQuickNotes = (event) => {
if(event){
event.preventDefault();
event.stopPropagation();
}
openQuickNotesModal();
};
btn.onclick = triggerQuickNotes;
btn.addEventListener("pointerup", triggerQuickNotes);
btn.addEventListener("click", triggerQuickNotes);
btn.addEventListener("touchend", triggerQuickNotes, { passive:false });
});
if(ui.focusAddCompanyBtn) ui.focusAddCompanyBtn.addEventListener("click", openAddCompanyModal);
ui.closeAddCompanyModalBtn?.addEventListener("click", closeAddCompanyModal);
ui.cancelAddCompanyBtn?.addEventListener("click", closeAddCompanyModal);
ui.submitAddCompanyBtn?.addEventListener("click", createCompanyFromModal);
ui.desktopManualEntryBtn?.addEventListener("click", () => { setAddProspectMode("manual"); if(ui.desktopNearbyStatus) ui.desktopNearbyStatus.textContent = "Fill in the prospect details and create when ready."; });
ui.desktopNearbyEntryBtn?.addEventListener("click", loadDesktopNearbyMatches);
ui.desktopScanCardBtn?.addEventListener("click", openDesktopScanModal);
ui.desktopNearbyResults?.addEventListener("click", (event) => { const nearbyBtn = event.target.closest("[data-desktop-nearby-pick]"); if(!nearbyBtn) return; const matchId = String(nearbyBtn.dataset.desktopNearbyPick || "").trim(); const match = (desktopNearbyMatches || []).find((item, index) => String(item?.id || index) === matchId) || null; fillAddCompanyFormFromNearbyMatch(match); });
ui.closeDesktopScanModalBtn?.addEventListener("click", closeDesktopScanModal);
ui.desktopScanCameraBackBtn?.addEventListener("click", exitDesktopLiveCamera);
ui.desktopScanModal?.addEventListener("click", (event) => { if(event.target === ui.desktopScanModal) closeDesktopScanModal(); });
ui.desktopChoosePhotoBtn?.addEventListener("click", () => ui.desktopCardImageInput?.click());
ui.desktopCardImageInput?.addEventListener("change", async (event) => { const file = event.target?.files?.[0]; if(!file) return; try { const dataUrl = await readFileAsDataUrl(file); stopDesktopLiveCamera(); updateDesktopScanPreview(dataUrl); if(ui.desktopScanMessage) ui.desktopScanMessage.textContent = "Photo ready. Click Grab Info when you are ready."; } catch(error) { if(ui.desktopScanMessage) ui.desktopScanMessage.textContent = error.message; } finally { event.target.value = ""; } });
ui.desktopStartCameraBtn?.addEventListener("click", startDesktopLiveCamera);
ui.desktopCaptureFrameBtn?.addEventListener("click", captureDesktopCameraFrame);
ui.desktopRunCardScanBtn?.addEventListener("click", runDesktopBusinessCardScan);
if(ui.deleteCompanyBtn) ui.deleteCompanyBtn.addEventListener("click", deleteSelectedCompany);
ui.addCompanyModal?.addEventListener("click", (e) => {
if(e.target === ui.addCompanyModal) closeAddCompanyModal();
});
[ui.newCompanyName, ui.newCompanyDomain, ui.newPrimaryContact, ui.newCompanyEmail, ui.newCompanyPhone, ui.newCompanyAddress]
.filter(Boolean)
.forEach(el => {
el.addEventListener("keydown", (e) => {
if(e.key === "Enter"){
e.preventDefault();
createCompanyFromModal();
}
});
});
document.addEventListener("keydown", (e) => {
if(e.key === "Escape" && ui.desktopScanModal?.classList.contains("open")){
closeDesktopScanModal();
return;
}
if(e.key === "Escape" && ui.addCompanyModal?.classList.contains("open")){
closeAddCompanyModal();
}
});
authUi.form?.addEventListener("submit", async (event) => {
event.preventDefault();
const email = String(authUi.email?.value || "").trim();
const password = String(authUi.password?.value || "");
const rememberMe = !!authUi.remember?.checked;
if(!email || !password){
setAuthMessage("error", "Email and password are required.");
return;
}
try{
setAuthMessage("error", "");
setAuthMessage("success", "");
if(authUi.submit){
authUi.submit.disabled = true;
authUi.submit.textContent = "Logging In...";
}
resetSessionUiState();
const loginResult = await loginWithPassword(email, password, rememberMe);
if(loginResult?.mfaEnrollmentRequired){
  setAuthMessage("success", "");
  pendingMfaEnrollmentMode = true;
  mfaState.status = await fetchPendingMfaStatus();
  if(authUi.mfaForm) authUi.mfaForm.style.display = "none";
  hideAuthOverlayForModal();
  openMfaModal({ skipRefresh:true });
  await handleStartMfaSetup();
  return;
}
if(loginResult?.mfaRequired){
  showMfaLoginForm("Enter your authenticator code to finish signing in.", "verify");
  return;
}
hideLogin();
await initApp();
} catch (error){
if(error?.captchaRequired){
  showPasswordLoginForm(error.message || "Please complete the security check to continue.", "error", { preserveLoginTurnstile: true });
  renderLoginTurnstileWhenReady();
} else {
  setAuthMessage("error", error.message || "Login failed");
}
} finally {
if(authUi.submit){
authUi.submit.disabled = false;
authUi.submit.textContent = "Log In";
}
}
});
authUi.showForgotPasswordBtn?.addEventListener("click", () => {
if(authUi.forgotEmail && authUi.email?.value){
authUi.forgotEmail.value = String(authUi.email.value || "").trim();
}
showForgotPassword();
});
authUi.backToLoginBtn?.addEventListener("click", () => {
showLogin("", "error");
});
authUi.backToPasswordBtn?.addEventListener("click", () => {
  closeMfaModal();
  pendingMfaEnrollmentMode = false;
  restoreAuthOverlayForLogin();
  showLogin("", "error");
});
authUi.mfaForm?.addEventListener("submit", async (event) => {
event.preventDefault();
const code = String(authUi.mfaCode?.value || "").trim();
if(!code){
setMfaLoginMessage("error", "Enter your authenticator code or a backup code.");
return;
}
try{
setMfaLoginMessage("error", "");
if(authUi.mfaSubmit){ authUi.mfaSubmit.disabled = true; authUi.mfaSubmit.textContent = "Verifying..."; }
let user = null;
if(pendingMfaEnrollmentMode){
  user = await verifyPendingMfaSetupRequest(code);
}else if(mfaState.setup){
  user = await verifyPendingMfaSetupRequest(code);
}else{
  user = await verifyLoginMfa(code);
}
state.authUser = user;
window.__prospectAuthUser = user;
pendingMfaEnrollmentMode = false;
hideLogin();
await initApp();
} catch(error){
setMfaLoginMessage("error", error.message || "Verification failed");
} finally {
if(authUi.mfaSubmit){ authUi.mfaSubmit.disabled = false; authUi.mfaSubmit.textContent = "Verify Code"; }
}
});
authUi.forgotForm?.addEventListener("submit", async (event) => {
event.preventDefault();
const email = String(authUi.forgotEmail?.value || "").trim();
if(!email){
setForgotMessage("error", "Email is required.");
return;
}
try{
setForgotMessage("error", "");
setForgotMessage("success", "");
if(authUi.forgotSubmit){
authUi.forgotSubmit.disabled = true;
authUi.forgotSubmit.textContent = "Sending...";
}
await requestPasswordReset(email);
setForgotMessage("success", "Reset link sent. Check your email.");
} catch (error){
setForgotMessage("error", error.message || "Unable to send reset link");
} finally {
if(authUi.forgotSubmit){
authUi.forgotSubmit.disabled = false;
authUi.forgotSubmit.textContent = "Send Reset Link";
}
}
});
ui.closeAddUserModalBtn?.addEventListener("click", closeAddUserModal);
ui.cancelAddUserBtn?.addEventListener("click", closeAddUserModal);
ui.submitAddUserBtn?.addEventListener("click", submitAddUser);
ui.newUserEmail?.addEventListener("blur", autoMatchAddUserOwner);
ui.addUserModal?.addEventListener("click", (e) => {
if(e.target === ui.addUserModal) closeAddUserModal();
});
ui.refreshManageUsersBtn?.addEventListener("click", () => {
if(ui.manageUsersSuccess) ui.manageUsersSuccess.textContent = '';
loadManageUsers();
});
ui.manageUsersList?.addEventListener("change", async (e) => {
const select = e.target?.closest?.("[data-user-role]");
if(!select) return;
const userId = select.getAttribute("data-user-role");
const role = String(select.value || "tc").trim().toLowerCase();
try{
if(ui.manageUsersError) ui.manageUsersError.textContent = '';
if(ui.manageUsersSuccess) ui.manageUsersSuccess.textContent = '';
await updateManagedUserRole(userId, role);
} catch(error){
if(ui.manageUsersError) ui.manageUsersError.textContent = error.message || 'Failed to update role';
await loadManageUsers(true);
}
});

ui.manageUsersList?.addEventListener("click", async (e) => {
const openBtn = e.target?.closest?.("[data-user-open-cadence]");
if(openBtn){
openManageUserCadenceModal(openBtn.getAttribute("data-user-open-cadence"));
return;
}
const saveBtn = e.target?.closest?.("[data-user-save-cadence]");
if(!saveBtn) return;
const userId = saveBtn.getAttribute("data-user-save-cadence");
try{
if(ui.manageUsersError) ui.manageUsersError.textContent = '';
if(ui.manageUsersSuccess) ui.manageUsersSuccess.textContent = '';
saveBtn.disabled = true;
saveBtn.textContent = 'Saving...';
await saveManagedUserCadenceAccess(userId);
if(ui.manageUsersSuccess) ui.manageUsersSuccess.textContent = 'Cadence access updated.';
} catch(error){
if(ui.manageUsersError) ui.manageUsersError.textContent = error.message || 'Failed to update cadence access';
renderManageUsers();
}
});
ui.manageUsersList?.addEventListener("change", async (e) => {
if(!e.target?.matches?.("[data-user-mfa-required]")) return;
const userId = e.target.getAttribute("data-user-mfa-required");
const required = !!e.target.checked;
try{
if(ui.manageUsersError) ui.manageUsersError.textContent = "";
if(ui.manageUsersSuccess) ui.manageUsersSuccess.textContent = "";
const updatedUser = await updateManagedUserMfaRequired(userId, required);
state.manageUsers = state.manageUsers.map(user => String(user.id) === String(userId) ? { ...user, mfaRequired: !!updatedUser?.mfaRequired } : user);
renderManageUsers();
if(ui.manageUsersSuccess) ui.manageUsersSuccess.textContent = required ? "MFA requirement enabled." : "MFA requirement removed.";
} catch(error){
e.target.checked = !required;
if(ui.manageUsersError) ui.manageUsersError.textContent = error.message || "Failed to update MFA requirement";
}
});
ui.manageUsersList?.addEventListener("click", async (e) => {
const resetBtn = e.target?.closest?.("[data-user-reset-mfa]");
if(resetBtn){
const userId = resetBtn.getAttribute("data-user-reset-mfa");
try{
if(ui.manageUsersError) ui.manageUsersError.textContent = '';
if(ui.manageUsersSuccess) ui.manageUsersSuccess.textContent = '';
const updatedUser = await resetManagedUserMfa(userId);
if(updatedUser){
state.manageUsers = state.manageUsers.map(user => String(user.id) === String(userId) ? { ...user, ...updatedUser } : user);
renderManageUsers();
}
if(ui.manageUsersSuccess) ui.manageUsersSuccess.textContent = 'MFA reset. User will need to set it up again.';
} catch(error){
if(ui.manageUsersError) ui.manageUsersError.textContent = error.message || 'Failed to reset MFA';
}
return;
}
const btn = e.target?.closest?.("[data-user-delete]");
if(!btn) return;
const userId = btn.getAttribute("data-user-delete");
try{
if(ui.manageUsersError) ui.manageUsersError.textContent = '';
if(ui.manageUsersSuccess) ui.manageUsersSuccess.textContent = '';
await deleteManagedUser(userId);
} catch(error){
if(ui.manageUsersError) ui.manageUsersError.textContent = error.message || 'Failed to delete user';
}
});
document.addEventListener("click", (e) => {
if(ui.topGearMenu?.classList.contains("open")){
const withinTopGear = e.target instanceof Element && (e.target.closest("#topGearWrap") || e.target.closest("#topGearMenu"));
if(!withinTopGear && (Date.now() - topGearOpenedAt) > 150) ui.topGearMenu.classList.remove("open");
}
});
authUi.logout?.addEventListener("click", async () => {
await logoutUser();
});
/* --- Reporting / completed trail (moved to reporting.js Phase 3) --- */
function bindCalendarModalV2(){ if(window.bindCalendarModalV2) window.bindCalendarModalV2(); }
function getActivityReportRange(monthOffset){ return window.getActivityReportRange ? window.getActivityReportRange(monthOffset) : {}; }
function getAllOwnersInCompanies(){ return window.getAllOwnersInCompanies ? window.getAllOwnersInCompanies() : []; }
function setDonut(el, segments){ if(window.setDonut) window.setDonut(el, segments); }
function renderAheadBars(el, ahead){ if(window.renderAheadBars) window.renderAheadBars(el, ahead); }
function renderReportBars(el, items, options){ if(window.renderReportBars) window.renderReportBars(el, items, options); }
function renderActivityLegend(el, items){ if(window.renderActivityLegend) window.renderActivityLegend(el, items); }
function getActivityReportScopeLabel(){ return window.getActivityReportScopeLabel ? window.getActivityReportScopeLabel() : ''; }
function getActivityReportMonthLabel(){ return window.getActivityReportMonthLabel ? window.getActivityReportMonthLabel() : ''; }
function setActivityReportStatus(msg){ if(window.setActivityReportStatus) window.setActivityReportStatus(msg); }
function buildActivityReportShareText(data){ return window.buildActivityReportShareText ? window.buildActivityReportShareText(data) : ''; }
function renderActivityPrintMeta(data){ if(window.renderActivityPrintMeta) window.renderActivityPrintMeta(data); }
function printActivityReport(){ if(window.printActivityReport) window.printActivityReport(); }
async function shareActivityReport(){ if(window.shareActivityReport) return window.shareActivityReport(); }
async function renderActivityReport(){ if(window.renderActivityReport) return window.renderActivityReport(); }
function syncCompletedTrailUiRefs(){ if(window.syncCompletedTrailUiRefs) window.syncCompletedTrailUiRefs(); }
function attachCompletedTrailUiHandlers(){ if(window.attachCompletedTrailUiHandlers) window.attachCompletedTrailUiHandlers(); }
function getCompletedTrailDayLabel(v){ return window.getCompletedTrailDayLabel ? window.getCompletedTrailDayLabel(v) : ''; }
function getCompletedTrailCacheKey(v){ return window.getCompletedTrailCacheKey ? window.getCompletedTrailCacheKey(v) : ''; }
function getRelativeDateRange(v){ return window.getRelativeDateRange ? window.getRelativeDateRange(v) : {}; }
function normalizeCompletedTrailItem(item){ return window.normalizeCompletedTrailItem ? window.normalizeCompletedTrailItem(item) : item; }
async function fetchCompletedTrailItemsFromBackend(v){ return window.fetchCompletedTrailItemsFromBackend ? window.fetchCompletedTrailItemsFromBackend(v) : []; }
function getCompletedTrailItems(v){ return window.getCompletedTrailItems ? window.getCompletedTrailItems(v) : []; }
function setCompletedTrailStatus(msg){ if(window.setCompletedTrailStatus) window.setCompletedTrailStatus(msg); }
function getCompletedTrailSummary(items){ return window.getCompletedTrailSummary ? window.getCompletedTrailSummary(items) : {}; }
function getCompletedTrailDateLine(v){ return window.getCompletedTrailDateLine ? window.getCompletedTrailDateLine(v) : ''; }
function renderCompletedTrailReportMeta(items){ if(window.renderCompletedTrailReportMeta) window.renderCompletedTrailReportMeta(items); }
async function buildCompletedTrailShareText(v){ return window.buildCompletedTrailShareText ? window.buildCompletedTrailShareText(v) : ''; }
function getCompactTouchLabelForPrint(item){ return window.getCompactTouchLabelForPrint ? window.getCompactTouchLabelForPrint(item) : ''; }
function buildCompletedTrailPdfDocument(){ return window.buildCompletedTrailPdfDocument ? window.buildCompletedTrailPdfDocument() : ''; }
function cleanupCompletedTrailPrintFrame(){ if(window.cleanupCompletedTrailPrintFrame) window.cleanupCompletedTrailPrintFrame(); }
async function shareCompletedTrailReport(){ if(window.shareCompletedTrailReport) return window.shareCompletedTrailReport(); }
async function renderCompletedTrailModal(){ if(window.renderCompletedTrailModal) return window.renderCompletedTrailModal(); }
async function openCompletedTrailModal(){ if(window.openCompletedTrailModal) return window.openCompletedTrailModal(); }
function closeCompletedTrailModal(){ if(window.closeCompletedTrailModal) window.closeCompletedTrailModal(); }
function openActivityReportModal(){ if(window.openActivityReportModal) window.openActivityReportModal(); }
function closeActivityReportModal(){ if(window.closeActivityReportModal) window.closeActivityReportModal(); }
/* -- MFA / security (moved to security.js Phase 4) -- */
function setMfaMessage(t,m){ if(window.setMfaMessage) window.setMfaMessage(t,m); }
function resetMfaTransientUi(){ if(window.resetMfaTransientUi) window.resetMfaTransientUi(); }
function renderMfaBackupCodes(c){ if(window.renderMfaBackupCodes) window.renderMfaBackupCodes(c); }
function renderMfaStatus(s){ if(window.renderMfaStatus) window.renderMfaStatus(s); }
async function fetchMfaStatus(){ if(window.fetchMfaStatus) return window.fetchMfaStatus(); }
async function startMfaSetupRequest(){ if(window.startMfaSetupRequest) return window.startMfaSetupRequest(); }
async function verifyMfaSetupRequest(c){ if(window.verifyMfaSetupRequest) return window.verifyMfaSetupRequest(c); }
async function disableMfaRequest(p){ if(window.disableMfaRequest) return window.disableMfaRequest(p); }
async function refreshMfaStatusUi(o){ if(window.refreshMfaStatusUi) return window.refreshMfaStatusUi(o); }
function openMfaModal(o){ if(window.openMfaModal) window.openMfaModal(o); }
function closeMfaModal(){ if(window.closeMfaModal) window.closeMfaModal(); }
function bindMfaUi(){ if(window.bindMfaUi) window.bindMfaUi(); }

async function initApp(){
try {
state.defaultVertical = "legal";
const user = await ensureAuthenticated();
if(!user) return;
resetSessionUiState();
state.authUser = user;
window.__prospectAuthUser = user;
renderAdminControls();
refreshMfaStatusUi().catch(function(){});
await loadBootstrap();
if(state.selectedOwnerId){
await loadCompaniesForOwner({ preserveWorkspace: false });
} else if(state.owners.length){
state.selectedOwnerId = getPreferredSelectedOwnerId();
if(state.selectedOwnerId){
ui.ownerSelect.value = state.selectedOwnerId;
await loadCompaniesForOwner({ preserveWorkspace: false });
}
}
updateProgress();
CQBus.emit('render:detail');
CQBus.emit('render:board');
CQBus.emit('notifications:init');
CQBus.emit('notifications:sync');
} catch (error) {
ui.sidebarStatus.textContent = error?.message === "Unauthorized" ? "Please sign in" : "Could not connect to HubSpot";
console.error(error);
if(String(error?.message || "").toLowerCase().includes("unauthorized")) showLogin("Please sign in to continue.");
}
}

/* === Workspace compatibility bridge: globals expected by app.js listeners === */
function workspaceLegacySyncBoardSelection(companyId){
const normalizedId = String(companyId || "").trim();
if(!normalizedId) return;
const currentId = String(state.selectedCompanyId || "").trim();
if(currentId && currentId !== normalizedId && typeof hasPendingNextDueLock === "function" && hasPendingNextDueLock(currentId)){
if(typeof showNextDueLockToast === "function") showNextDueLockToast();
return;
}
state.selectedCompanyId = normalizedId;
state.pinnedCompanyId = normalizedId;
state.focusCompanyId = normalizedId;
}

function syncBoardSelection(companyId){
if(window.WorkspaceDoor && typeof window.WorkspaceDoor.syncBoardSelection === "function"){
return window.WorkspaceDoor.syncBoardSelection(companyId);
}
return workspaceLegacySyncBoardSelection(companyId);
}
window.syncBoardSelection = syncBoardSelection;

function workspaceLegacyOpenCompanyDetail(companyId){
if(!companyId) return;
const targetId = String(companyId).trim();
const currentId = String(state.selectedCompanyId || "").trim();
if(currentId && currentId !== targetId && typeof hasPendingNextDueLock === "function" && hasPendingNextDueLock(currentId)){
if(typeof showNextDueLockToast === "function") showNextDueLockToast();
return;
}
state.selectedCompanyId = targetId;
state.pinnedCompanyId = targetId;
if(typeof collapseSidebarForSelection === "function") collapseSidebarForSelection();
if(typeof setView === "function") setView("detail");
if(typeof renderProspectList === "function") renderProspectList();
CQBus.emit('render:detail');
CQBus.emit('render:board');
if(typeof loadPrimaryContact === "function") loadPrimaryContact(targetId);
if(typeof requestAnimationFrame === "function" && typeof scrollWorkspaceToTop === "function"){
requestAnimationFrame(() => scrollWorkspaceToTop());
}
}

function openCompanyDetail(companyId){
if(window.WorkspaceDoor && typeof window.WorkspaceDoor.openCompanyDetail === "function"){
return window.WorkspaceDoor.openCompanyDetail(companyId);
}
return workspaceLegacyOpenCompanyDetail(companyId);
}
window.openCompanyDetail = openCompanyDetail;

function workspaceLegacySkipTopFocusCompany(){
const items = (typeof sortFocusItemsByStoredOrder === "function"
  ? sortFocusItemsByStoredOrder((typeof getActionItems === "function" ? getActionItems() : []).filter(item => item && item.dueToday))
  : ((typeof getActionItems === "function" ? getActionItems() : []).filter(item => item && item.dueToday)));
if(items.length <= 1) return;
const currentTopId = String(items[0]?.company?.id || "");
if(!currentTopId) return;
const rotated = items.slice(1).map(item => String(item.company.id)).concat(currentTopId);
if(typeof setStoredFocusQueueOrder === "function") setStoredFocusQueueOrder(rotated);
const nextTopId = rotated[0] || "";
if(nextTopId) syncBoardSelection(nextTopId);
if(typeof renderProspectList === "function") renderProspectList();
CQBus.emit('render:board');
CQBus.emit('render:detail');
if(nextTopId && typeof loadPrimaryContact === "function") loadPrimaryContact(nextTopId);
}

function skipTopFocusCompany(){
if(window.WorkspaceDoor && typeof window.WorkspaceDoor.skipTopFocusCompany === "function"){
return window.WorkspaceDoor.skipTopFocusCompany();
}
return workspaceLegacySkipTopFocusCompany();
}
window.skipTopFocusCompany = skipTopFocusCompany;
/* === End workspace compatibility bridge === */

initApp();
function updateSidebarLabel(){
const sidebarPanelEl = document.getElementById('sidebarPanel');
const sidebarToggleLabelEl = document.getElementById('sidebarToggleLabel');
const sidebarToggleRowEl = document.getElementById('sidebarToggleRow');
if(!sidebarPanelEl || !sidebarToggleLabelEl) return;
const isCollapsed = sidebarPanelEl.classList.contains('collapsed');
if(isCollapsed){
sidebarToggleLabelEl.textContent = 'Show All Prospects';
} else {
sidebarToggleLabelEl.textContent = 'Hide Prospects';
}
if(sidebarToggleRowEl){
sidebarToggleRowEl.setAttribute('aria-expanded', String(!isCollapsed));
}
}
const sidebarToggleBtnEl = document.getElementById('sidebarToggleBtn');
const sidebarToggleLabelEl = document.getElementById('sidebarToggleLabel');
const sidebarToggleRowEl = document.getElementById('sidebarToggleRow');
if(sidebarToggleRowEl && sidebarToggleBtnEl){
sidebarToggleRowEl?.addEventListener('click', (event)=>{
if(event.target === sidebarToggleBtnEl) return;
sidebarToggleBtnEl.click();
});
sidebarToggleRowEl.addEventListener('keydown', (event)=>{
if(event.key === 'Enter' || event.key === ' '){
event.preventDefault();
sidebarToggleBtnEl.click();
}
});
}
if(sidebarToggleBtnEl){
sidebarToggleBtnEl?.addEventListener('click', ()=>{
setTimeout(updateSidebarLabel, 0);
});
}
updateSidebarLabel();
refreshSearchViewportLayout();
window.addEventListener('resize', refreshSearchViewportLayout, { passive: true });
if(window.visualViewport){
window.visualViewport.addEventListener('resize', refreshSearchViewportLayout, { passive: true });
window.visualViewport.addEventListener('scroll', refreshSearchViewportLayout, { passive: true });
}
if(ui.mobileDrawerBackdrop){
ui.mobileDrawerBackdrop.addEventListener('click', ()=>{
if(document.body.classList.contains('searching-sidebar')){
try{ closeMobileSearchOverlay(true); }catch(_){
document.body.classList.remove('searching-sidebar');
try{ ui.searchBox?.blur(); }catch(__){}
}
return;
}
if(!isMobileDrawerViewport() || state.sidebarCollapsed) return;
state.sidebarCollapsed = true;
if(state.local?.ui) state.local.ui.sidebarCollapsed = true;
saveLocalState();
renderSidebarState();
updateSidebarLabel();
});
}
if(ui.prospectList){
ui.prospectList.addEventListener('scroll', () => {
if(!state.prospectHasMore) return;
const remaining = ui.prospectList.scrollHeight - ui.prospectList.scrollTop - ui.prospectList.clientHeight;
if(remaining <= 160){
loadMoreProspects();
}
}, { passive: true });
}
if(ui.prospectList){
ui.prospectList.addEventListener('click', (event)=>{
if(!isMobileDrawerViewport()) return;
if(!event.target.closest('.cardRow')) return;
requestAnimationFrame(()=>{
state.sidebarCollapsed = true;
if(state.local?.ui) state.local.ui.sidebarCollapsed = true;
saveLocalState();
renderSidebarState();
updateSidebarLabel();
});
});
}
document.addEventListener("click", async function(event){
const btn = event.target.closest("[data-task-change-option], [data-focus-task-change-option]");
if(!btn) return;
event.stopPropagation();
const companyId = btn.dataset.companyId;
const zeroIndex = Number(btn.dataset.touchIndex);
const selectedType = String(btn.dataset.taskType || "").trim() || null;
if(!companyId || Number.isNaN(zeroIndex)) return;
const touch = getEffectiveTouch(companyId, zeroIndex) || getTouchTemplate(companyId)[zeroIndex];
const wasCompleted = isTouchChecked(companyId, zeroIndex);
const touchHistory = Array.isArray(getProspectingState(companyId)?.touch_history) ? getProspectingState(companyId).touch_history : [];
const completedRecord = touchHistory.find(item => Number(item?.index) === zeroIndex + 1) || null;
const previousType = getTouchOverrideType(companyId, zeroIndex) || getDefaultTaskTypeFromTouch(touch) || "detail";
try{
const baseTouch = getTouchTemplate(companyId)[zeroIndex];
const resolvedTaskType = selectedType || getDefaultTaskTypeFromTouch(baseTouch) || "detail";
const result = await saveTouchOverrideOnBackend(companyId, zeroIndex, selectedType, {
touchIndex: zeroIndex + 1,
resolvedTaskType,
oldTaskType: previousType,
completedAt: wasCompleted && completedRecord?.completedAt ? completedRecord.completedAt : null,
ownerId: completedRecord?.ownerId || null,
ownerName: completedRecord?.ownerName || null,
touchTitle: `Touch ${zeroIndex + 1} — ${(TASK_TYPE_CONFIG[resolvedTaskType]?.label || baseTouch?.title || `Touch ${zeroIndex + 1}`)}`,
notes: completedRecord?.notes || String(ui.notesBox?.value || getCompanyState(companyId).notes || "").trim(),
nextDueDate: getBackendDueDateIso(companyId)
});
if(wasCompleted && completedRecord?.completedAt){
completedRecord.taskType = result?.activityUpdate?.newTaskType || resolvedTaskType;
completedRecord.statCategory = result?.activityUpdate?.statCategory || mapTaskTypeToStatCategory(resolvedTaskType) || "other";
await refreshSelectedOwnerCompletedStats();
ui.sidebarStatus.textContent = "Completed task updated";
} else {
ui.sidebarStatus.textContent = selectedType ? "Task type updated" : "Task reset to default";
}
} catch(error){
console.error(error);
ui.sidebarStatus.textContent = error.message || "Could not update task";
}
closeAllTaskChangeMenus();
CQBus.emit('render:detail');
renderProspectList();
renderFocusBoard();
}, true);



/* -- Add-company modal init (moved to capture.js Phase 4) -- */
/* Event listeners and DOMContentLoaded bindings for the add-company modal
   are now handled inside capture.js which re-registers them on load. */


const MOBILE_LAYOUT_BREAKPOINT = 980;
let lastSidebarMobileMode = null;
function syncSidebarForViewport(options = {}) {
const force = !!options.force;
const isMobileLayout = window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT;
if (typeof state === "undefined") return;
if (lastSidebarMobileMode === null || force) {
if (isMobileLayout) {
state.sidebarCollapsed = true;
if (state.local?.ui) state.local.ui.sidebarCollapsed = true;
} else {
state.sidebarCollapsed = false;
if (state.local?.ui) state.local.ui.sidebarCollapsed = false;
}
if (typeof renderSidebarState === "function") renderSidebarState();
if (typeof updateSidebarLabel === "function") updateSidebarLabel();
lastSidebarMobileMode = isMobileLayout;
return;
}
if (isMobileLayout === lastSidebarMobileMode) return;
state.sidebarCollapsed = isMobileLayout ? true : false;
if (state.local?.ui) state.local.ui.sidebarCollapsed = state.sidebarCollapsed;
if (typeof saveLocalState === "function") saveLocalState();
if (typeof renderSidebarState === "function") renderSidebarState();
if (typeof updateSidebarLabel === "function") updateSidebarLabel();
if (typeof renderActionBoard === "function") CQBus.emit('render:board');
lastSidebarMobileMode = isMobileLayout;
}
window.addEventListener('load', () => syncSidebarForViewport({ force: true }));
window.addEventListener('resize', () => syncSidebarForViewport());



function getMobileDrawerTriggerElement() {
return ui?.upNextList?.closest('.boardSection') || ui?.upNextList || ui?.todayFocusList || null;
}
function shouldHideDrawerForField(el) {
if (!isMobileDrawerViewport() || !el || !(el instanceof Element)) return false;
if (!el.matches('input, select, textarea, [contenteditable="true"], [contenteditable=""]')) return false;
if (el.closest('#sidebarPanel')) return false;
return true;
}
function updateMobileDrawerReveal() {
if (!document.body) return;
if (!isMobileDrawerViewport()) {
document.body.classList.remove('mobile-drawer-ready');
document.body.classList.remove('mobile-editing');
return;
}
const editing = shouldHideDrawerForField(document.activeElement);
document.body.classList.toggle('mobile-editing', editing);
if (!state?.sidebarCollapsed) {
document.body.classList.add('mobile-drawer-ready');
return;
}
const triggerEl = getMobileDrawerTriggerElement();
let ready = false;
if (triggerEl) {
const rect = triggerEl.getBoundingClientRect();
ready = rect.bottom <= (window.innerHeight - 32);
} else {
ready = window.scrollY > 220;
}
if (editing) ready = false;
document.body.classList.toggle('mobile-drawer-ready', ready);
}
window.addEventListener('scroll', updateMobileDrawerReveal, { passive: true });
window.addEventListener('resize', updateMobileDrawerReveal);
window.addEventListener('load', () => requestAnimationFrame(updateMobileDrawerReveal));
document.addEventListener('focusin', () => updateMobileDrawerReveal());
document.addEventListener('focusout', () => setTimeout(updateMobileDrawerReveal, 0));
const originalRenderActionBoard = window.renderActionBoard;
if (typeof originalRenderActionBoard === 'function') {
window.renderActionBoard = function(...args) {
const result = originalRenderActionBoard.apply(this, args);
requestAnimationFrame(updateMobileDrawerReveal);
return result;
};
}



(function () {
const recentlyOpened = new WeakMap();
function openDatePicker(input) {
if (!input) return;
const last = recentlyOpened.get(input) || 0;
const now = Date.now();
if (now - last < 350) return;
recentlyOpened.set(input, now);
try {
input.focus({ preventScroll: true });
} catch (_) {
input.focus();
}
if (typeof input.showPicker === 'function') {
try {
if (
  document.hasFocus() &&
  document.activeElement === input &&
  typeof input?.showPicker === "function"
) {
  input.showPicker();
}
} catch (err) {
console.warn("showPicker skipped", err);
}
return;
}
try { input.click(); } catch (_) {}
}
function handleDueRowInteraction(e) {
const row = e.target.closest('.dueInlineRow');
if (!row) return;
if (e.target.closest('button, a, select, option, .focusTaskChangeWrap, .focusTaskChangeMenu')) return;
const input = row.querySelector('.dueDateInput');
if (!input) return;
e.preventDefault();
e.stopPropagation();
if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
openDatePicker(input);
}
document.addEventListener('pointerdown', handleDueRowInteraction, true);
document.addEventListener('mousedown', handleDueRowInteraction, true);
document.addEventListener('touchstart', handleDueRowInteraction, { capture: true, passive: false });
})();



(function(){
let startX = 0;
let startY = 0;
let tracking = false;
let armedDirection = null;
const threshold = 60;
const previewThreshold = 18;
function isMobileSwipeViewport(){
return window.matchMedia('(max-width: 980px)').matches;
}
function validSwipeTarget(target){
return !!target && !target.closest('input, textarea, select, button, a, .statusMenu, .detailMenu, .gearMenu, .taskChangeMenu, .focusTaskChangeMenu, .modalBackdrop, .layout-sidebar');
}
function clearSwipePreview(){
const panel = ui && ui.workspacePanel;
if(!panel) return;
panel.classList.remove('swipe-armed','swipe-press-next','swipe-press-prev');
armedDirection = null;
}
document.addEventListener('touchstart', function(e){
if(!isMobileSwipeViewport()) return;
if(!validSwipeTarget(e.target)) { tracking = false; clearSwipePreview(); return; }
const t = e.changedTouches && e.changedTouches[0];
if(!t) return;
ensureFeedbackAudio();
startX = t.clientX;
startY = t.clientY;
tracking = true;
const panel = ui && ui.workspacePanel;
if(panel){
panel.classList.add('swipe-armed');
}
}, { passive: true });
document.addEventListener('touchmove', function(e){
if(!isMobileSwipeViewport() || !tracking) return;
const t = e.changedTouches && e.changedTouches[0];
if(!t) return;
const dx = t.clientX - startX;
const dy = t.clientY - startY;
const panel = ui && ui.workspacePanel;
if(!panel) return;
if(Math.abs(dx) < previewThreshold || Math.abs(dx) < Math.abs(dy) * 1.1){
panel.classList.remove('swipe-press-next','swipe-press-prev');
armedDirection = null;
return;
}
const nextDirection = dx < 0 ? 'next' : 'prev';
if(armedDirection !== nextDirection){
panel.classList.remove('swipe-press-next','swipe-press-prev');
panel.classList.add(nextDirection === 'next' ? 'swipe-press-next' : 'swipe-press-prev');
armedDirection = nextDirection;
}
}, { passive: true });
document.addEventListener('touchcancel', function(){
tracking = false;
clearSwipePreview();
}, { passive: true });
document.addEventListener('touchend', function(e){
if(!isMobileSwipeViewport() || !tracking) return;
tracking = false;
const t = e.changedTouches && e.changedTouches[0];
if(!t){ clearSwipePreview(); return; }
const dx = t.clientX - startX;
const dy = t.clientY - startY;
clearSwipePreview();
if(Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.25) return;
if(dx < 0 && typeof setView === 'function' && state.currentView !== 'detail'){
triggerPremiumSwipeFeedback('next');
setView('detail','next');
if(typeof renderCompanyWorkspace === 'function') CQBus.emit('render:detail');
if(typeof scrollWorkspaceToTop === 'function') requestAnimationFrame(() => scrollWorkspaceToTop());
} else if(dx > 0 && typeof setView === 'function' && state.currentView !== 'board'){
triggerPremiumSwipeFeedback('prev');
setView('board','prev');
if(typeof renderActionBoard === 'function') CQBus.emit('render:board');
if(typeof scrollWorkspaceToTop === 'function') requestAnimationFrame(() => scrollWorkspaceToTop());
}
}, { passive: true });
})();



(function(){
function safeFocus(el){
if(!el) return;
try{ el.focus({preventScroll:true}); }catch(_){ try{ el.focus(); }catch(__){} }
}
function openSearchFallback(){
try{
if(typeof openProspectSearch === 'function') openProspectSearch();
document.body.classList.add('searching-sidebar');
var sidebar = document.querySelector('.layout-sidebar');
if(sidebar) sidebar.classList.remove('collapsed');
var box = document.getElementById('searchBox');
if(box){
setTimeout(function(){ safeFocus(box); }, 30);
}
}catch(_){ }
}
function resolveQuickCompanyFallback(){
try{
if(typeof resolveQuickNotesCompany === 'function') return resolveQuickNotesCompany();
}catch(_){ }
try{
if(window.state){
var companyId = '';
if(typeof getVisibleQuickNotesCompanyId === 'function'){
companyId = String(getVisibleQuickNotesCompanyId() || '').trim();
}
if(!companyId) companyId = String(window.state.selectedCompanyId || window.state.pinnedCompanyId || '').trim();
if(companyId && typeof getCompanyById === 'function'){
var c = getCompanyById(companyId);
if(c) return { companyId: companyId, company: c };
}
var topId = String(window.WorkspaceDoor?.getTopFocusCompanyId?.() || '').trim();
if(topId && typeof getCompanyById === 'function'){
var tc = getCompanyById(topId);
if(tc) return { companyId: topId, company: tc };
}
if(Array.isArray(window.state.companies) && window.state.companies.length){
var first = window.state.companies[0];
return { companyId: String(first.id||''), company: first };
}
}
}catch(_){ }
return null;
}
function openQuickNotesFallback(){
var ui = window.ui || {};
var modal = document.getElementById('quickNotesModal');
var box = document.getElementById('quickNotesBox');
var title = document.getElementById('quickNotesCompanyName');
var sidebarStatus = document.getElementById('sidebarStatus');
if(!modal || !box) return;
var resolved = resolveQuickCompanyFallback();
if(!resolved){
if(sidebarStatus) sidebarStatus.textContent = 'Select a company first to add a note.';
return;
}
var companyId = String(resolved.companyId || '').trim();
var company = resolved.company || {};
try{ if(window.state) window.state.selectedCompanyId = companyId; }catch(_){ }
modal.dataset.companyId = companyId;
var noteText = '';
try{
if(typeof getCompanyState === 'function'){
var local = getCompanyState(companyId);
noteText = (local && local.notes) || (company.properties && company.properties.prospecting_notes) || '';
} else {
noteText = (company.properties && company.properties.prospecting_notes) || '';
}
}catch(_){ noteText = (company.properties && company.properties.prospecting_notes) || ''; }
var displayName = '';
try{ if(typeof getCompanyDisplayName === 'function') displayName = getCompanyDisplayName(company) || ''; }catch(_){ }
if(!displayName) displayName = (company.properties && company.properties.name) || 'this company';
if(title) title.textContent = displayName ? ('Notes for ' + displayName) : 'Add a field note for this company.';
box.value = String(noteText || '');
modal.classList.add('open');
modal.setAttribute('aria-hidden','false');
setTimeout(function(){ safeFocus(box); try{ box.setSelectionRange(box.value.length, box.value.length); }catch(_){} }, 30);
}
window.__topSearchAction = function(event){ if(event){ event.preventDefault(); event.stopPropagation(); } openSearchFallback(); return false; };
window.__topQuickNotesAction = function(event){ if(event){ event.preventDefault(); event.stopPropagation(); } try{ if(typeof openQuickNotesModal === 'function') openQuickNotesModal(); else openQuickNotesFallback(); }catch(_){ openQuickNotesFallback(); } return false; };
function bindTopActionButtons(){
var searchBtn = document.getElementById('focusSearchBtn');
var notesBtn = document.getElementById('focusNotesBtn');
[searchBtn].filter(Boolean).forEach(function(btn){
['click','touchend','pointerup'].forEach(function(type){
btn.addEventListener(type, window.__topSearchAction, {passive:false, capture:true});
});
});
[notesBtn].filter(Boolean).forEach(function(btn){
['click','touchend','pointerup'].forEach(function(type){
btn.addEventListener(type, window.__topQuickNotesAction, {passive:false, capture:true});
});
});
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindTopActionButtons);
else bindTopActionButtons();
setTimeout(bindTopActionButtons, 400);
})();



(function(){
function closeMobileSearchOverlay(clearIfNoSelection = true){
document.body.classList.remove('searching-sidebar');
try{ ui.searchBox?.blur(); }catch(_){}
if(clearIfNoSelection && !String(state.selectedCompanyId || '').trim() && ui.searchBox){
ui.searchBox.value = '';
state.serverSearchQuery = '';
try{
ui.searchBox.dispatchEvent(new Event('input', { bubbles:true }));
}catch(_){}
}
}
function ensureLogoutInGear(){
const menu = document.getElementById('topGearMenu');
const logoutBtn = document.getElementById('logoutBtn');
if(!menu || !logoutBtn || menu.querySelector('[data-gear-logout="1"]')) return;
const divider = document.createElement('div');
divider.className = 'gearMenuDivider';
divider.setAttribute('data-gear-logout', '1');
const item = document.createElement('button');
item.className = 'gearMenuOption';
item.type = 'button';
item.textContent = 'Log Out';
item.setAttribute('data-gear-logout', '1');
item.addEventListener('click', function(e){
e.preventDefault();
logoutBtn.click();
});
menu.appendChild(divider);
menu.appendChild(item);
}
document.getElementById('mobileSearchCloseBtn')?.addEventListener('click', function(e){
e.preventDefault();
closeMobileSearchOverlay(true);
});
[document.getElementById('focusSearchBtn')].filter(Boolean).forEach((btn) => {
btn.addEventListener('click', function(e){
if(!window.matchMedia('(max-width: 980px)').matches) return;
e.preventDefault();
e.stopPropagation();
openProspectSearch();
}, true);
btn.addEventListener('touchend', function(e){
if(!window.matchMedia('(max-width: 980px)').matches) return;
e.preventDefault();
e.stopPropagation();
openProspectSearch();
}, { passive:false, capture:true });
});
(function(){
const sidebar = document.querySelector('.layout-sidebar');
if(!sidebar) return;
let startX = 0, startY = 0, tracking = false;
sidebar.addEventListener('touchstart', function(e){
if(!document.body.classList.contains('searching-sidebar')) return;
const t = e.changedTouches && e.changedTouches[0];
if(!t) return;
startX = t.clientX;
startY = t.clientY;
tracking = true;
}, { passive:true });
sidebar.addEventListener('touchend', function(e){
if(!tracking || !document.body.classList.contains('searching-sidebar')) return;
tracking = false;
const t = e.changedTouches && e.changedTouches[0];
if(!t) return;
const dx = t.clientX - startX;
const dy = t.clientY - startY;
if(dx > 70 && Math.abs(dy) < 50){
closeMobileSearchOverlay(true);
}
}, { passive:true });
})();
document.getElementById('prospectList')?.addEventListener('click', function(e){
const row = e.target.closest('.cardRow');
if(!row) return;
if(window.matchMedia('(max-width: 980px)').matches && document.body.classList.contains('searching-sidebar')){
setTimeout(() => closeMobileSearchOverlay(false), 140);
}
});
ensureLogoutInGear();
})();



(function(){
function isMobile(){ return window.matchMedia('(max-width: 980px)').matches; }
function forceOpenSearch(ev){
if(ev){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation && ev.stopImmediatePropagation(); }
if(!isMobile()) return false;
try{ state.sidebarCollapsed = false; }catch(_){}
try{ renderSidebarState && renderSidebarState(); }catch(_){}
document.body.classList.add('mobile-drawer-ready');
document.body.classList.add('searching-sidebar');
document.body.classList.add('mobile-drawer-open');
var panel = document.getElementById('sidebarPanel');
if(panel) panel.classList.remove('collapsed');
var content = document.getElementById('sidebarContent');
if(content){ content.style.display = 'flex'; content.style.opacity = '1'; content.style.pointerEvents = 'auto'; content.style.maxHeight = 'none'; }
var search = document.getElementById('searchBox');
var list = document.getElementById('prospectList');
if(list) try{ list.scrollTo({top:0, behavior:'auto'}); }catch(_){}
setTimeout(function(){
if(search){
try{ search.focus({preventScroll:true}); }catch(_){ search.focus(); }
try{ search.select(); }catch(_){}
}
}, 30);
setTimeout(function(){
if(search){
try{ search.focus({preventScroll:true}); }catch(_){ search.focus(); }
}
}, 180);
return false;
}
function forceCloseSearch(clear){
document.body.classList.remove('searching-sidebar');
document.body.classList.remove('mobile-drawer-open');
document.body.classList.remove('mobile-drawer-ready');
try{ state.sidebarCollapsed = true; }catch(_){}
try{ renderSidebarState && renderSidebarState(); }catch(_){}
var panel = document.getElementById('sidebarPanel');
if(panel) panel.classList.add('collapsed');
var search = document.getElementById('searchBox');
if(search){
try{ search.blur(); }catch(_){}
if(clear){
search.value = '';
try{ search.dispatchEvent(new Event('input', {bubbles:true})); }catch(_){}
}
}
}
window.__forceOpenSearch = forceOpenSearch;
window.__forceCloseSearch = forceCloseSearch;
var btn = document.getElementById('focusSearchBtn');
if(btn){
btn.onclick = forceOpenSearch;
['click','touchend','pointerup'].forEach(function(type){
btn.addEventListener(type, forceOpenSearch, {passive:false, capture:true});
});
}
var closeBtn = document.getElementById('mobileSearchCloseBtn');
if(closeBtn){
closeBtn.onclick = function(e){ forceCloseSearch(true); if(e){e.preventDefault();e.stopPropagation();} return false; };
['click','touchend'].forEach(function(type){
closeBtn.addEventListener(type, function(e){ forceCloseSearch(true); if(e){e.preventDefault();e.stopPropagation();} }, {passive:false, capture:true});
});
}
var backdrop = document.getElementById('mobileDrawerBackdrop');
if(backdrop){
['click','touchend'].forEach(function(type){
backdrop.addEventListener(type, function(e){ if(document.body.classList.contains('searching-sidebar')){ forceCloseSearch(true); if(e){e.preventDefault();e.stopPropagation();} } }, {passive:false, capture:true});
});
}
var sidebar = document.getElementById('sidebarPanel');
if(sidebar){
var sx=0, sy=0, active=false;
sidebar.addEventListener('touchstart', function(e){
if(!document.body.classList.contains('searching-sidebar')) return;
var t=e.changedTouches&&e.changedTouches[0]; if(!t) return; sx=t.clientX; sy=t.clientY; active=true;
}, {passive:true});
sidebar.addEventListener('touchend', function(e){
if(!active || !document.body.classList.contains('searching-sidebar')) return;
active=false; var t=e.changedTouches&&e.changedTouches[0]; if(!t) return;
var dx=t.clientX-sx, dy=t.clientY-sy;
if(dx>80 && Math.abs(dy)<60){ forceCloseSearch(true); }
}, {passive:true});
}
})();



(function(){
function isMobile(){ return window.matchMedia('(max-width: 980px)').matches; }
function keepSearchOverlayOpen(){
if(!isMobile()) return;
document.body.classList.add('mobile-drawer-ready');
document.body.classList.add('mobile-drawer-open');
document.body.classList.add('searching-sidebar');
try{ state.sidebarCollapsed = false; }catch(_){ }
try{ renderSidebarState && renderSidebarState(); }catch(_){ }
var panel = document.getElementById('sidebarPanel');
if(panel) panel.classList.remove('collapsed');
}
function hardCloseSearch(){
document.body.classList.remove('searching-sidebar');
document.body.classList.remove('mobile-drawer-open');
document.body.classList.remove('mobile-drawer-ready');
try{ state.sidebarCollapsed = true; }catch(_){ }
try{ renderSidebarState && renderSidebarState(); }catch(_){ }
var panel = document.getElementById('sidebarPanel');
if(panel) panel.classList.add('collapsed');
var search = document.getElementById('searchBox');
if(search){ try{ search.blur(); }catch(_){ } }
}
window.__forceCloseSearch = hardCloseSearch;
try{ window.toggleSidebar = function(){ return; }; }catch(_){ }
var toggleRow = document.getElementById('sidebarToggleRow');
if(toggleRow){
toggleRow.remove();
}
var sort = document.getElementById('sortBox');
if(sort){
['pointerdown','mousedown','touchstart','click','focus'].forEach(function(type){
sort.addEventListener(type, function(e){
if(!isMobile()) return;
keepSearchOverlayOpen();
e.stopPropagation();
}, {capture:true, passive:false});
});
sort.addEventListener('change', function(e){
if(!isMobile()) return;
e.stopPropagation();
keepSearchOverlayOpen();
setTimeout(keepSearchOverlayOpen, 0);
setTimeout(keepSearchOverlayOpen, 120);
setTimeout(keepSearchOverlayOpen, 260);
}, {capture:true});
}
var closeBtn = document.getElementById('mobileSearchCloseBtn');
if(closeBtn){
['click','touchend','pointerup'].forEach(function(type){
closeBtn.addEventListener(type, function(e){
if(!isMobile()) return;
if(e){ e.preventDefault(); e.stopPropagation(); }
hardCloseSearch();
}, {capture:true, passive:false});
});
}
var sidebar = document.getElementById('sidebarPanel');
if(sidebar){
var sx=0, sy=0, active=false;
sidebar.addEventListener('touchstart', function(e){
if(!document.body.classList.contains('searching-sidebar')) return;
var t=e.changedTouches&&e.changedTouches[0];
if(!t) return;
sx=t.clientX; sy=t.clientY; active=true;
}, {passive:true, capture:true});
sidebar.addEventListener('touchend', function(e){
if(!active || !document.body.classList.contains('searching-sidebar')) return;
active=false;
var t=e.changedTouches&&e.changedTouches[0];
if(!t) return;
var dx=t.clientX-sx, dy=t.clientY-sy;
if(dx>80 && Math.abs(dy)<60){
if(e){ e.preventDefault(); e.stopPropagation(); }
hardCloseSearch();
}
}, {passive:false, capture:true});
}
})();



(function(){
function isMobile(){
return window.matchMedia('(max-width: 980px)').matches;
}
function removeLegacyToggle(){
var row=document.getElementById('sidebarToggleRow');
if(row && row.parentNode){ row.parentNode.removeChild(row); }
var btn=document.getElementById('sidebarToggleBtn');
if(btn && btn.parentNode){ btn.parentNode.removeChild(btn); }
}
function focusDesktopSearch(){
var box=document.getElementById('searchBox');
if(!box) return false;
try{ box.focus({preventScroll:true}); }catch(_){ box.focus(); }
try{ box.select(); }catch(_){ }
return false;
}
function openMobileSearch(){
if(typeof window.__forceOpenSearch==='function') return window.__forceOpenSearch();
document.body.classList.add('searching-sidebar','mobile-drawer-open','mobile-drawer-ready');
var panel=document.getElementById('sidebarPanel');
if(panel) panel.classList.remove('collapsed');
return false;
}
function hardCloseMobileSearch(clear){
if(typeof window.__forceCloseSearch==='function') return window.__forceCloseSearch(!!clear);
document.body.classList.remove('searching-sidebar','mobile-drawer-open','mobile-drawer-ready');
var panel=document.getElementById('sidebarPanel');
if(panel) panel.classList.add('collapsed');
}
function bindSearchButton(){
var oldBtn=document.getElementById('focusSearchBtn');
if(!oldBtn || oldBtn.__finalPatched) return;
var btn=oldBtn.cloneNode(true);
oldBtn.parentNode.replaceChild(btn, oldBtn);
btn.__finalPatched=true;
btn.removeAttribute('onclick');
var handler=function(e){
if(e){ e.preventDefault(); e.stopPropagation(); }
if(isMobile()) return openMobileSearch();
return focusDesktopSearch();
};
['click','touchend','pointerup'].forEach(function(type){
btn.addEventListener(type, handler, {capture:true, passive:false});
});
}
function strengthenSortBehavior(){
var sort=document.getElementById('sortBox');
if(!sort || sort.__finalPatched) return;
sort.__finalPatched=true;
['pointerdown','mousedown','touchstart','click','focus'].forEach(function(type){
sort.addEventListener(type, function(e){
if(!isMobile()) return;
document.body.classList.add('searching-sidebar','mobile-drawer-open','mobile-drawer-ready');
var panel=document.getElementById('sidebarPanel');
if(panel) panel.classList.remove('collapsed');
if(e) e.stopPropagation();
}, {capture:true, passive:false});
});
sort.addEventListener('change', function(e){
if(!isMobile()) return;
if(e) e.stopPropagation();
[0,80,220,420,700].forEach(function(delay){
setTimeout(function(){
document.body.classList.add('searching-sidebar','mobile-drawer-open','mobile-drawer-ready');
var panel=document.getElementById('sidebarPanel');
if(panel) panel.classList.remove('collapsed');
}, delay);
});
}, {capture:true});
}
function bindCloseButton(){
var btn=document.getElementById('mobileSearchCloseBtn');
if(!btn || btn.__finalPatched) return;
btn.__finalPatched=true;
['click','touchend','pointerup'].forEach(function(type){
btn.addEventListener(type, function(e){
if(!isMobile()) return;
if(e){ e.preventDefault(); e.stopPropagation(); }
hardCloseMobileSearch(true);
}, {capture:true, passive:false});
});
}
function bindBackdrop(){
var backdrop=document.getElementById('mobileDrawerBackdrop');
if(!backdrop || backdrop.__finalPatched) return;
backdrop.__finalPatched=true;
['click','touchend','pointerup'].forEach(function(type){
backdrop.addEventListener(type, function(e){
if(!isMobile()) return;
if(!document.body.classList.contains('searching-sidebar')) return;
if(e){ e.preventDefault(); e.stopPropagation(); }
hardCloseMobileSearch(true);
}, {capture:true, passive:false});
});
}
function bindSwipeClose(){
var sidebar=document.getElementById('sidebarPanel');
if(!sidebar || sidebar.__finalSwipePatched) return;
sidebar.__finalSwipePatched=true;
var sx=0, sy=0, active=false;
sidebar.addEventListener('touchstart', function(e){
if(!isMobile() || !document.body.classList.contains('searching-sidebar')) return;
var t=e.changedTouches && e.changedTouches[0];
if(!t) return;
sx=t.clientX; sy=t.clientY; active=true;
}, {passive:true, capture:true});
sidebar.addEventListener('touchend', function(e){
if(!active || !isMobile() || !document.body.classList.contains('searching-sidebar')) return;
active=false;
var t=e.changedTouches && e.changedTouches[0];
if(!t) return;
var dx=t.clientX-sx, dy=t.clientY-sy;
if(dx>80 && Math.abs(dy)<60){
if(e){ e.preventDefault(); e.stopPropagation(); }
hardCloseMobileSearch(true);
}
}, {passive:false, capture:true});
}
function init(){
removeLegacyToggle();
bindSearchButton();
strengthenSortBehavior();
bindCloseButton();
bindBackdrop();
bindSwipeClose();
}
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
init();
}
window.addEventListener('load', init);
})();



(function(){
function isMobile(){ return window.matchMedia('(max-width: 980px)').matches; }
function panel(){ return document.getElementById('sidebarPanel'); }
function box(){ return document.getElementById('searchBox'); }
function sort(){ return document.getElementById('sortBox'); }
function ensureCloseButton(){
var ctrl = document.querySelector('#sidebarPanel .ctrlRow');
if(!ctrl) return null;
var btn = document.getElementById('mobileSearchCloseBtn');
if(!btn){
btn = document.createElement('button');
btn.type='button';
btn.id='mobileSearchCloseBtn';
btn.className='mobileSearchCloseBtn';
btn.setAttribute('aria-label','Close search');
btn.textContent='✕';
ctrl.appendChild(btn);
}
return btn;
}
function openMobileSearch(e){
if(e){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }
if(!isMobile()) return false;
document.body.classList.add('searching-sidebar','mobile-drawer-open');
document.body.classList.remove('mobile-editing');
var p = panel();
if(p) p.classList.remove('collapsed');
ensureCloseButton();
setTimeout(function(){
var b = box();
if(b){ try{ b.focus({preventScroll:true}); }catch(_){ b.focus(); } }
}, 30);
setTimeout(function(){
var b = box();
if(b){ try{ b.focus({preventScroll:true}); }catch(_){ b.focus(); } }
}, 180);
return false;
}
function closeMobileSearch(clear){
document.body.classList.remove('searching-sidebar','mobile-drawer-open','mobile-drawer-ready');
var p = panel();
if(p) p.classList.add('collapsed');
var b = box();
if(b){
if(clear){ b.value=''; }
try{ b.blur(); }catch(_){ }
}
return false;
}
function desktopSearchOnly(e){
if(e){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }
var b=box();
if(b){ try{ b.focus({preventScroll:true}); }catch(_){ b.focus(); } }
return false;
}
function bindSearchInterception(){
document.addEventListener('click', function(e){
var btn = e.target && e.target.closest ? e.target.closest('#focusSearchBtn') : null;
if(!btn) return;
if(isMobile()) return openMobileSearch(e);
return desktopSearchOnly(e);
}, true);
document.addEventListener('touchend', function(e){
var btn = e.target && e.target.closest ? e.target.closest('#focusSearchBtn') : null;
if(!btn) return;
if(isMobile()) return openMobileSearch(e);
return desktopSearchOnly(e);
}, {capture:true, passive:false});
document.addEventListener('pointerup', function(e){
var btn = e.target && e.target.closest ? e.target.closest('#focusSearchBtn') : null;
if(!btn) return;
if(isMobile()) return openMobileSearch(e);
return desktopSearchOnly(e);
}, {capture:true, passive:false});
}
function bindCloseAndBackdrop(){
document.addEventListener('click', function(e){
var closeBtn = e.target && e.target.closest ? e.target.closest('#mobileSearchCloseBtn') : null;
if(closeBtn){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); closeMobileSearch(true); return; }
var backdrop = e.target && e.target.closest ? e.target.closest('#mobileDrawerBackdrop') : null;
if(backdrop && isMobile() && document.body.classList.contains('searching-sidebar')){ e.preventDefault(); e.stopPropagation(); closeMobileSearch(true); }
}, true);
}
function bindSortPersistence(){
var s = sort();
if(!s) return;
['pointerdown','mousedown','touchstart','focus','click','change'].forEach(function(type){
s.addEventListener(type, function(e){
if(!isMobile()) return;
document.body.classList.add('searching-sidebar','mobile-drawer-open');
var p = panel();
if(p) p.classList.remove('collapsed');
if(type !== 'change'){ e.stopPropagation(); }
}, {capture:true, passive:false});
});
}
function bindSwipeClose(){
var p = panel();
if(!p) return;
var sx=0, sy=0, active=false;
p.addEventListener('touchstart', function(e){
if(!isMobile() || !document.body.classList.contains('searching-sidebar')) return;
var t=e.changedTouches && e.changedTouches[0];
if(!t) return;
sx=t.clientX; sy=t.clientY; active=true;
}, {capture:true, passive:true});
p.addEventListener('touchend', function(e){
if(!active || !isMobile() || !document.body.classList.contains('searching-sidebar')) return;
active=false;
var t=e.changedTouches && e.changedTouches[0];
if(!t) return;
var dx=t.clientX-sx, dy=t.clientY-sy;
if(dx>80 && Math.abs(dy)<60){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); closeMobileSearch(true); }
}, {capture:true, passive:false});
}
function init(){
var row=document.getElementById('sidebarToggleRow');
if(row) row.remove();
var btn=document.getElementById('sidebarToggleBtn');
if(btn) btn.remove();
ensureCloseButton();
bindSortPersistence();
bindSwipeClose();
}
bindSearchInterception();
bindCloseAndBackdrop();
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
window.addEventListener('load', init);
})();



(function(){
function isMobile(){
try{return window.matchMedia('(max-width: 980px)').matches;}catch(_){return window.innerWidth<=980;}
}
function hardCloseSearchOnStartup(){
document.body.classList.remove('searching-sidebar','mobile-drawer-open','mobile-drawer-ready','mobile-editing');
var panel=document.getElementById('sidebarPanel');
if(panel) panel.classList.add('collapsed');
try{ if(window.state) window.state.sidebarCollapsed = true; }catch(_){ }
try{ if(typeof renderSidebarState === 'function') renderSidebarState(); }catch(_){ }
var search=document.getElementById('searchBox');
if(search){
try{ search.blur(); }catch(_){ }
}
var backdrop=document.getElementById('mobileDrawerBackdrop');
if(backdrop){
backdrop.setAttribute('aria-hidden','true');
}
}
function startupCleanup(){
if(!isMobile()) return;
hardCloseSearchOnStartup();
[0,80,220,500,900].forEach(function(delay){
setTimeout(hardCloseSearchOnStartup, delay);
});
}
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded', startupCleanup, {once:true});
}else{
startupCleanup();
}
window.addEventListener('load', startupCleanup);
window.addEventListener('pageshow', startupCleanup);
})();



(function(){
function isMobile(){ return window.matchMedia('(max-width: 980px)').matches; }
function panel(){ return document.getElementById('sidebarPanel'); }
function sortEl(){ return document.getElementById('sortBox'); }
function listEl(){ return document.getElementById('prospectList'); }
function lockOverlay(){
if(!isMobile()) return;
document.body.classList.add('searching-sidebar','mobile-drawer-open','mobile-drawer-ready');
try{ state.sidebarCollapsed = false; }catch(_){ }
try{ if(state.local && state.local.ui) state.local.ui.sidebarCollapsed = false; }catch(_){ }
var p = panel();
if(p) p.classList.remove('collapsed');
try{ renderSidebarState(); }catch(_){ }
}
function bindSortFix(){
var existing = sortEl();
if(!existing || existing.__patOverlayFlashFixed) return;
var replacement = existing.cloneNode(true);
replacement.__patOverlayFlashFixed = true;
existing.parentNode.replaceChild(replacement, existing);
['pointerdown','mousedown','touchstart','focus','click'].forEach(function(type){
replacement.addEventListener(type, function(e){
if(!isMobile()) return;
lockOverlay();
e.stopPropagation();
}, {capture:true, passive:false});
});
replacement.addEventListener('change', async function(e){
if(isMobile()){
e.preventDefault();
e.stopPropagation();
if(e.stopImmediatePropagation) e.stopImmediatePropagation();
lockOverlay();
}
try{ if(ui && ui.sortBox && ui.sortBox !== replacement) ui.sortBox = replacement; }catch(_){ }
try{
if(typeof loadCompaniesForOwner === 'function') await loadCompaniesForOwner({ preserveWorkspace:true, listOnly:true });
} finally {
try{ renderProspectList(); }catch(_){ }
try{ updateProgress(); }catch(_){ }
if(listEl()){
try{ listEl().scrollTo({top:0, behavior:'auto'}); }catch(_){ listEl().scrollTop = 0; }
}
if(isMobile()){
lockOverlay();
requestAnimationFrame(lockOverlay);
setTimeout(lockOverlay, 90);
}
}
}, true);
}
function init(){ bindSortFix(); }
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
window.addEventListener('load', init);
})();
(function initSortProxyMenu(){
function getSortSelect(){
return document.getElementById('sortBox');
}
function getSortProxyWrap(){
return document.getElementById('sortProxyWrap');
}
function closeSortProxyMenu(){
const btn = document.getElementById('sortProxyBtn');
const menu = document.getElementById('sortProxyMenu');
if(menu) menu.classList.remove('open');
if(btn) btn.setAttribute('aria-expanded', 'false');
}
function syncSortProxyLabel(){
const select = getSortSelect();
const btn = document.getElementById('sortProxyBtn');
if(!select || !btn) return;
const selectedOption = select.options[select.selectedIndex];
btn.querySelector('.sortProxyBtnLabel').textContent = selectedOption ? selectedOption.textContent : 'Sort';
}
function buildSortProxyMenu(){
const select = getSortSelect();
const menu = document.getElementById('sortProxyMenu');
if(!select || !menu) return;
menu.innerHTML = Array.from(select.options).map(function(option){
const value = String(option.value || '');
const active = value === String(select.value || '');
return '<button class="sortProxyOption' + (active ? ' active' : '') + '" type="button" data-sort-value="' + escapeHtml(value) + '">' + escapeHtml(option.textContent || value) + '</button>';
}).join('');
menu.querySelectorAll('[data-sort-value]').forEach(function(button){
button.addEventListener('click', function(e){
const value = button.getAttribute('data-sort-value') || 'dueDate';
const liveSelect = getSortSelect();
if(!liveSelect) return;
if(liveSelect.value !== value){
  liveSelect.value = value;
  liveSelect.dispatchEvent(new Event('change', { bubbles:true }));
} else {
  syncSortProxyLabel();
}
closeSortProxyMenu();
});
});
}
function ensureUntouchedOption(select){
return;
}
function installSortProxyMenu(){
const select = getSortSelect();
if(!select || getSortProxyWrap()) return;
const ctrlRow = select.closest('.ctrlRow');
if(!ctrlRow) return;
const wrap = document.createElement('div');
wrap.id = 'sortProxyWrap';
wrap.className = 'sortProxyWrap';
wrap.innerHTML = '<button class="sortProxyBtn" id="sortProxyBtn" type="button" aria-haspopup="menu" aria-expanded="false"><span class="sortProxyBtnLabel">Sort</span><span class="sortProxyBtnCaret">⌄</span></button><div class="sortProxyMenu" id="sortProxyMenu" role="menu"></div>';
select.classList.add('sortBoxNative');
select.setAttribute('aria-hidden', 'true');
select.tabIndex = -1;
select.insertAdjacentElement('afterend', wrap);
const btn = document.getElementById('sortProxyBtn');
btn.addEventListener('click', function(e){
  e.preventDefault();
  e.stopPropagation();
  const menu = document.getElementById('sortProxyMenu');
  const opening = !menu.classList.contains('open');
  closeSortProxyMenu();
  if(opening){
    buildSortProxyMenu();
    menu.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
});
select.addEventListener('change', function(){
  syncSortProxyLabel();
  buildSortProxyMenu();
});
window.addEventListener('resize', closeSortProxyMenu, { passive:true });
window.addEventListener('scroll', closeSortProxyMenu, { passive:true });
}
document.addEventListener('click', function(event){
  const wrap = getSortProxyWrap();
  if(!wrap) return;
  if(wrap.contains(event.target)) return;
  closeSortProxyMenu();
}, true);
document.addEventListener('keydown', function(event){
  if(event.key === 'Escape') closeSortProxyMenu();
});
function init(){
  const select = getSortSelect();
  if(select)   installSortProxyMenu();
  syncSortProxyLabel();
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
else init();
window.addEventListener('load', init);
})();

document.addEventListener("click", (event) => {
const btn = event.target.closest('[data-action-role="touch-action"]');
if(!btn) return;
if(btn.id === "detailActionBtn") return;
const companyId = String(btn.dataset.companyId || "").trim();
if(!companyId) return;
const actionKind = String(btn.dataset.actionKind || "").trim();
if(actionKind){
event.preventDefault();
performActionKindForCompany(companyId, actionKind);
}
});



(function(){
let startX = 0;
let startY = 0;
let tracking = false;
const threshold = 60;
function isMobileSwipeViewport(){
return window.matchMedia('(max-width: 980px)').matches;
}
function validSwipeTarget(target){
return !!target && !target.closest('input, textarea, select, button, a, .statusMenu, .detailMenu, .gearMenu, .taskChangeMenu, .focusTaskChangeMenu, .modalBackdrop, .layout-sidebar');
}
document.addEventListener('touchstart', function(e){
if(!isMobileSwipeViewport()) return;
if(!validSwipeTarget(e.target)) { tracking = false; return; }
const t = e.changedTouches && e.changedTouches[0];
if(!t) return;
startX = t.clientX;
startY = t.clientY;
tracking = true;
}, { passive: true });
document.addEventListener('touchend', function(e){
if(!isMobileSwipeViewport() || !tracking) return;
tracking = false;
const t = e.changedTouches && e.changedTouches[0];
if(!t) return;
const dx = t.clientX - startX;
const dy = t.clientY - startY;
if(Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.25) return;
if(dx < 0 && typeof setView === 'function' && state.currentView !== 'detail'){
setView('detail','next');
if(typeof renderCompanyWorkspace === 'function') CQBus.emit('render:detail');
if(typeof scrollWorkspaceToTop === 'function') requestAnimationFrame(() => scrollWorkspaceToTop());
} else if(dx > 0 && typeof setView === 'function' && state.currentView !== 'board'){
setView('board','prev');
if(typeof renderActionBoard === 'function') CQBus.emit('render:board');
if(typeof scrollWorkspaceToTop === 'function') requestAnimationFrame(() => scrollWorkspaceToTop());
}
}, { passive: true });
})();



(function(){
function isMobile(){
try{return window.matchMedia('(max-width: 980px)').matches;}catch(_){return window.innerWidth<=980;}
}
function sortEl(){ return document.getElementById('sortBox'); }
function panel(){ return document.getElementById('sidebarPanel'); }
function list(){ return document.getElementById('prospectList'); }
function searchEl(){ return document.getElementById('searchBox'); }
function removeOldToggle(){
['sidebarToggleRow','sidebarToggleBtn','sidebarToggleLabel'].forEach(function(id){
var el=document.getElementById(id);
if(el && id==='sidebarToggleRow'){ el.remove(); }
else if(el){ el.style.display='none'; el.setAttribute('aria-hidden','true'); }
});
}
function keepMobileSearchOpen(){
if(!isMobile()) return;
document.body.classList.add('searching-sidebar','mobile-drawer-open','mobile-drawer-ready');
document.body.classList.remove('mobile-editing');
var p=panel();
if(p) p.classList.remove('collapsed');
}
function rerenderSortedList(){
try{
if(typeof renderProspectList === 'function') renderProspectList();
if(typeof updateProgress === 'function') updateProgress();
}catch(err){ console.error('sort rerender failed', err); }
}
function handleSortChange(e){
if(!isMobile()){
rerenderSortedList();
return;
}
if(e){
e.preventDefault();
e.stopPropagation();
if(e.stopImmediatePropagation) e.stopImmediatePropagation();
}
keepMobileSearchOpen();
if(list()) try{ list().scrollTo({top:0, behavior:'auto'}); }catch(_){ list().scrollTop=0; }
rerenderSortedList();
setTimeout(keepMobileSearchOpen, 0);
setTimeout(keepMobileSearchOpen, 80);
}
function bindSort(){
var s=sortEl();
if(!s || s.__patSortFixed) return;
s.__patSortFixed=true;
['mousedown','pointerdown','touchstart','focus','click'].forEach(function(type){
s.addEventListener(type, function(e){
if(!isMobile()) return;
keepMobileSearchOpen();
e.stopPropagation();
}, {capture:true, passive:type==='touchstart'?true:false});
});
s.addEventListener('change', handleSortChange, true);
s.addEventListener('input', handleSortChange, true);
}
function bindSearchNoScrollDesktop(){
var btn=document.getElementById('focusSearchBtn');
if(!btn || btn.__patDesktopSearchFixed) return;
btn.__patDesktopSearchFixed=true;
['click','pointerup','touchend'].forEach(function(type){
btn.addEventListener(type, function(e){
if(isMobile()) return;
e.preventDefault();
e.stopPropagation();
if(e.stopImmediatePropagation) e.stopImmediatePropagation();
var box=searchEl();
if(box){ try{ box.focus({preventScroll:true}); }catch(_){ box.focus(); } }
}, {capture:true, passive:false});
});
}
function init(){
removeOldToggle();
bindSort();
bindSearchNoScrollDesktop();
keepMobileSearchOpen();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
window.addEventListener('load', init);
setInterval(removeOldToggle, 1200);
})();



(function(){
  function initTopGearFinal(){
    var wrap=document.getElementById('topGearWrap');
    var btn=document.getElementById('emailTemplateGear');
    var menu=document.getElementById('topGearMenu');
    if(!wrap || !btn || !menu) return;
    if(btn.__v19TopGearBound) return;
    btn.__v19TopGearBound=true;
    function isOpen(){
      return menu.classList.contains('open') || menu.classList.contains('is-open') || menu.classList.contains('force-open') || menu.getAttribute('data-open')==='true';
    }
    function openMenu(){
      menu.classList.add('open','is-open','force-open');
      menu.setAttribute('data-open','true');
      menu.style.display='block';
      menu.style.opacity='1';
      menu.style.visibility='visible';
      btn.setAttribute('aria-expanded','true');
    }
    function closeMenu(){
      menu.classList.remove('open','is-open','force-open');
      menu.removeAttribute('data-open');
      menu.style.display='';
      menu.style.opacity='';
      menu.style.visibility='';
      btn.setAttribute('aria-expanded','false');
    }
    function toggleMenu(){ if(isOpen()) closeMenu(); else openMenu(); }
    ['pointerdown','mousedown','click'].forEach(function(type){
      btn.addEventListener(type,function(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
        if(type==='click') toggleMenu();
      },true);
    });
    btn.addEventListener('keydown',function(e){
      if(e.key!=='Enter' && e.key!==' ') return;
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
    },true);
    ['pointerdown','mousedown','click'].forEach(function(type){
      wrap.addEventListener(type,function(e){ e.stopPropagation(); },true);
      menu.addEventListener(type,function(e){ e.stopPropagation(); },true);
    });
    document.addEventListener('click',function(e){
      if(!wrap.contains(e.target)) closeMenu();
    },true);
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape') closeMenu();
    },true);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initTopGearFinal, {once:true});
  else initTopGearFinal();
  window.addEventListener('load', initTopGearFinal);
})();


/* v20 final top gear binding reset */
(function(){
  function bindTopGearV20(){
    var wrap=document.getElementById('topGearWrap');
    var oldBtn=document.getElementById('emailTemplateGear');
    var menu=document.getElementById('topGearMenu');
    if(!wrap || !oldBtn || !menu) return;

    var btn=oldBtn;
    if(!oldBtn.dataset.v20Cloned){
      var clone=oldBtn.cloneNode(true);
      clone.dataset.v20Cloned='1';
      oldBtn.parentNode.replaceChild(clone, oldBtn);
      btn=clone;
    }
    if(btn.dataset.v20Bound==='1') return;
    btn.dataset.v20Bound='1';

    function isOpen(){
      return menu.classList.contains('open') || menu.classList.contains('is-open') || menu.classList.contains('force-open') || menu.getAttribute('data-open')==='true';
    }
    function openMenu(){
      menu.classList.add('open');
      menu.classList.add('is-open');
      menu.setAttribute('data-open','true');
      menu.style.display='block';
      menu.style.opacity='1';
      menu.style.visibility='visible';
      btn.setAttribute('aria-expanded','true');
    }
    function closeMenu(){
      menu.classList.remove('open');
      menu.classList.remove('is-open');
      menu.classList.remove('force-open');
      menu.removeAttribute('data-open');
      menu.style.display='';
      menu.style.opacity='';
      menu.style.visibility='';
      btn.setAttribute('aria-expanded','false');
    }
    function toggleMenu(){
      if(isOpen()) closeMenu(); else openMenu();
    }

    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      toggleMenu();
    }, true);
    btn.addEventListener('keydown', function(e){
      if(e.key!=='Enter' && e.key!==' ') return;
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      toggleMenu();
    }, true);

    ['pointerdown','mousedown','click'].forEach(function(type){
      wrap.addEventListener(type, function(e){ e.stopPropagation(); }, true);
      menu.addEventListener(type, function(e){ e.stopPropagation(); }, true);
    });

    document.addEventListener('click', function(e){
      if(!wrap.contains(e.target)) closeMenu();
    }, true);
    document.addEventListener('keydown', function(e){
      if(e.key==='Escape') closeMenu();
    }, true);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindTopGearV20, {once:true});
  else bindTopGearV20();
  window.addEventListener('load', bindTopGearV20);
})();


/* v21 final top gear hard bind */
(function(){
  function bindTopGearV21(){
    var wrap = document.getElementById('topGearWrap');
    var btn = document.getElementById('emailTemplateGear');
    var menu = document.getElementById('topGearMenu');
    if(!wrap || !btn || !menu) return;
    if(btn.dataset.v21Bound === '1') return;
    btn.dataset.v21Bound = '1';

    function openMenu(){
      menu.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
    function closeMenu(){
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
    function toggleMenu(e){
      if(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      if(menu.classList.contains('open')) closeMenu();
      else openMenu();
    }

    btn.onclick = null;
    btn.addEventListener('click', toggleMenu, true);
    btn.addEventListener('keydown', function(e){
      if(e.key !== 'Enter' && e.key !== ' ') return;
      toggleMenu(e);
    }, true);

    wrap.addEventListener('click', function(e){
      var clickedButton = e.target.closest('#emailTemplateGear');
      var clickedMenu = e.target.closest('#topGearMenu');
      if(clickedButton) return;
      if(!clickedMenu) closeMenu();
    }, true);

    document.addEventListener('click', function(e){
      if(!wrap.contains(e.target)) closeMenu();
    }, true);

    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeMenu();
    }, true);

    closeMenu();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindTopGearV21, {once:true});
  } else {
    bindTopGearV21();
  }
  window.addEventListener('load', bindTopGearV21);
})();


/* v22 final top gear reset: replace button to remove stacked listeners */
(function(){
  function bindTopGearV22(){
    var wrap = document.getElementById('topGearWrap');
    var oldBtn = document.getElementById('emailTemplateGear');
    var menu = document.getElementById('topGearMenu');
    if(!wrap || !oldBtn || !menu) return;
    if(wrap.dataset.v22Bound === '1') return;

    var btn = oldBtn.cloneNode(true);
    btn.setAttribute('aria-expanded','false');
    oldBtn.parentNode.replaceChild(btn, oldBtn);
    wrap.dataset.v22Bound = '1';

    function openMenu(){
      menu.classList.add('open');
      btn.setAttribute('aria-expanded','true');
    }
    function closeMenu(){
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
    }
    function toggleMenu(e){
      if(e){ e.preventDefault(); e.stopPropagation(); }
      if(menu.classList.contains('open')) closeMenu(); else openMenu();
    }

    btn.addEventListener('click', toggleMenu);
    btn.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' ') toggleMenu(e);
      if(e.key === 'Escape') closeMenu();
    });
    menu.addEventListener('click', function(e){ e.stopPropagation(); });
    menu.addEventListener('pointerdown', function(e){ e.stopPropagation(); });
    document.addEventListener('click', function(e){ if(!wrap.contains(e.target)) closeMenu(); }, true);
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeMenu(); });
    closeMenu();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindTopGearV22, {once:true});
  else bindTopGearV22();
  window.addEventListener('load', bindTopGearV22);
})();


/* v23 minimal settings gear fallback */
(function(){
  function bindTopGearV23(){
    var btn = document.getElementById('emailTemplateGear');
    var menu = document.getElementById('topGearMenu');
    if(!btn || !menu || btn.dataset.v23Bound === '1') return;
    btn.dataset.v23Bound = '1';

    btn.addEventListener('click', function(e){
      e.preventDefault();
      btn.setAttribute('aria-expanded', menu.classList.contains('open') ? 'false' : 'true');
      menu.classList.toggle('open');
    });

    document.addEventListener('click', function(e){
      var wrap = document.getElementById('topGearWrap');
      if(wrap && !wrap.contains(e.target)){
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded','false');
      }
    });
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindTopGearV23, {once:true});
  } else {
    bindTopGearV23();
  }
})();


/* v24: hard settings menu reset */
(function(){
  function bindTopGearV24(){
    var wrap = document.getElementById('topGearWrap');
    var btn = document.getElementById('emailTemplateGear');
    var menu = document.getElementById('topGearMenu');
    if(!wrap || !btn || !menu) return;
    if(btn.dataset.v24Bound === '1') return;
    btn.dataset.v24Bound = '1';

    function openMenu(){
      menu.classList.add('open');
      btn.setAttribute('aria-expanded','true');
    }
    function closeMenu(){
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
    }
    function toggleMenu(e){
      if(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      if(menu.classList.contains('open')) closeMenu();
      else openMenu();
    }

    btn.onclick = null;
    wrap.onclick = null;
    btn.addEventListener('click', toggleMenu, true);
    btn.addEventListener('pointerdown', toggleMenu, true);
    menu.addEventListener('click', function(e){ e.stopPropagation(); }, true);
    menu.addEventListener('pointerdown', function(e){ e.stopPropagation(); }, true);
    document.addEventListener('click', function(e){
      if(!wrap.contains(e.target)) closeMenu();
    }, true);
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeMenu();
    }, true);
    closeMenu();
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindTopGearV24, {once:true});
  } else {
    bindTopGearV24();
  }
  window.addEventListener('load', bindTopGearV24);
})();

function bindTopGearFromGoldenPatch(){
  const wrap = document.getElementById("topGearWrap");
  if(!wrap || wrap.dataset.goldenPatchBound === "1") return;
  wrap.dataset.goldenPatchBound = "1";
  const button = wrap.querySelector("#emailTemplateGear");
  const menu = wrap.querySelector("#topGearMenu");
  const manageUsers = wrap.querySelector("#topAddUserOption");
  if(!button || !menu) return;

  if(manageUsers){
    manageUsers.style.display = "";
    manageUsers.hidden = false;
  }

  const setOpen = (open) => {
    menu.classList.toggle("open", !!open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  };

  setOpen(false);

  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!menu.classList.contains("open"));
  }, true);

  menu.addEventListener("click", (e) => e.stopPropagation(), true);
  menu.addEventListener("pointerdown", (e) => e.stopPropagation(), true);

  document.addEventListener("click", (e) => {
    if(!wrap.contains(e.target)) setOpen(false);
  }, true);
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", bindTopGearFromGoldenPatch, { once:true });
} else {
  bindTopGearFromGoldenPatch();
}
window.addEventListener("load", bindTopGearFromGoldenPatch);


function setSidebarCollapsed(collapsed){
  state.sidebarCollapsed = !!collapsed;

  const grid = ui.mainGrid || document.getElementById("mainGrid");
  const sidebar = ui.sidebarPanel || document.getElementById("sidebarPanel");
  const toggleBtn = ui.sidebarToggleBtn || document.getElementById("sidebarToggleBtn");
  const toggleLabel = ui.sidebarToggleLabel || document.getElementById("sidebarToggleLabel");
  const backdrop = ui.mobileDrawerBackdrop || document.getElementById("mobileDrawerBackdrop");
  const isMobile = typeof isMobileDrawerViewport === "function"
    ? isMobileDrawerViewport()
    : window.innerWidth <= 980;

  if(sidebar) sidebar.classList.toggle("collapsed", !!collapsed);
  if(grid){
    grid.classList.toggle("sidebar-collapsed", !!collapsed);
    grid.classList.toggle("sidebar-open", !collapsed);
  }
  if(toggleBtn) toggleBtn.textContent = collapsed ? "⌄" : "⌃";
  if(toggleLabel) toggleLabel.textContent = collapsed ? "Show All Prospects" : "Hide All Prospects";
  if(backdrop) backdrop.classList.toggle("open", isMobile && !collapsed);
  document.body.classList.toggle("mobile-drawer-open", isMobile && !collapsed);
}


function bindTopGearClickOnlyFixV40(){
  const wrap = document.getElementById("topGearWrap");
  if(!wrap || wrap.dataset.clickOnlyBoundV40 === "1") return;
  wrap.dataset.clickOnlyBoundV40 = "1";

  const button = document.getElementById("emailTemplateGear");
  const menu = document.getElementById("topGearMenu");
  const manageUsers = document.getElementById("topAddUserOption");
  if(!button || !menu) return;

  if(manageUsers){
    manageUsers.style.display = "";
    manageUsers.hidden = false;
  }

  const setOpen = (open) => {
    menu.classList.toggle("open", !!open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  };

  setOpen(false);

  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!menu.classList.contains("open"));
  }, true);

  menu.addEventListener("click", (e) => e.stopPropagation(), true);
  menu.addEventListener("pointerdown", (e) => e.stopPropagation(), true);

  document.addEventListener("click", (e) => {
    if(!wrap.contains(e.target)) setOpen(false);
  }, true);
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", bindTopGearClickOnlyFixV40, { once:true });
} else {
  bindTopGearClickOnlyFixV40();
}
window.addEventListener("load", bindTopGearClickOnlyFixV40);


/* FIX: Top gear menu toggle */
document.addEventListener("DOMContentLoaded", function(){
  const gearBtn = document.getElementById("emailTemplateGear");
  const gearMenu = document.getElementById("topGearMenu");

  if(gearBtn && gearMenu){
    gearBtn.addEventListener("click", function(e){
      e.stopPropagation();
      gearMenu.classList.toggle("open");
    });

    document.addEventListener("click", function(){
      gearMenu.classList.remove("open");
    });
  }
});



/* v99 top gear final hard reset */
(function(){
  function bindTopGearV99(){
    var wrap = document.getElementById('topGearWrap');
    var oldBtn = document.getElementById('emailTemplateGear');
    var menu = document.getElementById('topGearMenu');
    var manageUsers = document.getElementById('topAddUserOption');
    if(!wrap || !oldBtn || !menu) return;
    if(wrap.dataset.v99Bound === '1') return;
    wrap.dataset.v99Bound = '1';

    if(manageUsers){
      manageUsers.style.display = '';
      manageUsers.hidden = false;
    }

    var btn = oldBtn.cloneNode(true);
    btn.setAttribute('aria-expanded', 'false');
    oldBtn.parentNode.replaceChild(btn, oldBtn);

    function isOpen(){
      return menu.classList.contains('open');
    }

    function openMenu(){
      menu.classList.add('open');
      menu.classList.add('is-open');
      menu.style.display = 'flex';
      menu.style.opacity = '1';
      menu.style.visibility = 'visible';
      btn.setAttribute('aria-expanded', 'true');
    }

    function closeMenu(){
      menu.classList.remove('open');
      menu.classList.remove('is-open');
      menu.classList.remove('force-open');
      menu.removeAttribute('data-open');
      menu.style.display = 'none';
      menu.style.opacity = '';
      menu.style.visibility = '';
      btn.setAttribute('aria-expanded', 'false');
    }

    function toggleMenu(nextOpen){
      var shouldOpen = typeof nextOpen === 'boolean' ? nextOpen : !isOpen();
      if(shouldOpen) openMenu();
      else closeMenu();
    }

    ['pointerdown','mousedown'].forEach(function(type){
      btn.addEventListener(type, function(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }, true);
    });

    btn.addEventListener('click', function(e){
      var nextOpen = !isOpen();
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      setTimeout(function(){
        toggleMenu(nextOpen);
      }, 0);
    }, true);

    btn.addEventListener('keydown', function(e){
      if(e.key !== 'Enter' && e.key !== ' ') return;
      var nextOpen = !isOpen();
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      setTimeout(function(){
        toggleMenu(nextOpen);
      }, 0);
    }, true);

    ['pointerdown','mousedown','click'].forEach(function(type){
      wrap.addEventListener(type, function(e){
        if(e.target && (e.target.closest('#emailTemplateGear') || e.target.closest('#topGearMenu'))){
          e.stopPropagation();
          if(e.stopImmediatePropagation) e.stopImmediatePropagation();
        }
      }, true);

      menu.addEventListener(type, function(e){
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }, true);
    });

    document.addEventListener('click', function(e){
      if(!wrap.contains(e.target)) closeMenu();
    }, true);

    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeMenu();
    }, true);

    closeMenu();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      setTimeout(bindTopGearV99, 0);
    }, {once:true});
  } else {
    setTimeout(bindTopGearV99, 0);
  }
  window.addEventListener('load', function(){
    setTimeout(bindTopGearV99, 0);
  });
})();



/* v100 top gear full DOM rebuild */
(function(){
  function installTopGearV100(){
    var wrap = document.getElementById('topGearWrap');
    if(!wrap) return;
    if(wrap.dataset.v100Installed === '1') return;
    wrap.dataset.v100Installed = '1';

    var oldBtn = document.getElementById('emailTemplateGear');
    var oldMenu = document.getElementById('topGearMenu');
    if(!oldBtn || !oldMenu) return;

    var oldMenuChildren = Array.prototype.slice.call(oldMenu.childNodes);

    var newBtn = document.createElement('button');
    newBtn.className = oldBtn.className || 'gearOnlyBtn';
    newBtn.id = 'emailTemplateGear';
    newBtn.type = 'button';
    newBtn.setAttribute('aria-label', oldBtn.getAttribute('aria-label') || 'Settings');
    newBtn.setAttribute('title', oldBtn.getAttribute('title') || 'Settings');
    newBtn.setAttribute('aria-expanded', 'false');
    newBtn.textContent = oldBtn.textContent || '⚙';

    var newMenu = document.createElement('div');
    newMenu.className = oldMenu.className || 'gearMenu';
    newMenu.id = 'topGearMenu';
    oldMenuChildren.forEach(function(node){
      newMenu.appendChild(node);
    });

    wrap.innerHTML = '';
    wrap.appendChild(newBtn);
    wrap.appendChild(newMenu);

    function openMenu(){
      newMenu.classList.add('open');
      newMenu.style.display = 'block';
      newMenu.style.opacity = '1';
      newMenu.style.visibility = 'visible';
      newBtn.setAttribute('aria-expanded', 'true');
    }

    function closeMenu(){
      newMenu.classList.remove('open');
      newMenu.style.display = 'none';
      newMenu.style.opacity = '';
      newMenu.style.visibility = '';
      newBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleMenu(e){
      if(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      if(newMenu.classList.contains('open')) closeMenu();
      else openMenu();
    }

    newBtn.onclick = toggleMenu;
    newBtn.onpointerdown = function(e){
      e.preventDefault();
      e.stopPropagation();
    };
    newBtn.onmousedown = function(e){
      e.preventDefault();
      e.stopPropagation();
    };

    newMenu.onclick = function(e){ e.stopPropagation(); };
    newMenu.onpointerdown = function(e){ e.stopPropagation(); };

    document.addEventListener('click', function(e){
      if(!wrap.contains(e.target)) closeMenu();
    }, true);

    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeMenu();
      if((e.key === 'Enter' || e.key === ' ') && document.activeElement === newBtn){
        toggleMenu(e);
      }
    }, true);

    closeMenu();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', installTopGearV100, {once:true});
  } else {
    installTopGearV100();
  }
  window.addEventListener('load', installTopGearV100);
})();



/* v101 top gear portal menu */
(function(){
  function installTopGearPortalMenu(){
    const wrap = document.getElementById("topGearWrap");
    const gearBtn = document.getElementById("emailTemplateGear");
    const originalMenu = document.getElementById("topGearMenu");
    if(!wrap || !gearBtn || !originalMenu) return;
    if(wrap.dataset.v101PortalBound === "1") return;
    wrap.dataset.v101PortalBound = "1";

    let portal = null;

    function ensurePortal(){
      if(portal && document.body.contains(portal)) return portal;
      portal = document.createElement("div");
      portal.id = "topGearPortalMenu";
      portal.style.position = "fixed";
      portal.style.minWidth = "190px";
      portal.style.padding = "8px";
      portal.style.borderRadius = "14px";
      portal.style.border = "1px solid rgba(255,255,255,.12)";
      portal.style.background = "rgba(16,20,30,.96)";
      portal.style.backdropFilter = "blur(14px)";
      portal.style.boxShadow = "0 18px 40px rgba(0,0,0,.35)";
      portal.style.zIndex = "9999";
      portal.style.display = "none";
      portal.style.flexDirection = "column";
      portal.style.gap = "6px";

      const options = [
        { id: "topActivityReportOption", label: "Performance Snapshot", adminOnly: true },
        { id: "topAddUserOption", label: "Manage Users", adminOnly: true },
        { id: "logoutBtn", label: "Log Out", adminOnly: false }
      ];

      options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = opt.label;
        btn.dataset.portalOptionId = opt.id;
        if(opt.adminOnly) btn.dataset.adminOnly = "1";
        btn.style.width = "100%";
        btn.style.textAlign = "left";
        btn.style.padding = "10px 12px";
        btn.style.borderRadius = "10px";
        btn.style.border = "1px solid rgba(255,255,255,.08)";
        btn.style.background = "rgba(255,255,255,.04)";
        btn.style.color = "rgba(255,255,255,.92)";
        btn.style.cursor = "pointer";
        btn.style.font = "inherit";
        btn.onmouseenter = () => { btn.style.background = "rgba(11,135,224,.14)"; };
        btn.onmouseleave = () => { btn.style.background = "rgba(255,255,255,.04)"; };
        btn.addEventListener("click", function(e){
          e.preventDefault();
          e.stopPropagation();
          const original = document.getElementById(opt.id);
          closePortal();
          if(original){
            original.click();
          }
        });
        portal.appendChild(btn);
      });

      portal.addEventListener("click", (e) => e.stopPropagation());
      portal.addEventListener("pointerdown", (e) => e.stopPropagation());
      document.body.appendChild(portal);
      return portal;
    }

    function syncPortalVisibility(){
      const menu = ensurePortal();
      const isAdmin = String(window.__prospectAuthUser?.role || "") === "admin";
      menu.querySelectorAll("button").forEach((button) => {
        const adminOnly = button.dataset.adminOnly === "1";
        button.style.display = adminOnly && !isAdmin ? "none" : "block";
      });
    }

    function positionPortal(){
      const menu = ensurePortal();
      const rect = gearBtn.getBoundingClientRect();
      menu.style.top = (rect.bottom + 8) + "px";
      menu.style.left = Math.max(12, rect.right - 190) + "px";
    }

    function openPortal(){
      const menu = ensurePortal();
      syncPortalVisibility();
      positionPortal();
      menu.style.display = "flex";
      gearBtn.setAttribute("aria-expanded", "true");
      originalMenu.classList.remove("open");
      originalMenu.style.display = "none";
    }

    function closePortal(){
      if(portal) portal.style.display = "none";
      gearBtn.setAttribute("aria-expanded", "false");
    }

    function togglePortal(e){
      if(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      const menu = ensurePortal();
      if(menu.style.display === "flex") closePortal();
      else openPortal();
    }

    originalMenu.style.display = "none";
    gearBtn.onclick = null;
    gearBtn.addEventListener("click", togglePortal, true);
    gearBtn.addEventListener("pointerdown", function(e){
      e.stopPropagation();
    }, true);

    document.addEventListener("click", function(e){
      if(!portal) return;
      if(e.target === gearBtn || gearBtn.contains(e.target)) return;
      if(portal.contains(e.target)) return;
      closePortal();
    }, true);

    window.addEventListener("resize", function(){
      if(portal && portal.style.display === "flex") positionPortal();
    });

    document.addEventListener("keydown", function(e){
      if(e.key === "Escape") closePortal();
    }, true);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", installTopGearPortalMenu, {once:true});
  } else {
    installTopGearPortalMenu();
  }
  window.addEventListener("load", installTopGearPortalMenu);
})();


function getNotificationDoor(){
return window.NotificationDoor || null;
}
function ensureEmailOpensUi(){
return getNotificationDoor()?.ensureEmailOpensUi?.() || null;
}
function getOwnerEmailOpenSummary(ownerId){
return getNotificationDoor()?.getOwnerEmailOpenSummary?.(ownerId) || {
  totalOpenCount: 0,
  totalClickCount: 0,
  totalEngagementCount: 0,
  companies: [],
  allCompanies: [],
  allTotalOpenCount: 0,
  allTotalClickCount: 0,
  allTotalEngagementCount: 0,
  refreshedAt: ''
};
}
function getDismissedEmailOpenCompanyIds(ownerId){
return getNotificationDoor()?.getDismissedEmailOpenCompanyIds?.(ownerId) || new Set();
}
function setDismissedEmailOpenCompanyIds(ownerId, companyIds){
return getNotificationDoor()?.setDismissedEmailOpenCompanyIds?.(ownerId, companyIds);
}
function dismissCompanyEmailOpen(ownerId, companyId){
return getNotificationDoor()?.dismissCompanyEmailOpen?.(ownerId, companyId);
}
function clearDismissedEmailOpen(ownerId, companyId){
return getNotificationDoor()?.clearDismissedEmailOpen?.(ownerId, companyId);
}
function getVisibleOwnerEmailOpenSummary(ownerId){
return getNotificationDoor()?.getVisibleOwnerEmailOpenSummary?.(ownerId) || getOwnerEmailOpenSummary(ownerId);
}
function findCompanyByNotification(item = {}){
return getNotificationDoor()?.findCompanyByNotification?.(item) || null;
}
function getCompanyEmailEngagement(companyId, ownerId){
return getNotificationDoor()?.getCompanyEmailEngagement?.(companyId, ownerId) || null;
}
function formatEmailEngagementDate(value){
return getNotificationDoor()?.formatEmailEngagementDate?.(value) || 'Never';
}
function renderDetailEmailEngagement(companyId){
return getNotificationDoor()?.renderDetailEmailEngagement?.(companyId);
}
function renderEmailOpensIndicator(){
return getNotificationDoor()?.renderEmailOpensIndicator?.();
}
function renderEmailOpensModal(){
return getNotificationDoor()?.renderEmailOpensModal?.();
}
function openEmailOpensModal(){
return getNotificationDoor()?.openEmailOpensModal?.();
}
function closeEmailOpensModal(){
return getNotificationDoor()?.closeEmailOpensModal?.();
}
async function fetchEmailOpenSummary(ownerId){
return getNotificationDoor()?.fetchEmailOpenSummary?.(ownerId) || getOwnerEmailOpenSummary(ownerId);
}
async function clearCompanyEmailOpens(companyId){
return getNotificationDoor()?.clearCompanyEmailOpens?.(companyId);
}
function restartEmailOpenPolling(){
return getNotificationDoor()?.restartEmailOpenPolling?.();
}
(function initEmailOpensUi(){
const init = () => ensureEmailOpensUi();
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
else init();
window.addEventListener('load', init);
})();


function getWorkspaceDoor(){
return window.WorkspaceDoor || null;
}


let quillComposer = null;
function isQuillUsingDetailForm(company){
  return !!(company?.id && String(state.selectedCompanyId || '') === String(company.id));
}
function getQuillTrackingSnapshot(){
  const modal = document.getElementById('quillComposerModal');
  const raw = String(modal?.dataset?.trackingSnapshot || '').trim();
  if(!raw) return null;
  try{
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch(err){
    return null;
  }
}
function setQuillTrackingSnapshot(snapshot){
  const modal = document.getElementById('quillComposerModal');
  if(!modal) return;
  if(snapshot && typeof snapshot === 'object'){
    modal.dataset.trackingSnapshot = JSON.stringify(snapshot);
  } else {
    delete modal.dataset.trackingSnapshot;
  }
}
function getSelectedCompanyForQuill(){
  const snapshot = getQuillTrackingSnapshot();
  const snapshotCompanyId = String(snapshot?.companyId || '').trim();
  const editorCompanyId = String(state.emailEditor?.companyId || '').trim();
  const selectedCompanyId = String(state.selectedCompanyId || '').trim();
  const companyId = snapshotCompanyId || editorCompanyId || selectedCompanyId;
  return companyId ? getCompanyById(companyId) : null;
}
function getSelectedCompanyEmailForQuill(company){
  const local = company ? getCompanyState(company.id) : null;
  const props = company?.properties || {};
  const detailEmail = isQuillUsingDetailForm(company) ? String(ui.prospectEmail?.value || '').trim() : '';
  return String(detailEmail || local?.email || props.email || '').trim();
}
function getSelectedFirstNameForQuill(company){
  const local = company ? getCompanyState(company.id) : null;
  const props = company?.properties || {};
  const detailFirst = isQuillUsingDetailForm(company) ? String(ui.contactFirst?.value || '').trim() : '';
  return String(detailFirst || local?.contactFirst || props.firstname || 'there').trim() || 'there';
}
function getSelectedTouchIndexForQuill(company){
  if(Number.isInteger(state.emailEditor?.touchIndex) && state.emailEditor.touchIndex >= 0){
    return state.emailEditor.touchIndex;
  }
  if(!company?.id) return 0;
  const zeroIndex = typeof getCurrentNextTouchZeroIndex === 'function' ? getCurrentNextTouchZeroIndex(company.id) : 0;
  return zeroIndex >= 0 ? zeroIndex : 0;
}
function getResolvedQuillTemplate(company){
  const firstName = getSelectedFirstNameForQuill(company);
  const meta = getQuillTemplateMeta(company);
  const replaceName = (value) => String(value || '').replaceAll('{{firstName}}', firstName || 'there');
  if(typeof getOwnerEmailTemplateOverride === 'function' && typeof getDefaultEmailTemplateContent === 'function'){
    const override = getOwnerEmailTemplateOverride(meta.ownerId, meta.templateKey, meta.touchIndex);
    const fallback = getDefaultEmailTemplateContent(meta.templateKey, meta.touchIndex);
    return {
      templateKey: meta.templateKey,
      subject: replaceName(override?.subject ?? fallback?.subject),
      body: replaceName(override?.body ?? fallback?.body)
    };
  }
  if(typeof getResolvedEmailTemplate === 'function'){
    return getResolvedEmailTemplate(meta.ownerId, meta.touchIndex, firstName) || { subject: '', body: '' };
  }
  return { subject: '', body: '' };
}
function getQuillTemplateMeta(company){
  const ownerId = state.selectedOwnerId || 'default';
  const touchIndex = getSelectedTouchIndexForQuill(company);
  const templateKey = (company?.id && (getCompanyTouchTemplateSelection(company.id, touchIndex) || getCadenceStepTemplateSelection(company.id, touchIndex))) || getOwnerEmailTemplateSelection(ownerId, touchIndex) || 'default';
  const options = typeof getAllEmailTemplateOptions === 'function' ? getAllEmailTemplateOptions(ownerId, touchIndex) : [];
  const editable = typeof getEditableOwnerEmailTemplate === 'function' ? getEditableOwnerEmailTemplate(ownerId, touchIndex) : null;
  const optionLabel = (options.find(option => option.value === templateKey)?.label) || '';
  const label = String(editable?.name || editable?.label || optionLabel || 'Default').trim() || 'Default';
  return { ownerId, touchIndex, templateKey, label, options };
}
function updateQuillTemplateSummary(company){
  const labelEl = document.getElementById('quillCurrentTemplateLabel');
  const meta = getQuillTemplateMeta(company);
  if(labelEl) labelEl.textContent = `Template: ${meta.label}`;
  const select = document.getElementById('quillTemplateSelect');
  if(select){
    select.innerHTML = (meta.options || []).map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('');
    if(meta.templateKey) select.value = meta.templateKey;
  }
  return meta;
}
function applyQuillTemplateSelection(templateKey, company){
  const meta = getQuillTemplateMeta(company);
  const nextKey = String(templateKey || 'default').trim() || 'default';
  if(company?.id){
    setCompanyTouchTemplateSelection(company.id, meta.touchIndex, nextKey);
  }
  setOwnerEmailTemplateSelection(meta.ownerId, meta.touchIndex, nextKey);
  updateQuillTemplateSummary(company);
  CQBus.emit('render:board');
  if(company?.id && String(state.selectedCompanyId) === String(company.id)){
    CQBus.emit('render:detail');
  }
}
function loadSelectedTemplateIntoQuill(){
  const company = getSelectedCompanyForQuill();
  const tpl = getResolvedQuillTemplate(company);
  updateQuillTemplateSummary(company);
  setQuillSubjectValue(String(tpl?.subject || ''));
  const editor = ensureQuillComposer();
  if(editor){
    editor.setContents([]);
    editor.clipboard.dangerouslyPasteHTML(buildQuillStarterHtml(company));
  }
  return tpl;
}
function ensureQuillTemplateDropdown(){
  return document.getElementById('quillTemplatePickerMenu');
}
function hideQuillTemplateDropdown(){
  const dropdown = document.getElementById('quillTemplatePickerMenu');
  if(dropdown) dropdown.classList.remove('open');
}
function showQuillTemplateDropdown(anchorButton){
  const company = getSelectedCompanyForQuill();
  const meta = updateQuillTemplateSummary(company);
  const dropdown = ensureQuillTemplateDropdown();
  if(!dropdown) return;
  dropdown.innerHTML = (meta.options || []).map(option => `
    <button class="quillTemplateOption ${option.value === meta.templateKey ? 'active' : ''}" type="button" data-template-key="${escapeHtml(option.value)}">${escapeHtml(option.label)}</button>
  `).join('');
  dropdown.querySelectorAll('[data-template-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyQuillTemplateSelection(btn.getAttribute('data-template-key') || 'default', company);
      loadSelectedTemplateIntoQuill();
      hideQuillTemplateDropdown();
      const subjectInput = document.getElementById('quillComposerSubject');
      try{ subjectInput?.focus(); subjectInput?.select(); } catch(err){}
    });
  });
  dropdown.classList.add('open');
  setTimeout(() => {
    try{ dropdown.querySelector('[data-template-key].active, [data-template-key]')?.focus(); } catch(err){}
  }, 10);
}
function buildQuillStarterHtml(company){
  const tpl = getResolvedQuillTemplate(company);
  const body = String(tpl?.body || '').trim();
  if(body){
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(body) || /&nbsp;|&amp;|&#\d+;|&#x[\da-f]+;/i.test(body);
    return looksLikeHtml ? body : escapeHtml(body).replace(/\r?\n/g, '<br>');
  }
  const firstName = getSelectedFirstNameForQuill(company);
  return `<p>Hi ${escapeHtml(firstName)},</p><p></p><p>I wanted to reach out and introduce myself.</p><p></p><p>Best,<br>${escapeHtml((state.authUser && (state.authUser.firstName || state.authUser.name)) || 'Patric')}</p>`;
}
function setQuillSubjectValue(value){
  const input = document.getElementById('quillComposerSubject');
  if(input) input.value = String(value || '');
}
function getQuillSubjectValue(company){
  const input = document.getElementById('quillComposerSubject');
  const typed = String(input?.value || '').trim();
  if(typed) return typed;
  const tpl = getResolvedQuillTemplate(company);
  return String(tpl?.subject || `Draft Email${company?.name ? ` - ${company.name}` : ''}`).trim();
}
function ensureQuillComposer(){
  if(quillComposer) return quillComposer;
  const editorEl = document.getElementById('quillComposerEditor');
  if(typeof Quill === 'undefined' || !editorEl) return null;
  quillComposer = new Quill(editorEl, {
    theme: 'snow',
    modules: { toolbar: '#quillComposerToolbar' },
    placeholder: 'Draft your email here...'
  });
  return quillComposer;
}
function openQuillComposerModal(){
  const modal = document.getElementById('quillComposerModal');
  if(!modal) return;
  const company = getSelectedCompanyForQuill();
  if(company?.id){
    const touchIndex = getSelectedTouchIndexForQuill(company);
    const ownerId = String(state.selectedOwnerId || state.authUser?.hubspotOwnerId || state.authUser?.email || '').trim();
    setQuillTrackingSnapshot({
      companyId: String(company.id || '').trim(),
      ownerId,
      touchIndex,
      openedAt: new Date().toISOString()
    });
  }
  updateQuillTemplateSummary(company);
  loadSelectedTemplateIntoQuill();
  const editor = ensureQuillComposer();
  setTimeout(() => {
    const subjectInput = document.getElementById('quillComposerSubject');
    if(subjectInput){
      try{ subjectInput.focus(); subjectInput.select(); return; } catch(err){}
    }
    try{ editor?.focus(); } catch(err){}
  }, 30);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('calendar-modal-open');
}
function closeQuillComposerModal(){
  const modal = document.getElementById('quillComposerModal');
  if(!modal) return;
  setQuillTrackingSnapshot(null);
  hideQuillTemplateDropdown();
  if(document.activeElement && modal.contains(document.activeElement)){
    try{ document.activeElement.blur(); } catch(err){}
  }
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('calendar-modal-open');
}

function convertTrackedHtmlToPlainText(html){
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${String(html || '')}</div>`, 'text/html');
  doc.querySelectorAll('img').forEach((img) => img.remove());
  doc.querySelectorAll('a[href]').forEach((link) => {
    const href = String(link.getAttribute('href') || '').trim();
    const text = String(link.textContent || '').trim();
    const replacement = text && text !== href ? `${text}: ${href}` : (href || text);
    link.replaceWith(doc.createTextNode(replacement));
  });
  const root = doc.body;
  const blocks = [];
  function walk(node){
    node.childNodes.forEach((child) => {
      if(child.nodeType === Node.TEXT_NODE){
        blocks.push(child.textContent || '');
        return;
      }
      if(child.nodeType !== Node.ELEMENT_NODE) return;
      const tag = child.tagName;
      if(tag === 'BR'){
        blocks.push('\n');
        return;
      }
      if(tag === 'LI'){
        blocks.push('• ');
        walk(child);
        blocks.push('\n');
        return;
      }
      walk(child);
      if(['P','DIV','UL','OL','H1','H2','H3','H4','H5','H6'].includes(tag)){
        blocks.push('\n\n');
      }
    });
  }
  walk(root);
  return blocks.join('')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n +/g, '\n')
    .trim();
}
function buildQuillTrackingMessageId(){
  try{
    if(window.crypto?.randomUUID) return String(window.crypto.randomUUID());
  } catch(err){}
  return `cq_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function getQuillTrackingContext(company){
  const snapshot = getQuillTrackingSnapshot();
  const companyId = String(company?.id || snapshot?.companyId || state.emailEditor?.companyId || state.selectedCompanyId || '').trim();
  const touchIndex = Number.isInteger(snapshot?.touchIndex) && snapshot.touchIndex >= 0 ? snapshot.touchIndex : getSelectedTouchIndexForQuill(company);
  const subject = getQuillSubjectValue(company);
  const ownerId = String(snapshot?.ownerId || state.selectedOwnerId || state.authUser?.hubspotOwnerId || state.authUser?.email || '').trim();
  const local = company ? getCompanyState(company.id) : null;
  const contactEmail = String(getSelectedCompanyEmailForQuill(company) || '').trim();
  const contactName = String(`${getSelectedFirstNameForQuill(company)} ${local?.contactLast || ''}`.trim()).trim();
  const createdAt = new Date().toISOString();
  const templateMeta = getQuillTemplateMeta(company);
  return {
    messageId: buildQuillTrackingMessageId(),
    companyId,
    ownerId,
    touchIndex,
    touchNumber: touchIndex + 1,
    subject,
    campaign: `touch_${touchIndex + 1}`,
    contactName,
    contactEmail,
    createdAt,
    activationDelayMinutes: 2,
    templateKey: templateMeta.templateKey || '',
    templateName: templateMeta.label || ''
  };
}
function base64UrlEncodeString(value){
  try{
    const encoded = btoa(unescape(encodeURIComponent(String(value || ''))));
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch(err){
    return '';
  }
}
function buildEmailTrackingToken(tracking){
  return base64UrlEncodeString(JSON.stringify({
    m: tracking.messageId || buildQuillTrackingMessageId(),
    c: tracking.companyId || '',
    o: tracking.ownerId || '',
    t: Number(tracking.touchNumber || 0),
    s: tracking.subject || '',
    n: tracking.contactName || '',
    e: tracking.contactEmail || '',
    i: tracking.createdAt || new Date().toISOString(),
    d: Number(tracking.activationDelayMinutes || 2),
    k: tracking.templateKey || '',
    l: tracking.templateName || ''
  }));
}
function appendUtmParams(url, tracking){
  try{
    const parsed = new URL(String(url || '').trim());
    if(!/^https?:$/i.test(parsed.protocol)) return String(url || '').trim();
    parsed.searchParams.set('utm_source', 'cadenceq');
    parsed.searchParams.set('utm_medium', 'email');
    parsed.searchParams.set('utm_campaign', tracking.campaign || 'outreach');
    if(tracking.companyId) parsed.searchParams.set('company_id', tracking.companyId);
    if(tracking.touchNumber) parsed.searchParams.set('touch', String(tracking.touchNumber));
    if(tracking.templateName) parsed.searchParams.set('template', tracking.templateName);
    return parsed.toString();
  } catch(err){
    return String(url || '').trim();
  }
}
function buildTrackedClickUrl(url, tracking){
  const trackedTarget = appendUtmParams(url, tracking);
  try{
    const redirectUrl = new URL(`${API}/api/email-track/click`);
    const token = buildEmailTrackingToken(tracking);
    if(token) redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('target', trackedTarget);
    return redirectUrl.toString();
  } catch(err){
    return trackedTarget;
  }
}
function buildOpenPixelUrl(tracking){
  try{
    const pixelUrl = new URL(`${API}/api/email-track/open/pixel.gif`);
    const token = buildEmailTrackingToken(tracking);
    if(token) pixelUrl.searchParams.set('token', token);
    return pixelUrl.toString();
  } catch(err){
    return '';
  }
}
function buildTrackedQuillHtml(rawHtml, company){
  const tracking = getQuillTrackingContext(company);
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${String(rawHtml || '').trim()}</div>`, 'text/html');
  const root = doc.body.firstElementChild || doc.body;
  doc.querySelectorAll('img[src*="/api/email-track/open/pixel.gif"], img[data-cq-tracking-pixel="true"]').forEach((img) => img.remove());
  doc.querySelectorAll('a[href]').forEach((link) => {
    const href = String(link.getAttribute('href') || '').trim();
    if(!href || /^mailto:|^tel:|^#/i.test(href)) return;
    let cleanHref = href;
    try{
      const parsedHref = new URL(href);
      const looksTracked = /\/api\/email-track\/click$/i.test(parsedHref.pathname || '') && parsedHref.searchParams.get('target');
      if(looksTracked) cleanHref = String(parsedHref.searchParams.get('target') || href).trim() || href;
    } catch(err){}
    link.setAttribute('href', buildTrackedClickUrl(cleanHref, tracking));
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    if(!String(link.textContent || '').trim()){
      link.textContent = appendUtmParams(href, tracking);
    }
  });
  const pixelUrl = buildOpenPixelUrl(tracking);
  if(pixelUrl){
    const pixel = doc.createElement('img');
    pixel.setAttribute('src', pixelUrl);
    pixel.setAttribute('width', '1');
    pixel.setAttribute('height', '1');
    pixel.setAttribute('alt', '');
    pixel.setAttribute('style', 'display:block;width:1px;height:1px;border:0;opacity:0;overflow:hidden;');
    pixel.setAttribute('data-cq-tracking-pixel', 'true');
    root.appendChild(pixel);
  }
  return root.innerHTML.trim();
}
async function copyTrackedQuillHtml(options = {}){
  const company = getSelectedCompanyForQuill();
  const editor = ensureQuillComposer();
  if(!editor){
    showToast('Quill editor is not ready');
    return { ok: false, reason: 'editor' };
  }
  const rawHtml = String(editor.root?.innerHTML || '').trim();
  if(!rawHtml){
    showToast('Nothing to copy yet');
    return { ok: false, reason: 'empty' };
  }
  const trackedHtml = buildTrackedQuillHtml(rawHtml, company);
  const plainText = convertTrackedHtmlToPlainText(trackedHtml);
  let copied = false;
  try{
    if(navigator.clipboard?.write && typeof ClipboardItem !== 'undefined'){
      const item = new ClipboardItem({
        'text/html': new Blob([trackedHtml], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' })
      });
      await navigator.clipboard.write([item]);
      copied = true;
    }
  } catch(err){}
  if(!copied){
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(trackedHtml);
        copied = true;
      }
    } catch(err){}
  }
  if(!copied){
    try{
      const temp = document.createElement('textarea');
      temp.value = trackedHtml;
      document.body.appendChild(temp);
      temp.select();
      copied = document.execCommand('copy');
      temp.remove();
    } catch(err){
      copied = false;
    }
  }
  if(!copied){
    showToast('Copy failed');
    return { ok: false, reason: 'copy' };
  }
  if(!options.silent){
    showToast(options.toastMessage || 'Tracked HTML copied');
  }
  return { ok: true, trackedHtml, plainText, company };
}
async function openQuillDraftInOutlook(){
  const company = getSelectedCompanyForQuill();
  const email = getSelectedCompanyEmailForQuill(company);
  if(!email){
    showToast('No email found for this company');
    return;
  }
  const copyResult = await copyTrackedQuillHtml({
    silent: true,
    toastMessage: 'Tracked HTML copied'
  });
  if(!copyResult?.ok){
    return;
  }
  const subject = getQuillSubjectValue(company);
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}`;
  window.location.href = mailto;
  showToast('HTML copied. Paste into Outlook draft body');
}
(function initQuillComposerUi(){
  const wire = () => {
    document.getElementById('detailQuillBtn')?.addEventListener('click', openQuillComposerModal);
    document.getElementById('closeQuillComposerModalBtn')?.addEventListener('click', closeQuillComposerModal);
    document.getElementById('cancelQuillComposerBtn')?.addEventListener('click', closeQuillComposerModal);
    document.getElementById('copyQuillHtmlBtn')?.addEventListener('click', copyTrackedQuillHtml);
    document.getElementById('openQuillOutlookBtn')?.addEventListener('click', openQuillDraftInOutlook);
    document.getElementById('quillLoadTemplateBtn')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const dropdown = document.getElementById('quillTemplatePickerMenu');
      if(dropdown?.classList.contains('open')) hideQuillTemplateDropdown();
      else showQuillTemplateDropdown(event.currentTarget);
    });
    document.getElementById('quillSaveTemplateBtn')?.addEventListener('click', () => {
      const company = getSelectedCompanyForQuill();
      const meta = getQuillTemplateMeta(company);
      const editor = ensureQuillComposer();
      const subjectValue = getQuillSubjectValue(company);
      const bodyHtml = String(editor?.root?.innerHTML || '').trim();
      saveOwnerEmailTemplateOverride(meta.ownerId, meta.templateKey, subjectValue, bodyHtml, meta.label, meta.touchIndex);
      updateQuillTemplateSummary(company);
      loadSelectedTemplateIntoQuill();
      setQuillSubjectValue(subjectValue);
      showToast('Template saved successfully');
      CQBus.emit('render:board');
      if(company?.id && String(state.selectedCompanyId) === String(company.id)) CQBus.emit('render:detail');
    });
    document.getElementById('quillNewTemplateBtn')?.addEventListener('click', () => {
      const company = getSelectedCompanyForQuill();
      const ownerId = state.selectedOwnerId || 'default';
      const name = window.prompt('New template name?');
      if(name == null) return;
      const cleanName = String(name || '').trim();
      if(!cleanName) return;
      const templateKey = createOwnerCustomEmailTemplate(ownerId, cleanName, '', '');
      const touchIndex = getSelectedTouchIndexForQuill(company);
      setOwnerEmailTemplateSelection(ownerId, touchIndex, templateKey);
      if(company?.id) setCompanyTouchTemplateSelection(company.id, touchIndex, templateKey);
      updateQuillTemplateSummary(company);
      setQuillSubjectValue('');
      const editor = ensureQuillComposer();
      if(editor) editor.setContents([]);
      CQBus.emit('render:board');
      if(company?.id && String(state.selectedCompanyId) === String(company.id)) CQBus.emit('render:detail');
      const subjectInput = document.getElementById('quillComposerSubject');
      try{ subjectInput?.focus(); subjectInput?.select(); } catch(err){}
    });
    document.getElementById('quillDeleteTemplateBtn')?.addEventListener('click', () => {
      const company = getSelectedCompanyForQuill();
      const meta = getQuillTemplateMeta(company);
      if(!isCustomEmailTemplate(meta.ownerId, meta.templateKey)){
        showToast('Only custom templates can be deleted');
        return;
      }
      const confirmed = window.confirm(`Delete template "${meta.label || 'Custom Template'}"?`);
      if(!confirmed) return;
      const deleted = deleteOwnerCustomEmailTemplate(meta.ownerId, meta.templateKey);
      if(!deleted){
        showToast('Template could not be deleted');
        return;
      }
      const touchIndex = getSelectedTouchIndexForQuill(company);
      const nextKey = getOwnerEmailTemplateSelection(meta.ownerId, touchIndex) || 'default';
      if(company?.id) setCompanyTouchTemplateSelection(company.id, touchIndex, nextKey);
      updateQuillTemplateSummary(company);
      loadSelectedTemplateIntoQuill();
      hideQuillTemplateDropdown();
      CQBus.emit('render:board');
      if(company?.id && String(state.selectedCompanyId) === String(company.id)) CQBus.emit('render:detail');
      showToast('Template deleted');
    });
    document.getElementById('quillComposerModal')?.addEventListener('click', (event) => {
      if(event.target && event.target.id === 'quillComposerModal') closeQuillComposerModal();
      if(!event.target.closest('.quillHeaderActions')) hideQuillTemplateDropdown();
    });
    document.addEventListener('keydown', (event) => {
      const modal = document.getElementById('quillComposerModal');
      if(event.key === 'Escape' && modal?.classList.contains('open')) closeQuillComposerModal();
    });
  };
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wire, { once: true });
  } else {
    wire();
  }
})();
(function installUiPatchHelpers(){
  const run = () => {
    syncViewToggleButtons();
    removeLegacyTopVerticalControl();
    document.addEventListener("click", async (e) => {
      const target = e.target;
      if(!target || !target.closest) return;
      const clearLike = target.closest(".flatpickr-clear, .ui-datepicker-close") || (((target.textContent || "").trim().toLowerCase() === "clear") ? target : null);
      if(!clearLike) return;
      if(!(clearLike.closest(".ui-datepicker") || clearLike.closest(".flatpickr-calendar") || clearLike.classList?.contains("flatpickr-clear") || clearLike.classList?.contains("ui-datepicker-close"))) return;
      e.preventDefault();
      e.stopPropagation();
      const scopedInput = clearLike.closest(".calendarBadgeTrigger, .dueInlineRow, .dueDateField")?.querySelector(".dueDateInput") || document.querySelector(".dueDateInput[data-focus-due-company], .dueDateInput[data-company-id]");
      const companyId = scopedInput?.dataset?.focusDueCompany || scopedInput?.dataset?.companyId || state.selectedCompanyId || "";
      if(companyId) await clearNextDueDate(companyId);
    }, true);
  };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once:true });
  else run();
})();


(function installHeaderTemplateComposerBridge(){
  function openHeaderTemplateComposer(){
    try{
      const fallbackCompanyId = String(
        state.selectedCompanyId ||
        state.pinnedCompanyId ||
        (window.WorkspaceDoor?.getDefaultDetailCompanyId?.() || "")
      ).trim();
      if(fallbackCompanyId){
        state.selectedCompanyId = fallbackCompanyId;
        state.pinnedCompanyId = fallbackCompanyId;
        if(typeof renderProspectList === "function") renderProspectList();
        if(state.currentView !== "detail" && typeof setView === "function") setView("detail");
        CQBus.emit('render:detail');
        if(typeof loadPrimaryContact === "function") loadPrimaryContact(fallbackCompanyId);
        if(state.emailEditor){
          state.emailEditor.companyId = fallbackCompanyId;
          const company = typeof getCompanyById === "function" ? getCompanyById(fallbackCompanyId) : null;
          const nextIndex = company && typeof getCurrentNextTouchZeroIndex === "function" ? getCurrentNextTouchZeroIndex(company.id) : 0;
          state.emailEditor.touchIndex = Number.isInteger(nextIndex) && nextIndex >= 0 ? nextIndex : 0;
        }
      }
      try{ closeDetailSettingsMenu(); } catch(_){}
      try{ hideQuillTemplateDropdown(); } catch(_){}
      try{ openQuillComposerModal(); } catch(err){ console.error("openHeaderTemplateComposer failed", err); }
      return false;
    } catch(err){
      console.error("openHeaderTemplateComposer failed", err);
      return false;
    }
  }
  window.openHeaderTemplateComposer = openHeaderTemplateComposer;
})();;

try{ initMailerReviewModal(); } catch(error){ console.error("[CadenceQ] mailer review modal init failed", error); }


// Cadence Designer binding moved to cadence-designer.js



/* -- Mobile app shell (moved to mobile.js Phase 5) -- */
/* mobile.js loads after workspace.js and self-initialises via its own IIFE. */




/* =============================================================================
 * CQCore — Phase 1 Public Surface
 * =============================================================================
 * Appended to the bottom of app.js as part of the modularization plan.
 *
 * PURPOSE:
 * Exposes a stable, explicit API that domain modules (workspace.js,
 * reporting.js, notifications.js, capture.js, etc.) can call instead of
 * reaching into app.js globals directly. This surface is the ONLY contract
 * between app.js and the outside world going forward.
 *
 * BACKEND IS SOURCE OF TRUTH:
 * All data in window.state comes from server responses. state.local is
 * session-only in-memory state (never persisted to localStorage). state.remote
 * holds server-fetched data. Nothing in CQCore reads from localStorage.
 * The nearby geo cache (localStorage) is a performance hint only — if it
 * misses, the server is called. It will be removed in Phase 6.
 *
 * USAGE (from any domain module):
 *   const core = window.CQCore;
 *   const company = core.getCompanyById('123');
 *   core.showToast('Saved');
 *   CQBus.emit('render:board');
 *
 * LOAD ORDER: cq-bus.js → app.js → [domain modules]
 * ============================================================================= */

(function installCQCore() {
  'use strict';

  /* Guard: only install once */
  if (window.CQCore) return;

  /* Validate CQBus loaded before us */
  if (typeof window.CQBus === 'undefined') {
    console.error('[CQCore] CQBus not found. Ensure cq-bus.js loads before app.js.');
  }

  /* ------------------------------------------------------------------
   * Internal helpers — safe wrappers around app.js globals
   * ------------------------------------------------------------------ */

  function safeCall(fn, args, fallback) {
    try {
      if (typeof fn === 'function') return fn.apply(window, args || []);
    } catch (err) {
      console.error('[CQCore] safeCall error:', err);
    }
    return fallback;
  }

  /* ------------------------------------------------------------------
   * STATE — read-only access to session state.
   * Modules must NOT mutate state directly; they call CQCore mutators
   * or fire CQBus events that app.js handles.
   * ------------------------------------------------------------------ */

  var stateApi = {
    /**
     * Returns the full session state object.
     * Treat as read-only — use CQCore mutators to change things.
     */
    get: function () {
      return window.state || {};
    },

    /** Currently authenticated user (null until auth:ready fires) */
    getAuthUser: function () {
      return (window.state && window.state.authUser) || null;
    },

    /** Currently selected owner ID */
    getSelectedOwnerId: function () {
      return String((window.state && window.state.selectedOwnerId) || '');
    },

    /** All owners loaded for this session */
    getOwners: function () {
      return (window.state && window.state.owners) || [];
    },

    /** All companies currently in session (filtered by selected owner) */
    getCompanies: function () {
      return (window.state && window.state.companies) || [];
    },

    /** Currently selected company ID */
    getSelectedCompanyId: function () {
      return String((window.state && window.state.selectedCompanyId) || '');
    },

    /** True if the user has the admin role */
    isAdmin: function () {
      return String((window.state && window.state.authUser && window.state.authUser.role) || '') === 'admin';
    },

    /** True if the user has the tc role */
    isTc: function () {
      return String((window.state && window.state.authUser && window.state.authUser.role) || '') === 'tc';
    }
  };

  /* ------------------------------------------------------------------
   * COMPANY DATA — read-only lookups, all backed by server data
   * ------------------------------------------------------------------ */

  var companyApi = {
    /**
     * Get a company object by HubSpot company ID.
     * Returns the live object from state.companies (server-sourced).
     */
    getById: function (companyId) {
      return safeCall(window.getCompanyById, [companyId], null);
    },

    /**
     * Get the merged company state (server + in-memory session overrides).
     * This is the source for status, priority, notes, due date, etc.
     */
    getState: function (companyId) {
      return safeCall(window.getCompanyState, [companyId], {});
    },

    /**
     * Queue a debounced server-side save of company state.
     * Modules should call this after mutating state for a company.
     */
    queueStateSave: function (companyId, options) {
      return safeCall(window.queueCompanyStateSave, [companyId, options]);
    },

    /**
     * Returns companies visible in the current list view
     * (filtered + sorted by whatever the sidebar sort is set to).
     * Data comes entirely from state.companies (server-sourced).
     */
    getVisible: function () {
      return safeCall(window.getVisibleCompanies, [], []);
    },

    /**
     * Returns the priority for a company: 'hot' | 'warm' | 'cold'
     */
    getPriority: function (companyId) {
      return safeCall(window.getCompanyPriority, [companyId], 'cold');
    },

    /**
     * Returns the due date display label for a company.
     */
    getDueLabel: function (companyId) {
      return safeCall(window.getDueLabel, [companyId], '');
    }
  };

  /* ------------------------------------------------------------------
   * TOUCH / CADENCE DATA — all sourced from server-loaded cadence data
   * ------------------------------------------------------------------ */

  var touchApi = {
    /**
     * Whether a specific touch index has been completed for a company.
     * @param {string} companyId
     * @param {number} zeroIndex — 0-based touch index
     */
    isChecked: function (companyId, zeroIndex) {
      return safeCall(window.isTouchChecked, [companyId, zeroIndex], false);
    },

    /**
     * ISO timestamp of when a touch was completed, or '' if not done.
     */
    getTimestamp: function (companyId, zeroIndex) {
      return safeCall(window.getTouchTimestamp, [companyId, zeroIndex], '');
    },

    /**
     * The resolved next touch index (1-based per cadence display logic).
     */
    getNextIndex: function (companyId) {
      return safeCall(window.getResolvedNextTouchIndex, [companyId], 1);
    },

    /**
     * The full next touch object { title, type, ... }
     */
    getNextTouch: function (companyId) {
      return safeCall(window.getCurrentNextTouch, [companyId], null);
    }
  };

  /* ------------------------------------------------------------------
   * OWNER — selected owner context
   * ------------------------------------------------------------------ */

  var ownerApi = {
    /**
     * Returns { ownerId, ownerName } for the currently selected owner.
     */
    getMeta: function () {
      return safeCall(window.getSelectedOwnerMeta, [], { ownerId: '', ownerName: '' });
    }
  };

  /* ------------------------------------------------------------------
   * UI UTILITIES
   * ------------------------------------------------------------------ */

  var uiApi = {
    /**
     * Show a toast notification.
     * @param {string} message
     * @param {object} [options] — { tone: 'success'|'error'|'default', duration: ms }
     */
    showToast: function (message, options) {
      return safeCall(window.showToast, [message, options || {}]);
    },

    /**
     * Escape a string for safe HTML insertion.
     */
    escapeHtml: function (str) {
      return safeCall(window.escapeHtml, [str], String(str || ''));
    },

    /**
     * True if the current viewport is mobile (≤980px).
     */
    isMobile: function () {
      return safeCall(window.isMobileViewport, [], false);
    },

    /**
     * Smoothly scroll the workspace panel to the top.
     */
    scrollToTop: function () {
      return safeCall(window.scrollWorkspaceToTop, []);
    },

    /**
     * Switch the main view to 'board' or 'detail'.
     * @param {'board'|'detail'} view
     */
    setView: function (view) {
      return safeCall(window.setView, [view]);
    },

    /**
     * Re-render the sidebar prospect list.
     */
    renderProspectList: function () {
      return safeCall(window.renderProspectList, []);
    },

    /**
     * Collapse the sidebar (e.g. after selecting a company on mobile).
     */
    collapseSidebarForSelection: function () {
      return safeCall(window.collapseSidebarForSelection, []);
    }
  };

  /* ------------------------------------------------------------------
   * FETCH — the authenticated fetch wrapper
   * Modules must use this instead of raw fetch() so that session
   * expiry is handled centrally (401 → logout flow in app.js).
   * ------------------------------------------------------------------ */

  var fetchApi = {
    /**
     * Authenticated fetch. Same signature as window.fetch.
     * Automatically includes credentials and handles 401 redirects.
     */
    call: function (input, init) {
      /* window.fetch is patched in app.js to intercept 401s */
      return window.fetch(input, init);
    },

    /**
     * The resolved API base URL (e.g. 'https://api.cadenceq.com').
     * Use this instead of hardcoding the URL in domain modules.
     */
    get apiBase() {
      return window.API || 'https://api.cadenceq.com';
    }
  };

  /* ------------------------------------------------------------------
   * BUS INTEGRATION — convenience wrappers so modules don't need to
   * reference CQBus directly for the most common operations
   * ------------------------------------------------------------------ */

  var busApi = {
    /** Emit a render:board event */
    renderBoard: function () {
      if (window.CQBus) window.CQBus.emit('render:board');
    },
    /** Emit a render:detail event */
    renderDetail: function () {
      if (window.CQBus) window.CQBus.emit('render:detail');
    },
    /** Emit a render:list event */
    renderList: function () {
      if (window.CQBus) window.CQBus.emit('render:list');
    },
    /** Emit both board and detail (common after a mutation) */
    renderAll: function () {
      if (window.CQBus) {
        window.CQBus.emit('render:board');
        window.CQBus.emit('render:detail');
      }
    }
  };

  /* ------------------------------------------------------------------
   * INSTALL
   * ------------------------------------------------------------------ */

  window.CQCore = {
    state:   stateApi,
    company: companyApi,
    touch:   touchApi,
    owner:   ownerApi,
    ui:      uiApi,
    fetch:   fetchApi,
    bus:     busApi,

    /** Version tag — bump when the surface changes */
    version: '2.0.0',
    phase:   6
  };

  /* Signal that app.js has fully loaded and CQCore is available */
  if (window.CQBus) {
    window.CQBus.emit('core:ready', { version: window.CQCore.version });
  }

  if (typeof console !== 'undefined') {
    console.log('[CadenceQ] CQCore v' + window.CQCore.version + ' installed (Phase 6 — modularization complete)');
  }

}());
