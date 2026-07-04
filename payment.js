const API_ORIGIN = window.location.origin;
const TOKEN_KEY = "aix_member_token";
const SESSION_KEY = "aix_member_session";

const paymentMember = document.getElementById("paymentMember");
const paymentAmount = document.getElementById("paymentAmount");
const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
const paymentNotice = document.getElementById("paymentNotice");
const paymentPhoneVerify = document.getElementById("paymentPhoneVerify");
const paymentPhoneInput = document.getElementById("paymentPhone");
const paymentOtpCodeInput = document.getElementById("paymentOtpCode");
const paymentOtpStatus = document.getElementById("paymentOtpStatus");
const paymentSendOtpBtn = document.getElementById("paymentSendOtpBtn");
const paymentVerifyOtpBtn = document.getElementById("paymentVerifyOtpBtn");
const toast = document.getElementById("toast");
let toastTimer = null;
let stripeReady = false;
let phoneVerified = false;
let currentMember = null;

const PHONE_RE = /^0\d{9}$/;

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

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function setPaymentOtpStatus(message, type = "neutral") {
  if (!paymentOtpStatus || !paymentPhoneVerify) return;
  paymentOtpStatus.textContent = message;
  paymentPhoneVerify.classList.toggle("verified", type === "verified");
  paymentPhoneVerify.classList.toggle("error", type === "error");
}

function updatePaymentActionState() {
  if (!confirmPaymentBtn) return;
  if (!phoneVerified) {
    confirmPaymentBtn.disabled = true;
    confirmPaymentBtn.textContent = "ยืนยันเบอร์ก่อนชำระเงิน";
    paymentNotice.textContent = "ยืนยันเบอร์โทรด้วย SMS ก่อน ระบบจึงจะเปิดขั้นตอน Stripe Checkout";
    return;
  }
  confirmPaymentBtn.disabled = !stripeReady;
  confirmPaymentBtn.textContent = "ไปยัง Stripe Checkout";
}

function setPhoneVerificationVisible(visible) {
  if (!paymentPhoneVerify) return;
  paymentPhoneVerify.hidden = !visible;
  document.querySelector(".payment-method-list")?.classList.toggle("disabled", visible);
}

function setOtpBusy(sending = false, verifying = false) {
  if (paymentSendOtpBtn) paymentSendOtpBtn.disabled = sending || verifying;
  if (paymentVerifyOtpBtn) paymentVerifyOtpBtn.disabled = sending || verifying;
}

async function loadPayment() {
  if (!token()) {
    window.location.replace("/index.html?auth=login");
    return;
  }
  try {
    const data = await apiRequest("/api/member/dashboard");
    localStorage.setItem(SESSION_KEY, JSON.stringify(data.member));
    if (data.member.paymentStatus === "paid") {
      window.location.replace("/dashboard");
      return;
    }
    currentMember = data.member;
    phoneVerified = Boolean(data.member.phoneVerified);
    paymentMember.textContent = `${data.member.displayName || data.member.email} • ${data.member.email}`;
    paymentAmount.textContent = `${data.payment.amount.toLocaleString("th-TH")} บาท`;
    if (paymentPhoneInput) paymentPhoneInput.value = data.member.phone || "";
    setPhoneVerificationVisible(!phoneVerified);

    const config = await apiRequest("/api/payments/config");
    stripeReady = Boolean(config.stripeReady);
    phoneVerified = Boolean(config.phoneVerified);
    setPhoneVerificationVisible(!phoneVerified);
    updatePaymentActionState();
    if (!stripeReady) {
      paymentNotice.textContent = "ยังไม่ได้ตั้งค่า STRIPE_SECRET_KEY จึงยังเปิดรับชำระเงินจริงไม่ได้";
      showToast("ต้องตั้งค่า Stripe API ก่อนใช้งานระบบชำระเงิน");
    } else if (config.expired) {
      paymentNotice.textContent = "สมาชิกหมดอายุแล้ว ต่ออายุเพื่อเข้าเรียนต่อได้ทันที";
    } else if (phoneVerified) {
      paymentNotice.textContent = "ระบบจะพาไปหน้า Stripe Checkout เพื่อชำระเงินอย่างปลอดภัย";
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
    window.location.replace("/index.html?auth=login");
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
  if (!phoneVerified) {
    setPhoneVerificationVisible(true);
    setPaymentOtpStatus("ยืนยันเบอร์โทรก่อนชำระเงิน", "error");
    showToast("กรุณายืนยันเบอร์โทรก่อนชำระเงิน");
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
    updatePaymentActionState();
  }
});

paymentPhoneInput?.addEventListener("input", () => {
  paymentPhoneInput.value = normalizePhone(paymentPhoneInput.value);
  setPaymentOtpStatus("กรอกเบอร์โทรแล้วกดส่งรหัส");
});

paymentOtpCodeInput?.addEventListener("input", () => {
  paymentOtpCodeInput.value = normalizePhone(paymentOtpCodeInput.value).slice(0, 6);
});

paymentSendOtpBtn?.addEventListener("click", async () => {
  const phone = normalizePhone(paymentPhoneInput?.value);
  if (!PHONE_RE.test(phone)) {
    setPaymentOtpStatus("กรุณากรอกเบอร์ 10 หลักที่ขึ้นต้นด้วย 0", "error");
    paymentPhoneInput?.focus();
    return;
  }
  try {
    setOtpBusy(true, false);
    const result = await apiRequest("/api/member/phone/otp/send", {
      method: "POST",
      body: JSON.stringify({ phone })
    });
    setPaymentOtpStatus(result.devCode
      ? `โหมดทดสอบ: ใช้รหัส ${result.devCode}`
      : "ส่ง SMS แล้ว กรุณาตรวจข้อความในมือถือ");
    if (paymentOtpCodeInput) paymentOtpCodeInput.value = "";
    paymentOtpCodeInput?.focus();
  } catch (error) {
    setPaymentOtpStatus(error.message || "ส่งรหัสไม่สำเร็จ", "error");
  } finally {
    setOtpBusy(false, false);
  }
});

paymentVerifyOtpBtn?.addEventListener("click", async () => {
  const phone = normalizePhone(paymentPhoneInput?.value);
  const code = normalizePhone(paymentOtpCodeInput?.value).slice(0, 6);
  if (!PHONE_RE.test(phone)) {
    setPaymentOtpStatus("กรุณากรอกเบอร์ 10 หลักที่ขึ้นต้นด้วย 0", "error");
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    setPaymentOtpStatus("กรอกรหัส SMS 6 หลัก", "error");
    return;
  }
  try {
    setOtpBusy(false, true);
    const result = await apiRequest("/api/member/phone/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code })
    });
    if (result.member) {
      currentMember = result.member;
      localStorage.setItem(SESSION_KEY, JSON.stringify(result.member));
    }
    phoneVerified = true;
    setPaymentOtpStatus("ยืนยันเบอร์โทรเรียบร้อย", "verified");
    setPhoneVerificationVisible(false);
    paymentNotice.textContent = "ยืนยันเบอร์แล้ว เลือกวิธีชำระเงินเพื่อไป Stripe Checkout";
    updatePaymentActionState();
    showToast("ยืนยันเบอร์โทรเรียบร้อย");
  } catch (error) {
    setPaymentOtpStatus(error.message || "ยืนยันรหัสไม่สำเร็จ", "error");
  } finally {
    setOtpBusy(false, false);
  }
});

if (new URLSearchParams(window.location.search).get("cancelled")) {
  showToast("ยกเลิกการชำระเงินแล้ว ยังไม่มีการตัดเงิน");
}

loadPayment();
