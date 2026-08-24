// =============================================
// KV Projects ERP
// WhatsApp sender (Twilio WhatsApp API)
// =============================================
//
// Setup:
//   npm install twilio
//   Add to .env:
//     TWILIO_ACCOUNT_SID=xxxx
//     TWILIO_AUTH_TOKEN=xxxx
//     TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   (Twilio sandbox number,
//                                                    or your approved
//                                                    WhatsApp Business number)
//
// If these env vars aren't set, sendWhatsApp() logs and no-ops instead of
// throwing — so local/dev environments without Twilio configured keep
// working, and one missing WhatsApp send never fails the request that
// triggered it (attendance check-in, payroll, etc).

let twilioClient = null;
let warnedMissingConfig = false;

const isConfigured = () =>
  !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  );

const getClient = () => {
  if (!twilioClient) {
    // eslint-disable-next-line global-require
    const twilio = require("twilio");
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }
  return twilioClient;
};

// Normalizes a stored phone number into Twilio's "whatsapp:+<E.164>" form.
// Assumes Indian numbers (+91) when no country code is present, since
// that's what every phone field in this app currently stores. Adjust
// the default country code here if the user base changes.
const toWhatsAppAddress = (rawPhone) => {
  if (!rawPhone) return null;

  const digits = String(rawPhone).replace(/[^\d+]/g, "");
  if (!digits) return null;

  if (digits.startsWith("+")) return `whatsapp:${digits}`;
  if (digits.length === 10) return `whatsapp:+91${digits}`;
  return `whatsapp:+${digits}`;
};

// sendWhatsApp({ to, body })
//   to:   raw phone number as stored on the User/Employee/Client record
//   body: plain-text message (Twilio's default sandbox template accepts
//         free-form text; a verified production sender may need an
//         approved message template instead — see Twilio's docs if so)
const sendWhatsApp = async ({ to, body }) => {
  if (!isConfigured()) {
    if (!warnedMissingConfig) {
      console.warn(
        "[WhatsApp] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM " +
          "not set — WhatsApp sending is disabled. Notifications will still " +
          "be created in-app; only the WhatsApp message is skipped.",
      );
      warnedMissingConfig = true;
    }
    return null;
  }

  const toAddress = toWhatsAppAddress(to);
  if (!toAddress) {
    console.warn("[WhatsApp] Skipped send — no valid phone number:", to);
    return null;
  }

  try {
    const message = await getClient().messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: toAddress,
      body,
    });

    console.log("[WhatsApp] Sent:", message.sid);
    return message;
  } catch (error) {
    // Never let a WhatsApp delivery failure break the calling request
    // (e.g. attendance check-in, marking payroll as paid). Log and move on.
    console.error("[WhatsApp] Send failed:", error.message);
    return null;
  }
};

module.exports = sendWhatsApp;
