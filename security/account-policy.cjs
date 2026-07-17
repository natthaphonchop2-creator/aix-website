function assertLoginAllowed(member) {
  if (!member || member.status !== "active") {
    const error = new Error("บัญชีนี้ไม่สามารถใช้งานได้");
    error.status = 401;
    error.code = "ACCOUNT_NOT_ACTIVE";
    throw error;
  }
  return member;
}

module.exports = { assertLoginAllowed };
