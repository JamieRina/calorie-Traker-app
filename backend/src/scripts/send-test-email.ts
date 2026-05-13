import { env } from "../config/env";
import { sendMail, verifyMailConfig } from "../lib/mailer";

function getRecipient() {
  const argRecipient = process.argv.find((arg) => arg.startsWith("--to="))?.replace("--to=", "");
  return argRecipient || process.env.TEST_EMAIL_TO;
}

async function main() {
  const to = getRecipient();
  if (!to) {
    throw new Error("Provide a recipient with --to=you@example.com or TEST_EMAIL_TO=you@example.com");
  }

  await verifyMailConfig();

  await sendMail({
    to,
    subject: "BiteBalance email test",
    text: [
      "This is a BiteBalance test email.",
      "",
      `Provider: ${env.SMTP_PROVIDER}`,
      "If you received this, SMTP is configured correctly."
    ].join("\n"),
    html: [
      "<!doctype html>",
      '<html lang="en">',
      "<body>",
      "<h1>BiteBalance email test</h1>",
      "<p>If you received this, SMTP is configured correctly.</p>",
      `<p>Provider: ${env.SMTP_PROVIDER}</p>`,
      "</body>",
      "</html>"
    ].join("")
  });

  console.log(`Test email accepted for delivery to ${to}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
