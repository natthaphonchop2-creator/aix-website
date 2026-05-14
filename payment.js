const API_ORIGIN = window.location.origin;
const TOKEN_KEY = "aix_member_token";
const SESSION_KEY = "aix_member_session";

const paymentMember = document.getElementById("paymentMember");
const paymentAmount = document.getElementById("paymentAmount");
const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
const paymentNotice = document.getElementById("paymentNotice");
const toast = document.getElementById("toast");
let toastTimer = null;
let stripeReady = false;

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
    throw new Error(error.error || "ไม่สามารถเชื่อมต่อระบบได้");
  }
  return response.json();
}

function selectedPaymentMethod() {
  return document.querySelector("input[name='paymentMethod']:checked")?.value || "card";
}

async function loadPayment() {
  if (!token()) {
    window.location.replace("/login");
    return;
  }
  try {
    const data = await apiRequest("/api/member/dashboard");
    localStorage.setItem(SESSION_KEY, JSON.stringify(data.member));
    if (data.member.paymentStatus === "paid") {
      window.location.replace("/dashboard");
      return;
    }
    paymentMember.textContent = `${data.member.displayName || data.member.email} • ${data.member.email}`;
    paymentAmount.textContent = `${data.payment.amount.toLocaleString("th-TH")} บาท`;

    const config = await apiRequest("/api/payments/config");
    stripeReady = Boolean(config.stripeReady);
    confirmPaymentBtn.disabled = !stripeReady;
    if (!stripeReady) {
      paymentNotice.textContent = "ยังไม่ได้ตั้งค่า STRIPE_SECRET_KEY จึงยังเปิดรับชำระเงินจริงไม่ได้";
      showToast("ต้องตั้งค่า Stripe API ก่อนใช้งานระบบชำระเงิน");
    }

    const availableMethods = new Set(config.paymentMethods || []);
    document.querySelectorAll(".payment-method").forEach((method) => {
      const input = method.querySelector("input");
      if (!input) return;
      const enabled = availableMethods.size === 0 || availableMethods.has(input.value);
      method.classList.toggle("disabled", !enabled);
      input.disabled = !enabled;
    });
    const selected = document.querySelector("input[name='paymentMethod']:checked");
    if (selected?.disabled) {
      const firstAvailable = document.querySelector("input[name='paymentMethod']:not(:disabled)");
      firstAvailable?.click();
      document.querySelectorAll(".payment-method").forEach((item) => item.classList.remove("active"));
      firstAvailable?.closest(".payment-method")?.classList.add("active");
    }
  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    window.location.replace("/login");
  }
}

document.querySelectorAll(".payment-method").forEach((method) => {
  method.addEventListener("click", () => {
    document.querySelectorAll(".payment-method").forEach((item) => item.classList.remove("active"));
    method.classList.add("active");
    method.querySelector("input")?.click();
  });
});

confirmPaymentBtn?.addEventListener("click", async () => {
  if (!stripeReady) {
    showToast("ยังไม่ได้ตั้งค่า Stripe API");
    return;
  }
  confirmPaymentBtn.disabled = true;
  confirmPaymentBtn.textContent = "กำลังเปิด Stripe...";
  try {
    const result = await apiRequest("/api/payments/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ paymentMethod: selectedPaymentMethod() })
    });
    if (!result.checkoutUrl) throw new Error("Stripe ไม่ส่ง checkout URL กลับมา");
    window.location.href = result.checkoutUrl;
  } catch (error) {
    showToast(error.message || "เปิด Stripe Checkout ไม่สำเร็จ");
    confirmPaymentBtn.disabled = false;
    confirmPaymentBtn.textContent = "ไปยัง Stripe Checkout";
  }
});

if (new URLSearchParams(window.location.search).get("cancelled")) {
  showToast("ยกเลิกการชำระเงินแล้ว ยังไม่มีการตัดเงิน");
}

loadPayment();
