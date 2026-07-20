const memberApi = window.AiXApi.createClient({ sessionPath: "/api/auth/me" });
const apiRequest = (path, options = {}) => memberApi.request(path, options);

let memberSessionPromise = null;

function bootstrapMemberSession() {
  if (!memberSessionPromise) {
    memberSessionPromise = memberApi.bootstrap().catch((error) => {
      memberSessionPromise = null;
      throw error;
    });
  }
  return memberSessionPromise;
}

const resultIcon = document.getElementById("paymentResultIcon");
const resultIconGlyph = resultIcon?.querySelector("i");
const resultTitle = document.getElementById("paymentResultTitle");
const resultCopy = document.getElementById("paymentResultCopy");
const resultMeta = document.getElementById("paymentResultMeta");
const resultCard = document.getElementById("paymentResultCard");
const dashboardLink = document.getElementById("dashboardLink");
const receiptLink = document.getElementById("receiptLink");
const paymentRetryButton = document.getElementById("paymentRetryButton");
const toast = document.getElementById("toast");

const PAYMENT_POLL_DELAYS_MS = Object.freeze([2000, 3000, 5000, 8000, 12000, 15000]);
const PAYMENT_POLL_MAX_MS = 60000;
const PAYMENT_REQUEST_TIMEOUT_MS = 12000;

let toastTimer = null;
let pollTimer = null;
let pollStartedAt = 0;
let pollAttempt = 0;
let verificationInFlight = false;
let paymentResolved = false;
let lastCheckedAt = 0;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function renderResult(state, title, copy) {
  resultIcon.className = `result-icon ${state}`;
  if (resultIconGlyph) {
    resultIconGlyph.className = state === "success"
      ? "fa-solid fa-check"
      : state === "error"
        ? "fa-solid fa-triangle-exclamation"
        : "fa-solid fa-clock";
  }
  resultTitle.textContent = title;
  resultCopy.textContent = copy;
}

function formatCheckedTime(timestamp) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(timestamp));
}

function setResultMeta(message) {
  if (resultMeta) resultMeta.textContent = message;
}

function setBusy(isBusy) {
  resultCard?.setAttribute("aria-busy", String(isBusy));
  if (paymentRetryButton) paymentRetryButton.disabled = isBusy;
}

function setRetryVisible(isVisible) {
  if (paymentRetryButton) paymentRetryButton.hidden = !isVisible;
}

function clearPolling() {
  if (pollTimer) window.clearTimeout(pollTimer);
  pollTimer = null;
}

function paymentRequestTimeoutError() {
  const error = new Error("หมดเวลารอการตอบกลับจาก Stripe กรุณาตรวจอีกครั้ง");
  error.code = "PAYMENT_REQUEST_TIMEOUT";
  return error;
}

async function requestPaymentStatus(path) {
  const controller = new AbortController();
  let requestTimeoutTimer = null;
  const requestPromise = (async () => {
    await bootstrapMemberSession();
    return apiRequest(path, { signal: controller.signal });
  })();
  const timeoutPromise = new Promise((resolve, reject) => {
    requestTimeoutTimer = window.setTimeout(() => {
      controller.abort();
      memberSessionPromise = null;
      memberApi.clear();
      reject(paymentRequestTimeoutError());
    }, PAYMENT_REQUEST_TIMEOUT_MS);
  });

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } finally {
    window.clearTimeout(requestTimeoutTimer);
  }
}

function stopWithRetry(title, copy) {
  clearPolling();
  renderResult("pending", title, copy);
  setRetryVisible(true);
  const checkedLabel = lastCheckedAt ? `ตรวจล่าสุด ${formatCheckedTime(lastCheckedAt)}` : "ยังไม่ได้รับสถานะล่าสุด";
  setResultMeta(`${checkedLabel} คุณกดตรวจอีกครั้งได้โดยไม่ต้องชำระซ้ำ`);
}

function scheduleNextVerification() {
  if (paymentResolved) return;

  const delay = PAYMENT_POLL_DELAYS_MS[Math.min(pollAttempt, PAYMENT_POLL_DELAYS_MS.length - 1)];
  const elapsed = Date.now() - pollStartedAt;
  if (elapsed + delay > PAYMENT_POLL_MAX_MS) {
    stopWithRetry(
      "ยังรอการยืนยันจาก Stripe",
      "การยืนยัน PromptPay อาจใช้เวลานานกว่าปกติ คุณกดตรวจอีกครั้งได้โดยไม่ต้องชำระซ้ำ"
    );
    return;
  }

  pollAttempt += 1;
  setRetryVisible(false);
  setResultMeta(`ตรวจล่าสุด ${formatCheckedTime(lastCheckedAt)} ระบบจะตรวจอีกครั้งใน ${Math.ceil(delay / 1000)} วินาที`);
  pollTimer = window.setTimeout(() => verifyPayment(), delay);
}

