// One-off script: creates a single generic WhatsApp Content Template
// ("{{1}}" body, one variable) via the Twilio Content API directly —
// bypasses the Console UI (which is gating Templates behind an
// upgrade prompt on this trial account). The API itself works fine
// on trial accounts.
//
// Usage:
//   node scripts/createWhatsAppTemplate.js
//
// Requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN already set in .env.
// Prints the new template's SID (starts with "HX") — copy that into
// .env as TWILIO_CONTENT_SID.

require("dotenv").config();

const run = async () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error(
      "Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in .env — add those first.",
    );
    process.exit(1);
  }

  const auth = Buffer.from(
    `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`,
  ).toString("base64");

  const res = await fetch("https://content.twilio.com/v1/Content", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      friendly_name: `kv_alert_${Date.now()}`,
      language: "en",
      variables: { 1: "sample" },
      types: {
        "twilio/text": {
          body: "{{1}}",
        },
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Failed to create template:", data);
    process.exit(1);
  }

  console.log("Template created successfully.");
  console.log("Content SID:", data.sid);
  console.log("\nAdd this to your .env:");
  console.log(`TWILIO_CONTENT_SID=${data.sid}`);
};

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
