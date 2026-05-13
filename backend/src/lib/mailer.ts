import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { ApiError } from "./api-error";

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

let transporter: nodemailer.Transporter | null = null;
const developmentOutbox: MailInput[] = [];

function getTransporter() {
  if (!env.HAS_SMTP_CONFIG) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      requireTLS: !env.SMTP_SECURE && env.SMTP_REQUIRE_TLS,
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      auth:
        env.SMTP_USER && env.SMTP_PASSWORD
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASSWORD
            }
          : undefined
    });
  }

  return transporter;
}

export async function verifyMailConfig() {
  const smtp = getTransporter();
  if (!smtp) {
    throw new ApiError(503, "SMTP is not configured");
  }

  await smtp.verify();
}

export async function sendMail(input: MailInput) {
  const smtp = getTransporter();

  if (!smtp) {
    if (env.NODE_ENV === "production") {
      throw new ApiError(503, "Email delivery is not configured");
    }

    developmentOutbox.push({ ...input });
    logger.info(
      {
        subject: input.subject
      },
      "Development email"
    );
    return;
  }

  await smtp.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html
  });
}

export function getDevelopmentOutbox() {
  return [...developmentOutbox];
}

export function clearDevelopmentOutbox() {
  developmentOutbox.length = 0;
}
