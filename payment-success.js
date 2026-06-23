const API_ORIGIN = window.location.origin;
const TOKEN_KEY = "aix_member_token";
const SESSION_KEY = "aix_member_session";

const resultIcon = document.getElementById("paymentResultIcon");
const resultTitle = document.getElementById("paymentResultTitle");
const resultCopy = document.getElementById("paymentResultCopy");
const dashboardLink = document.getElementById("dashboardLink");
const receiptLink = document.getElementById("receiptLink");
const toast = document.getElementById("toast");

let toastTimer = null;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "ไม่สามารถตรวจสอบการชำระเงินได้");
  }
  return response.json();
}

function renderResult(state, title, copy) {
  resultIcon.className = `result-icon ${state}`;
  resultIcon.innerHTML = state === "success"
    ? '<i class="fa-solid fa-check"></i>'
    : state === "error"
      ? '<i class="fa-solid fa-triangle-exclamation"></i>'
      : '<i class="fa-solid fa-clock"></i>';
  resultTitle.textContent = title;
  resultCopy.textContent = copy;
}

async function verifyPayment() {
  if (!token()) {
    window.location.replace("/index.html?auth=login");
    return;
  }

  const sessionId = new URLSearchParams(window.location.search).get("session_id");
  if (!sessionId) {
    renderResult("error", "ไม่พบ Session ID", "กรุณากลับไปเริ่มชำระเงินใหม่อีกครั้ง");
    return;
  }

  try {
    const data = await apiRequest(`/api/payments/stripe/session/${encodeURIComponent(sessionId)}`);
    if (data.member) localStorage.setItem(SESSION_KEY, JSON.stringify(data.member));

    if (data.paymentStatus === "paid") {
      renderResult("success", "ชำระเงินสำเร็จ", "ระบบปลดล็อกคอร์สให้แล้ว คุณสามารถเข้าเรียนจาก Dashboard ได้ทันที");
      dashboardLink.textContent = "เข้า Dashboard";
      const receiptUrl = data.payment?.receiptUrl || data.payment?.invoiceUrl || "";
      if (receiptUrl && receiptLink) {
        receiptLink.href = receiptUrl;
        receiptLink.hidden = false;
      }
      showToast("ปลดล็อกคอร์สเรียบร้อย");
      return;
    }

    renderResult("pending", "รอการยืนยันจาก Stripe", "หากเป็น PromptPay ระบบจะอัปเดตอัตโนมัติหลัง Stripe ยืนยันการชำระเงิน");
  } catch (error) {
    renderResult("error", "ตรวจสอบการชำระเงินไม่สำเร็จ", error.message || "กรุณาลองใหม่อีกครั้ง");
  }
}

verifyPayment();
