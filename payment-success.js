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
  const sessionId = new URLSearchParams(window.location.search).get("session_id");
  if (!sessionId) {
    renderResult("error", "ไม่พบ Session ID", "กรุณากลับไปเริ่มชำระเงินใหม่อีกครั้ง");
    return;
  }

  try {
    await bootstrapMemberSession();
    const data = await apiRequest(`/api/payments/stripe/session/${encodeURIComponent(sessionId)}`);

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
    if (error.status === 401) {
      memberApi.clear();
      window.location.replace("/index.html?auth=login");
      return;
    }
    renderResult("error", "ตรวจสอบการชำระเงินไม่สำเร็จ", error.message || "กรุณาลองใหม่อีกครั้ง");
  }
}

verifyPayment();