function resetVerification() {
  clearPolling();
  pollStartedAt = Date.now();
  pollAttempt = 0;
  paymentResolved = false;
  lastCheckedAt = 0;
  setRetryVisible(false);
  if (receiptLink) {
    receiptLink.href = "#";
    receiptLink.hidden = true;
  }
  if (dashboardLink) dashboardLink.textContent = "ไป Dashboard";
  renderResult(
    "pending",
    "กำลังตรวจสอบการชำระเงิน",
    "PromptPay อาจใช้เวลายืนยันสักครู่ หน้านี้จะตรวจสถานะซ้ำโดยอัตโนมัติ"
  );
  setResultMeta("กำลังตรวจสอบสถานะล่าสุด");
}

async function verifyPayment({ restart = false } = {}) {
  if (restart) resetVerification();
  if (verificationInFlight || paymentResolved) return;

  const sessionId = new URLSearchParams(window.location.search).get("session_id");
  if (!sessionId) {
    paymentResolved = true;
    setBusy(false);
    setRetryVisible(false);
    renderResult("error", "ไม่พบ Session ID", "กรุณากลับไปเริ่มชำระเงินใหม่อีกครั้ง");
    setResultMeta("ไม่สามารถตรวจสอบรายการนี้ได้");
    return;
  }

  if (!pollStartedAt) pollStartedAt = Date.now();
  verificationInFlight = true;
  setBusy(true);
  setRetryVisible(false);

  try {
    const data = await requestPaymentStatus(`/api/payments/stripe/session/${encodeURIComponent(sessionId)}`);
    lastCheckedAt = Date.now();

    if (data.paymentStatus === "paid") {
      paymentResolved = true;
      clearPolling();
      renderResult("success", "ชำระเงินสำเร็จ", "ระบบปลดล็อกคอร์สให้แล้ว คุณสามารถเข้าเรียนจาก Dashboard ได้ทันที");
      dashboardLink.textContent = "เข้า Dashboard";
      const receiptUrl = data.payment?.receiptUrl || data.payment?.invoiceUrl || "";
      if (receiptUrl && receiptLink) {
        receiptLink.href = receiptUrl;
        receiptLink.hidden = false;
      }
      setResultMeta(`ยืนยันการชำระเงินเมื่อ ${formatCheckedTime(lastCheckedAt)}`);
      showToast("ปลดล็อกคอร์สเรียบร้อย");
      return;
    }

    if (data.status === "expired") {
      paymentResolved = true;
      clearPolling();
      renderResult("error", "ลิงก์ชำระเงินหมดอายุ", "กรุณากลับไปหน้าชำระเงินเพื่อสร้างรายการใหม่");
      setResultMeta(`ตรวจล่าสุด ${formatCheckedTime(lastCheckedAt)}`);
      return;
    }

    renderResult("pending", "รอการยืนยันจาก Stripe", "หน้านี้จะตรวจสถานะ PromptPay ซ้ำโดยอัตโนมัติ คุณไม่ต้องสแกนหรือชำระซ้ำ");
    scheduleNextVerification();
  } catch (error) {
    if (error.status === 401) {
      clearPolling();
      memberApi.clear();
      window.location.replace("/index.html?auth=login");
      return;
    }
    clearPolling();
    renderResult("error", "ตรวจสอบการชำระเงินไม่สำเร็จ", error.message || "กรุณาลองใหม่อีกครั้ง");
    setResultMeta("การเชื่อมต่อสะดุด คุณกดตรวจอีกครั้งได้โดยไม่ต้องชำระซ้ำ");
    setRetryVisible(true);
  } finally {
    verificationInFlight = false;
    setBusy(false);
  }
}

function resumeVerification(event) {
  if (!event.persisted || paymentResolved || verificationInFlight || pollTimer) return;
  return verifyPayment({ restart: true });
}

paymentRetryButton?.addEventListener("click", () => verifyPayment({ restart: true }));
window.addEventListener("pagehide", clearPolling);
window.addEventListener("pageshow", resumeVerification);
verifyPayment();
