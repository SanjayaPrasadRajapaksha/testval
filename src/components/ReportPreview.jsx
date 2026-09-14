import { useState } from "react";
import { downloadReportPdf } from "../lib/reportPdf";

export function ReportPreview({ html, filename, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function printReport() {
    const frame = document.getElementById("evalscout-report-frame");
    frame?.contentWindow?.focus();
    frame?.contentWindow?.print();
  }

  async function downloadReport() {
    setBusy(true);
    setError("");
    try {
      const frame = document.getElementById("evalscout-report-frame");
      await downloadReportPdf(html, filename || "evaluation-report.pdf", frame?.contentDocument);
    } catch (err) {
      setError(err.message || "Could not create the PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="report-preview-backdrop" role="dialog" aria-modal="true" aria-label="Evaluation report">
      <div className="report-preview">
        <div className="report-preview__bar noprint">
          <strong>Evaluation report</strong>
          <div className="row-actions">
            <button type="button" className="btn btn-sm" onClick={printReport} disabled={busy}>
              Print
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={downloadReport} disabled={busy}>
              {busy ? "Creating PDF…" : "Download PDF"}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={busy}>
              Close
            </button>
          </div>
        </div>
        {error ? <p className="report-preview__error">{error}</p> : null}
        <iframe id="evalscout-report-frame" className="report-preview__frame" title="Evaluation report" srcDoc={html} />
      </div>
    </div>
  );
}
