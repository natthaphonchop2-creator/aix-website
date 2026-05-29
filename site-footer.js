(() => {
  if (document.querySelector(".site-footer")) return;

  const isHomePage = /^\/(?:index\.html)?$/.test(window.location.pathname);
  const sectionHref = (id) => (isHomePage ? `#${id}` : `/index.html#${id}`);
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="container footer-grid">
      <div class="footer-brand">
        <img class="footer-logo" src="/AiX%20logo/textblack.png" alt="AiX Club">
        <p>แพลตฟอร์มคอร์สเรียน AI ภาษาไทย สำหรับผู้ประกอบการและทีมธุรกิจที่ต้องการใช้ AI ทำงานจริง</p>
        <div class="footer-mascot" aria-label="AiX Assistant">
          <img src="/assets/generated/aix-mascot-celebrate.png" alt="">
          <div>
            <strong>AiX Assistant</strong>
            <span>ผู้ช่วยเรียน AI ของสมาชิก</span>
          </div>
        </div>
      </div>
      <div>
        <strong>เรียน AI</strong>
        <a href="${sectionHref("paths")}">เส้นทางเรียน AI</a>
        <a href="${sectionHref("catalog")}">คอร์สเรียน AI</a>
        <a href="${sectionHref("tools")}">AI Tools & Templates</a>
        <a href="${sectionHref("business")}">AI สำหรับธุรกิจ</a>
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
