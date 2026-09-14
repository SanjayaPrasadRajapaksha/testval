/**
 * Evaluation reports matching the iOS EvaluationPDFView:
 * lime overall score, info tiles, skill bars 0–100, generated PDF attachment.
 */

import { latestEvaluation } from "./scores";

const LIME = "#A3E633";
const INK = "#000000";
const MUTED = "#64748b";
const TILE_BG = "#f6f6f6";
const TILE_BORDER = "rgba(0,0,0,0.22)";
const PAGE_WIDTH = 612;
const FONT = 'Helvetica, Arial, sans-serif';

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function display(value, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatScore(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : "—";
}

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function slug(value, fallback = "report") {
  return (
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

function skillsForPlayer(skills, player) {
  return (skills || []).filter((skill) => skill.scope !== "player" || skill.playerId === player?.id);
}

function overallFor(player, skills) {
  const latest = latestEvaluation(player);
  const applicable = skillsForPlayer(skills, player);
  const scores = latest?.scores || {};
  if (!applicable.length) return Number(latest?.overallScore) || 0;
  return applicable.reduce((sum, skill) => sum + (Number(scores[skill.id]) || 0), 0) / applicable.length;
}

function playerPosition(player, sport) {
  return player?.sportPositions?.[sport?.id] || player?.position || "";
}

function formatEvalDate(value) {
  if (!value) return "";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function seasonLabel(latest) {
  return `${latest?.seasonName || ""} ${latest?.seasonYear || ""}`.trim();
}

function infoTile(label, value) {
  return `
    <td style="width:25%;padding:0 6px 8px 0;vertical-align:top;">
      <div style="padding:12px;background:${TILE_BG};border:1px solid ${TILE_BORDER};border-radius:14px;min-height:52px;">
        <div style="font-size:8px;font-weight:900;letter-spacing:1.1px;color:${MUTED};text-transform:uppercase;">${esc(label)}</div>
        <div style="font-size:13px;font-weight:900;color:${INK};line-height:1.25;margin-top:4px;">${esc(display(value))}</div>
      </div>
    </td>`;
}

function tileRow(cells) {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>${cells.join("")}</tr></table>`;
}

function scoreBar(score) {
  const pct = clampScore(score);
  return `
    <div style="margin-top:7px;line-height:0;">
      <svg width="100%" height="8" viewBox="0 0 100 8" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="0" y="0" width="100" height="8" rx="4" fill="#d4d4d4" />
        <rect x="0" y="0" width="${pct}" height="8" rx="4" fill="${LIME}" />
      </svg>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:4px;">
      <tr>
        <td style="font-size:7px;font-weight:900;letter-spacing:0.8px;color:${MUTED};">0</td>
        <td align="center" style="font-size:7px;font-weight:900;letter-spacing:0.8px;color:${MUTED};">25</td>
        <td align="center" style="font-size:7px;font-weight:900;letter-spacing:0.8px;color:${MUTED};">50</td>
        <td align="center" style="font-size:7px;font-weight:900;letter-spacing:0.8px;color:${MUTED};">75</td>
        <td align="right" style="font-size:7px;font-weight:900;letter-spacing:0.8px;color:${MUTED};">100</td>
      </tr>
    </table>`;
}

function skillCard(skill, score, note) {
  const noteHtml = note
    ? `<div style="margin-top:8px;padding:9px;background:rgba(0,0,0,0.04);border:1px solid ${TILE_BORDER};border-radius:10px;font-size:10px;color:${MUTED};">${esc(note)}</div>`
    : "";
  return `
    <div class="skill-card" style="margin:0 0 10px;padding:12px;background:rgba(0,0,0,0.035);border:1px solid ${TILE_BORDER};border-radius:14px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="vertical-align:top;">
            <div style="font-size:13px;font-weight:900;color:${INK};">${esc(skill.label)}</div>
            <div style="font-size:9px;font-weight:500;color:${MUTED};margin-top:2px;">${esc(skill.hint || "")}</div>
          </td>
          <td align="right" style="vertical-align:top;width:72px;">
            <span style="display:inline-block;padding:5px 10px;background:${LIME};border-radius:8px;font-size:15px;font-weight:900;color:${INK};">${esc(formatScore(score))}</span>
          </td>
        </tr>
      </table>
      ${scoreBar(score)}
      ${noteHtml}
    </div>`;
}

function coachBlock(profile, logoSrc) {
  if (!profile) return "";
  const hasCoach =
    profile.organizationName ||
    profile.teamName ||
    profile.coachName ||
    profile.coachEmail ||
    profile.email ||
    profile.logoUrl ||
    logoSrc;
  if (!hasCoach) return "";

  const logo = logoSrc || profile.logoUrl;
  const logoCell = logo
    ? `<td width="78" valign="top" style="padding-right:12px;">
        <div style="width:70px;height:70px;background:#fff;border:1px solid ${TILE_BORDER};border-radius:14px;text-align:center;overflow:hidden;">
          <img src="${esc(logo)}" width="54" height="54" alt="" style="margin-top:8px;width:54px;height:54px;object-fit:cover;border-radius:10px;" onerror="this.style.display='none';this.parentNode.style.display='none';" />
        </div>
      </td>`
    : "";

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:10px;">
      <tr>
        ${logoCell}
        <td valign="top">
          ${tileRow([
            infoTile("Organization", profile.organizationName),
            infoTile("Team", profile.teamName),
            infoTile("Identifier", profile.teamIdentifier),
          ])}
          ${tileRow([
            infoTile("Coach", profile.coachName),
            infoTile("Role", profile.role),
            infoTile("Email", profile.coachEmail || profile.email),
          ])}
          ${tileRow([
            infoTile("Profile Sport", profile.sport),
            infoTile("Phone", profile.phoneNumber),
            `<td style="width:25%;padding:0 6px 8px 0;"></td>`,
          ])}
        </td>
      </tr>
    </table>`;
}

function playerPageHtml({ sport, player, skills, profile, reportLanguage, teamMedian, logoSrc }) {
  const latest = latestEvaluation(player);
  const applicable = skillsForPlayer(skills, player);
  const scores = latest?.scores || {};
  const notes = latest?.skillNotes || {};
  const overall = overallFor(player, applicable);
  const dateLabel = formatEvalDate(latest?.date || latest?.updatedAt || latest?.createdAt);
  const jersey = player?.jerseyNumber ? `#${player.jerseyNumber}` : "";
  const skillCards = latest
    ? applicable.map((skill) => skillCard(skill, scores[skill.id], notes[skill.id])).join("")
    : `<div style="padding:14px;background:${TILE_BG};border:1px solid ${TILE_BORDER};border-radius:14px;color:${MUTED};">No saved evaluation for this sport yet.</div>`;

  const notesBlock = latest?.notes
    ? `<div style="margin-top:8px;padding:14px;background:rgba(163,230,51,0.14);border:1px solid ${TILE_BORDER};border-radius:16px;">
        <div style="font-size:18px;font-weight:900;color:${INK};margin-bottom:8px;">Overall Notes</div>
        <div style="font-size:12px;line-height:1.45;color:${MUTED};">${esc(latest.notes)}</div>
      </div>`
    : "";

  const translated =
    reportLanguage && String(reportLanguage).toLowerCase() !== "english"
      ? `<div style="text-align:center;font-size:9px;font-weight:600;color:${MUTED};margin-top:10px;">Translated report. Scores and original evaluation data unchanged.</div>`
      : "";

  return `
    <div class="eval-page" style="width:${PAGE_WIDTH}px;max-width:100%;padding:28px;background:#ffffff;color:${INK};box-sizing:border-box;font-family:${FONT};">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td width="60" valign="top">
            <div style="width:60px;height:60px;background:${LIME};border-radius:16px;text-align:center;line-height:60px;font-size:28px;">${esc(sport?.icon || "●")}</div>
          </td>
          <td valign="top" style="padding-left:16px;">
            <div style="font-size:28px;font-weight:900;line-height:1.1;color:${INK};">${esc(sport?.brand || "EVALSCOUT")} Evaluation</div>
            <div style="font-size:9px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;color:${MUTED};margin-top:5px;">${esc(sport?.tagline || "")}</div>
            <div style="font-size:12px;font-weight:600;color:${MUTED};margin-top:4px;">${esc(dateLabel)}</div>
          </td>
          <td align="right" valign="top" width="110">
            <div style="font-size:42px;font-weight:900;line-height:1;color:${LIME};">${esc(formatScore(overall))}</div>
            <div style="font-size:10px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:${MUTED};margin-top:2px;">Overall</div>
          </td>
        </tr>
      </table>
      <div style="border-top:1px solid ${TILE_BORDER};margin:18px 0;"></div>
      ${coachBlock(profile, logoSrc)}
      ${tileRow([
        infoTile("Player", player?.name),
        infoTile("Jersey", jersey),
        infoTile("Position", playerPosition(player, sport)),
        infoTile("Age", player?.age),
      ])}
      ${tileRow([
        infoTile("Sport", sport?.name),
        infoTile("Season", seasonLabel(latest)),
        infoTile("Type", latest?.evaluationType),
        infoTile("Team Median", teamMedian == null ? "N/A" : formatScore(teamMedian)),
      ])}
      <div style="font-size:18px;font-weight:900;margin:8px 0 10px;color:${INK};">Skill Scores</div>
      ${skillCards}
      ${notesBlock}
      ${translated}
      <div style="text-align:center;font-size:9px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;color:${MUTED};padding-top:12px;">Generated by EVALSCOUT</div>
    </div>`;
}

function shell({ title, bodyHtml }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0; padding: 0; background: #e8e8e8; color: ${INK}; }
    body { font-family: ${FONT}; }
    .eval-sheet { width: ${PAGE_WIDTH}px; max-width: 100%; margin: 16px auto; background: #fff; }
    .eval-page { page-break-after: always; }
    .eval-page:last-child { page-break-after: auto; }
    img { display: block; }
    @media print {
      html, body { background: #fff; }
      .eval-sheet { margin: 0 auto; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="eval-sheet">${bodyHtml}</div>
</body>
</html>`;
}

function emailShell({ title, intro, bodyHtml }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#ececec;font-family:${FONT};">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ececec;">
    <tr>
      <td align="center" style="padding:16px 8px;">
        <table width="${PAGE_WIDTH}" cellpadding="0" cellspacing="0" role="presentation" style="width:${PAGE_WIDTH}px;max-width:100%;background:#ffffff;">
          <tr>
            <td style="padding:16px 28px 0;font-size:13px;color:${MUTED};">${esc(intro)}</td>
          </tr>
          <tr>
            <td>${bodyHtml}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function playerPagesHtml(args) {
  return playerPageHtml(args);
}

function rosterPagesHtml({ sport, players, skills, profile, reportLanguage, teamMedian, logoSrc }) {
  const evaluated = (players || []).filter((player) => player.evaluations?.length);
  return evaluated
    .map((player) => playerPageHtml({ sport, player, skills, profile, reportLanguage, teamMedian, logoSrc }))
    .join("");
}

function playerReportHtml(args) {
  return shell({
    title: `${args.sport?.brand || "EVALSCOUT"} — ${args.player?.name || "Player"}`,
    bodyHtml: playerPagesHtml(args),
  });
}

function rosterReportHtml(args) {
  return shell({
    title: `${args.sport?.brand || "EVALSCOUT"} — All evaluations`,
    bodyHtml: rosterPagesHtml(args),
  });
}

function playerEmailHtml(args) {
  return emailShell({
    title: `${args.sport?.brand || "EVALSCOUT"} Evaluation — ${args.player?.name || "Player"}`,
    intro: "Designed evaluation report is below. The matching PDF is attached for printing and sharing.",
    bodyHtml: playerPagesHtml(args),
  });
}

function rosterEmailHtml(args) {
  return emailShell({
    title: `${args.sport?.brand || "EVALSCOUT"} — All evaluations`,
    intro: "Full designed reports are below. The matching multi-page PDF is attached.",
    bodyHtml: rosterPagesHtml(args),
  });
}

export function playerReportFile(args) {
  return {
    html: playerReportHtml(args),
    emailHtml: playerEmailHtml(args),
    filename: `${slug(args.player?.name, "player")}-${slug(args.sport?.id || args.sport?.name, "eval")}-evaluation.pdf`,
    kind: "player",
  };
}

export function rosterReportFile(args) {
  return {
    html: rosterReportHtml(args),
    emailHtml: rosterEmailHtml(args),
    filename: `${slug(args.sport?.id || args.sport?.name, "evalscout")}-all-evaluations.pdf`,
    kind: "roster",
  };
}

export function openPlayerReportPdf(args) {
  printHtml(playerReportHtml(args));
}

export function openRosterReportPdf(args) {
  printHtml(rosterReportHtml(args));
}

export function downloadReportHtml(html, filename) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = String(filename || "evaluation-report.html").replace(/\.pdf$/i, ".html");
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function printHtml(html) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;inset:0;width:1px;height:1px;border:0;opacity:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    throw new Error("Could not open the PDF printer. Use Download instead.");
  }
  doc.open();
  doc.write(html);
  doc.close();
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => iframe.remove(), 2500);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("Could not encode the PDF."));
    reader.readAsDataURL(blob);
  });
}

function waitForPages(doc, iframe) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (doc.querySelector(".eval-page")) {
        resolve(iframe);
        return;
      }
      if (Date.now() - started > 8000) {
        reject(new Error("No evaluation pages to export."));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function renderReportFrame(html) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `position:fixed;left:-12000px;top:0;width:${PAGE_WIDTH}px;height:1400px;border:0;opacity:0;pointer-events:none;`;
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return Promise.reject(new Error("Could not render the evaluation report."));
  }
  doc.open();
  doc.write(html);
  doc.close();
  return waitForPages(doc, iframe).catch((error) => {
    iframe.remove();
    throw error;
  });
}

async function urlToDataUrl(url) {
  if (!url || String(url).startsWith("data:")) return url || "";
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error("logo fetch failed");
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read logo."));
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

export async function embedProfileLogo(profile) {
  if (!profile?.logoUrl) return profile;
  const logoSrc = await urlToDataUrl(profile.logoUrl);
  return logoSrc ? { ...profile, logoUrl: logoSrc } : { ...profile, logoUrl: null };
}

async function capturePages(doc, { ignoreImages = false } = {}) {
  const { default: html2canvas } = await import("html2canvas");
  const pages = [...doc.querySelectorAll(".eval-page")];
  if (!pages.length) throw new Error("No evaluation pages to export.");

  const images = [];
  for (const page of pages) {
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      width: PAGE_WIDTH,
      logging: false,
      imageTimeout: 4000,
      ignoreElements: ignoreImages ? (el) => el.tagName === "IMG" : undefined,
    });
    const height = Math.max(792, (canvas.height * PAGE_WIDTH) / canvas.width);
    images.push({
      data: canvas.toDataURL("image/jpeg", 0.84),
      height,
    });
  }
  return images;
}

async function pdfFromDocument(doc) {
  const { jsPDF } = await import("jspdf");
  if (!doc?.body) throw new Error("Could not render the evaluation report.");
  await Promise.all(
    [...doc.images].map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          }),
    ),
  );
  let images;
  try {
    images = await capturePages(doc);
  } catch (first) {
    if (first?.message === "No evaluation pages to export.") throw first;
    images = await capturePages(doc, { ignoreImages: true });
  }
  const pdf = new jsPDF({ unit: "pt", format: [PAGE_WIDTH, images[0].height], compress: true });
  images.forEach((image, index) => {
    if (index > 0) pdf.addPage([PAGE_WIDTH, image.height], "p");
    pdf.addImage(image.data, "JPEG", 0, 0, PAGE_WIDTH, image.height);
  });
  return pdf.output("blob");
}

export async function htmlToPdfBlob(html, existingDoc) {
  if (existingDoc?.querySelector?.(".eval-page")) {
    return pdfFromDocument(existingDoc);
  }
  const iframe = await renderReportFrame(html);
  try {
    return await pdfFromDocument(iframe.contentDocument);
  } finally {
    iframe.remove();
  }
}

export async function downloadReportPdf(html, filename, existingDoc) {
  const blob = await htmlToPdfBlob(html, existingDoc);
  downloadBlob(blob, filename || "evaluation-report.pdf");
  return blob;
}

export function buildPlayerEmailBody({ sport, player, skills, profile }) {
  const latest = latestEvaluation(player);
  const applicable = skillsForPlayer(skills, player);
  const scores = latest?.scores || {};
  const notes = latest?.skillNotes || {};
  const coachEmail = profile?.coachEmail || profile?.email || "";
  const lines = [
    `${sport?.brand || "EvalScout"} EVALUATION REPORT`,
    `Sport: ${sport?.name || ""}`,
    profile?.coachName ? `Coach: ${profile.coachName}` : "",
    coachEmail ? `Coach email: ${coachEmail}` : "",
    profile?.teamName ? `Team: ${profile.teamName}` : "",
    "",
    `Player: ${player?.name || ""}`,
    `Position: ${playerPosition(player, sport) || "N/A"}`,
    player?.age ? `Age: ${player.age}` : "",
    `Overall: ${formatScore(overallFor(player, applicable))} / 100`,
    latest ? `Type: ${latest.evaluationType || "Evaluation"}` : "",
    "",
    "SKILLS",
  ];
  if (latest) {
    for (const skill of applicable) {
      lines.push(`${skill.label}: ${formatScore(scores[skill.id])}`);
      if (notes[skill.id]) lines.push(`  Notes: ${notes[skill.id]}`);
    }
    if (latest.notes) lines.push("", `Evaluation notes: ${latest.notes}`);
  } else {
    lines.push("No saved evaluation for this sport yet.");
  }
  return lines.filter((line) => line !== "").join("\n");
}

export function buildRosterEmailBody({ sport, players, skills, profile }) {
  const evaluated = (players || []).filter((p) => p.evaluations?.length);
  const coachEmail = profile?.coachEmail || profile?.email || "";
  const header = [
    `${sport?.brand || "EvalScout"} — ALL EVALUATIONS`,
    `Sport: ${sport?.name || ""}`,
    profile?.coachName ? `Coach: ${profile.coachName}` : "",
    coachEmail ? `Coach email: ${coachEmail}` : "",
    `Reports: ${evaluated.length}`,
    "",
  ].filter(Boolean);
  if (!evaluated.length) return `${header.join("\n")}\nNo saved evaluations to share.`;
  return header
    .concat(evaluated.map((player) => buildPlayerEmailBody({ sport, player, skills, profile })))
    .join("\n\n--------------------\n\n");
}

export async function shareEvaluationReport({ to, subject, html, emailHtml, text, filename }) {
  const recipient = String(to || "").trim();
  if (!recipient) throw new Error("Add a coach email on your profile to share reports.");

  const pdfBlob = await htmlToPdfBlob(html);
  const pdfBase64 = await blobToBase64(pdfBlob);
  const pdfName = filename?.endsWith(".pdf") ? filename : `${slug(filename, "evaluation")}.pdf`;

  const { api } = await import("./api");
  try {
    await api.sendReportEmail({
      to: recipient,
      subject: subject || "EvalScout evaluation",
      html: emailHtml || html,
      text: text || "",
      pdfBase64,
      filename: pdfName,
    });
    return { ok: true, method: "email" };
  } catch (error) {
    downloadBlob(pdfBlob, pdfName);
    const file = new File([pdfBlob], pdfName, { type: "application/pdf" });
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: subject || "EvalScout evaluation",
          text: text || "Evaluation report PDF",
        });
        return { ok: true, method: "share" };
      } catch (shareError) {
        if (shareError?.name === "AbortError") {
          throw new Error("Share cancelled. The PDF was downloaded — attach it to your email.");
        }
      }
    }

    const mailBody = [
      text || "EvalScout evaluation report attached.",
      "",
      "The PDF was downloaded to your device. Attach it before sending.",
    ].join("\n");
    emailReportText({
      to: recipient,
      subject: subject || "EvalScout evaluation",
      body: mailBody,
    });

    return {
      ok: true,
      method: "mailto",
      notice:
        error?.message
          ? `Automatic email failed (${error.message}). PDF downloaded and mail app opened — attach the file and send.`
          : "PDF downloaded and mail app opened — attach the file and send.",
    };
  }
}

/** User-facing message after shareEvaluationReport completes. */
export function shareResultNotice(result, to) {
  if (result?.method === "share") {
    return "PDF downloaded and opened in your share sheet.";
  }
  if (result?.method === "mailto") {
    return result.notice || "PDF downloaded and mail app opened — attach the file and send.";
  }
  return `Designed report emailed to ${to} with the PDF attached.`;
}

/** @deprecated mailto cannot send designed HTML or a PDF attachment. */
export function emailReportText({ to, subject, body }) {
  const recipient = String(to || "").trim();
  const full = String(body || "");
  const truncated =
    full.length > 1800
      ? `${full.slice(0, 1800)}\n\n[Designed PDF could not be attached by mailto. Use the Email button to send the full report.]`
      : full;
  const params = new URLSearchParams();
  params.set("subject", subject || "EvalScout evaluation");
  params.set("body", truncated);
  window.location.href = `mailto:${recipient}?${params.toString().replace(/\+/g, "%20")}`;
}
