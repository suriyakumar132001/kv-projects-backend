// =============================================
// KV Projects ERP
// WhatsApp sender — DISABLED (Twilio integration removed)
// =============================================
//
// WhatsApp/Twilio integration has been removed from this project.
// sendWhatsApp() is kept as a safe no-op with the same signature/
// export shape so existing callers (attendance check-in, payroll,
// leave notifications, etc.) don't break. It just logs and returns
// null instead of sending anything.
//
// If WhatsApp sending is needed again in the future, re-introduce
// the Twilio client here.

const sendWhatsApp = async ({ to, body }) => {
  console.log(
    `[WhatsApp] Sending is disabled — skipped message to ${to || "(no number)"}`,
  );
  return null;
};

module.exports = sendWhatsApp;
