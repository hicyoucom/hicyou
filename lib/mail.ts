import { logger } from "@/lib/logger";
import { getMailFrom } from "@/lib/mail-config";
import { Resend } from "resend";

// Initialize keys lazily to avoid build errors
// const resend = new Resend(process.env.MAIL_KEY);

interface SendEmailProps {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export const sendEmail = async ({ to, subject, react }: SendEmailProps) => {
  if (!process.env.MAIL_KEY) {
    logger.warn("MAIL_KEY is not set, skipping email sending");
    return { success: false, error: "Missing MAIL_KEY" };
  }

  const resend = new Resend(process.env.MAIL_KEY);

  try {
    // The Resend SDK returns { data, error } and only THROWS on transport
    // errors — API-level failures come back in `error`, so check it.
    const { data, error } = await resend.emails.send({
      from: getMailFrom(),
      to,
      subject,
      react,
    });

    if (error || !data?.id) {
      logger.error("Failed to send email", error ?? "no message id returned");
      return { success: false, error: error ?? "No message id returned" };
    }

    logger.info("Email sent successfully");
    return { success: true, id: data.id };
  } catch (error) {
    logger.error("Failed to send email", error);
    return { success: false, error };
  }
};
