const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const smtpHost = defineString("SMTP_HOST", { default: "mail.evalscout.hasthiya.com" });
const smtpPort = defineString("SMTP_PORT", { default: "465" });
const smtpUser = defineString("SMTP_USER", { default: "evalscout@evalscout.hasthiya.com" });
const smtpPass = defineString("SMTP_PASS");
const smtpFrom = defineString("SMTP_FROM", {
  default: "EvalScout <noreply@evalscout.hasthiya.com>",
});

function buildTransport() {
  const port = Number(smtpPort.value() || 465);
  return nodemailer.createTransport({
    host: smtpHost.value(),
    port,
    secure: port === 465,
    auth: {
      user: smtpUser.value(),
      pass: smtpPass.value(),
    },
  });
}

exports.sendReportEmail = onCall(
  {
    cors: true,
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }

    const { to, subject, html, text, pdfBase64, filename } = request.data || {};
    const recipient = String(to || "").trim();
    if (!recipient) {
      throw new HttpsError("invalid-argument", "Recipient email is required");
    }

    const attachments = [];
    if (pdfBase64) {
      const pdfName = String(filename || "evaluation-report.pdf").trim();
      attachments.push({
        filename: pdfName.endsWith(".pdf") ? pdfName : `${pdfName}.pdf`,
        content: Buffer.from(String(pdfBase64), "base64"),
        contentType: "application/pdf",
      });
    }

    try {
      const pass = smtpPass.value();
      if (!pass) {
        throw new HttpsError("failed-precondition", "SMTP_PASS is not configured on the function.");
      }
      const transporter = buildTransport();
      await transporter.sendMail({
        from: smtpFrom.value(),
        to: recipient,
        subject: String(subject || "EvalScout evaluation").trim(),
        text: String(text || "").trim() || undefined,
        html: String(html || "").trim() || String(text || "").trim() || "<p>EvalScout evaluation report attached.</p>",
        attachments,
      });
      return { ok: true };
    } catch (err) {
      console.error("sendReportEmail failed", err);
      throw new HttpsError(
        "internal",
        err?.message || "Could not send the evaluation email. Check SMTP settings on Firebase Functions.",
      );
    }
  },
);
