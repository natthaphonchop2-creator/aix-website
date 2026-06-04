(() => {
  if (document.querySelector(".site-footer")) return;

  const isHomePage = /^\/(?:index\.html)?$/.test(window.location.pathname);
  const sectionHref = (id) => (isHomePage ? `#${id}` : `/index.html#${id}`);
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="container footer-grid">
      <div class="footer-brand">
        <img class="footer-logo" src="/AiX%20logo/textblack.png" alt="AiX Club" width="232" height="92" loading="lazy" decoding="async">
        <p>แพลตฟอร์มสมาชิกเรียน AI ต่อเนื่องทั้งปี สำหรับผู้ประกอบการและทีมธุรกิจที่ต้องการใช้ AI กับงานจริง</p>
        <div class="footer-brand-note" aria-label="AiX learning system">
          <div>
            <strong>AiX Learning OS</strong>
            <span>Update, Path, Practice, Resource</span>
          </div>
        </div>
      </div>
      <div>
        <strong>เรียน AI</strong>
        <a href="${sectionHref("member-loop")}">สมาชิกได้อะไร</a>
        <a href="${sectionHref("learning-system")}">วิธีเรียนใน AiX</a>
        <a href="${sectionHref("catalog")}">คอร์สเรียน AI</a>
        <a href="${sectionHref("business-cases")}">AI สำหรับธุรกิจ</a>
      </div>
      <div>
        <strong>สมาชิก</strong>
        <a href="/dashboard">Dashboard</a>
        <a href="/payment">ชำระเงิน</a>
        <a href="/dashboard#schedule">ตารางสอนสด</a>
        <a href="/dashboard#billing">ใบเสร็จและบัญชี</a>
      </div>
      <div>
        <strong>ติดต่อ AiX Club</strong>
        <a href="tel:0987570796">098-757-0796</a>
        <a href="mailto:natthaphon.chop2@gmail.com">natthaphon.chop2@gmail.com</a>
      </div>
    </div>
  `;

  const anchor = document.querySelector(".toast") || document.body.querySelector("script");
  document.body.insertBefore(footer, anchor || null);
})();
