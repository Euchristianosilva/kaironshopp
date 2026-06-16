// Professional A6 (10x15cm) shipping label generator.
// Renders a self-contained HTML page with Code128 barcode (SVG via JsBarcode)
// and a QR Code (data URL via qrcode). Opens in a new window for printing
// or saving as PDF through the browser's print dialog.

import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

export type LabelData = {
  orderId: string;
  orderCreatedAt: string | Date;
  trackingCode?: string | null;
  carrier?: string | null;
  shippingMethod?: string | null;
  fulfillmentStatus?: string | null;
  packageWeightGrams?: number | null;
  recipient: {
    name?: string | null;
    phone?: string | null;
    address?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  sender: {
    name?: string | null;
    phone?: string | null;
    address?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    logoUrl?: string | null;
  };
  marketplaceName?: string;
  trackingUrl?: string;
  orderUrl?: string;
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const fmtDate = (d: string | Date) => {
  try {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return ""; }
};

const fmtZip = (z?: string | null) => {
  if (!z) return "";
  const d = z.replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0,5)}-${d.slice(5)}` : z;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  processing: "Em preparação",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
  returned: "Devolvido",
};

async function buildBarcodeSvg(code: string): Promise<string> {
  if (!code) return "";
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(el as any, code, {
      format: "CODE128",
      displayValue: false,
      margin: 0,
      height: 70,
      width: 2,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return new XMLSerializer().serializeToString(el);
  } catch {
    return "";
  }
}

export async function buildLabelHtml(data: LabelData): Promise<string> {
  const r = data.recipient;
  const s = data.sender;
  const tracking = data.trackingCode || "";
  const shortOrder = data.orderId.slice(0, 8).toUpperCase();
  const marketplace = data.marketplaceName ?? "Kairon Shop";
  const trackingUrl = data.trackingUrl ?? (tracking ? `${window.location.origin}/account` : "");
  const orderUrl = data.orderUrl ?? `${window.location.origin}/account`;

  const qrPayload = JSON.stringify({
    orderId: data.orderId,
    tracking,
    orderUrl,
    trackingUrl,
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 0, width: 200, errorCorrectionLevel: "M" });
  const barcodeSvg = tracking ? await buildBarcodeSvg(tracking) : "";

  const recipientLines = [
    [r.address, r.number].filter(Boolean).join(", "),
    r.complement,
    r.neighborhood,
    `${r.city ?? ""}${r.state ? " - " + r.state : ""}`,
    `CEP: ${fmtZip(r.zip)}`,
  ].filter((l) => l && l.trim().length > 0);

  const senderLines = [
    [s.address, s.number].filter(Boolean).join(", "),
    s.complement,
    s.neighborhood,
    `${s.city ?? ""}${s.state ? " - " + s.state : ""}`,
    s.zip ? `CEP: ${fmtZip(s.zip)}` : "",
  ].filter((l) => l && l.trim().length > 0);

  const status = STATUS_LABEL[data.fulfillmentStatus ?? ""] ?? data.fulfillmentStatus ?? "—";
  const weight = data.packageWeightGrams ? `${(data.packageWeightGrams / 1000).toFixed(3).replace(".", ",")} kg` : "—";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Etiqueta ${esc(shortOrder)}</title>
<style>
  /* Kairon Shop — etiqueta logística A6 (100x150mm) */
  @page { size: 100mm 150mm; margin: 0; }
  * { box-sizing: border-box; }
  :root {
    --ks-brand: #dc2626;          /* Kairon Shop red */
    --ks-brand-dark: #7a1414;
    --ks-ink: #0a0a0a;
    --ks-line: #111;
    --ks-soft: #f5f5f5;
  }
  html, body { margin: 0; padding: 0; background: #e5e7eb; font-family: 'Helvetica Neue', Arial, sans-serif; color: var(--ks-ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .label {
    width: 100mm; height: 150mm;
    background: #fff; color: var(--ks-ink);
    display: flex; flex-direction: column;
    page-break-after: always;
    border: 1.5px solid var(--ks-line);
    overflow: hidden;
  }
  .label:last-child { page-break-after: auto; }

  /* Header band — Kairon Shop brand */
  .header {
    background: var(--ks-brand); color: #fff;
    padding: 2.5mm 3mm;
    display: flex; justify-content: space-between; align-items: center; gap: 3mm;
  }
  .brand { display: flex; align-items: center; gap: 2mm; min-width: 0; }
  .brand .logo {
    width: 10mm; height: 10mm; flex: 0 0 10mm;
    background: #fff; color: var(--ks-brand);
    border-radius: 2mm;
    display: grid; place-items: center;
    font-weight: 900; font-size: 13pt; letter-spacing: -0.5px;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08);
  }
  .brand .logo img { width: 100%; height: 100%; object-fit: contain; border-radius: 2mm; }
  .brand .wordmark { line-height: 1; }
  .brand .wordmark .n { font-size: 12pt; font-weight: 900; letter-spacing: 0.2px; }
  .brand .wordmark .t { font-size: 6pt; opacity: .9; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 0.6mm; }
  .meta { text-align: right; font-size: 7pt; line-height: 1.3; }
  .meta .order { font-size: 10pt; font-weight: 900; letter-spacing: 0.5px; }

  /* Content sections */
  .body { padding: 2.5mm 3mm 0; flex: 1; display: flex; flex-direction: column; }
  .section { padding: 1.8mm 0; border-bottom: 1px dashed #000; }
  .section:last-of-type { border-bottom: 0; }
  .title {
    display: inline-block;
    background: var(--ks-ink); color: #fff;
    font-size: 6.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
    padding: 0.8mm 2mm; margin-bottom: 1.4mm;
    border-radius: 0.8mm;
  }
  .recipient .name { font-size: 11.5pt; font-weight: 900; line-height: 1.15; margin-bottom: 0.8mm; }
  .recipient .addr { font-size: 9pt; line-height: 1.3; }
  .recipient .cep { font-size: 11pt; font-weight: 900; margin-top: 1mm; letter-spacing: 0.5px; }
  .recipient .phone { font-size: 8pt; margin-top: 0.8mm; color: #333; }
  .info { font-size: 8pt; line-height: 1.3; }
  .info b { font-weight: 800; }

  /* Logistics grid */
  .logistics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1mm; }
  .logistics .cell { border: 1px solid var(--ks-line); padding: 1mm 1.2mm; min-height: 9mm; }
  .logistics .cell .k { font-size: 5.8pt; text-transform: uppercase; color: #555; letter-spacing: 0.5px; }
  .logistics .cell .v { font-size: 8.5pt; font-weight: 800; margin-top: 0.3mm; line-height: 1.1; }

  /* Codes block */
  .codes {
    margin-top: auto;
    display: grid; grid-template-columns: 1fr 26mm; gap: 2mm;
    align-items: center;
    padding: 2mm 3mm 2.5mm;
    border-top: 2.5px solid var(--ks-brand);
    background: var(--ks-soft);
  }
  .barcode { text-align: center; min-width: 0; }
  .barcode svg { width: 100%; height: 19mm; display: block; }
  .barcode .tc {
    font-family: 'Courier New', monospace;
    font-size: 10.5pt; font-weight: 800; letter-spacing: 1.5px;
    margin-top: 0.8mm;
  }
  .qr {
    width: 26mm; height: 26mm;
    border: 1px solid var(--ks-line);
    background: #fff; padding: 1mm;
  }
  .qr img { width: 100%; height: 100%; display: block; }

  /* Print toolbar (screen only) */
  .toolbar { position: fixed; top: 8px; right: 8px; display: flex; gap: 6px; z-index: 9999; }
  .toolbar button { font: 600 12px Arial; padding: 8px 14px; border: 0; border-radius: 6px; cursor: pointer; background: var(--ks-brand); color: #fff; }
  .toolbar button.alt { background: #111; }
  @media print {
    .toolbar { display: none !important; }
    body { background: #fff; }
    .label { border: 0; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Imprimir / Salvar PDF</button>
    <button class="alt" onclick="window.close()">Fechar</button>
  </div>

  <div class="label">
    <!-- Cabeçalho com marca Kairon Shop -->
    <div class="header">
      <div class="brand">
        <div class="logo">${s.logoUrl ? `<img src="${esc(s.logoUrl)}" alt="" />` : "K"}</div>
        <div class="wordmark">
          <div class="n">${esc(marketplace)}</div>
          <div class="t">Etiqueta de envio</div>
        </div>
      </div>
      <div class="meta">
        <div class="order">#${esc(shortOrder)}</div>
        <div>Pedido: ${esc(fmtDate(data.orderCreatedAt))}</div>
        <div>Emissão: ${esc(fmtDate(new Date()))}</div>
      </div>
    </div>

    <div class="body">
      <!-- Destinatário -->
      <div class="section recipient">
        <div class="title">Destinatário</div>
        <div class="name">${esc(r.name ?? "—")}</div>
        <div class="addr">${recipientLines.map(esc).join("<br/>")}</div>
        <div class="cep">CEP: ${esc(fmtZip(r.zip))}</div>
        ${r.phone ? `<div class="phone">Tel: ${esc(r.phone)}</div>` : ""}
      </div>

      <!-- Remetente -->
      <div class="section">
        <div class="title">Remetente</div>
        <div class="info">
          <b>${esc(s.name ?? "—")}</b><br/>
          ${senderLines.map(esc).join("<br/>")}
          ${s.phone ? `<br/>Tel: ${esc(s.phone)}` : ""}
        </div>
      </div>

      <!-- Informações de envio -->
      <div class="section">
        <div class="title">Informações de envio</div>
        <div class="logistics">
          <div class="cell"><div class="k">Transportadora</div><div class="v">${esc(data.carrier ?? "—")}</div></div>
          <div class="cell"><div class="k">Serviço</div><div class="v">${esc(data.shippingMethod ?? "—")}</div></div>
          <div class="cell"><div class="k">Peso</div><div class="v">${esc(weight)}</div></div>
          <div class="cell"><div class="k">Status</div><div class="v">${esc(status)}</div></div>
        </div>
      </div>
    </div>

    <!-- Código de barras + QR Code -->
    <div class="codes">
      <div class="barcode">
        ${barcodeSvg || '<div style="font-size:9pt;color:#666;padding:6mm 0">Aguardando código de rastreio</div>'}
        ${tracking ? `<div class="tc">${esc(tracking)}</div>` : ""}
      </div>
      <div class="qr"><img src="${qrDataUrl}" alt="QR" /></div>
    </div>
  </div>
</body>
</html>`;
}

export async function openShippingLabel(data: LabelData) {
  const html = await buildLabelHtml(data);
  const w = window.open("", "_blank", "width=480,height=720");
  if (!w) {
    alert("Permita pop-ups para abrir a etiqueta.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export async function downloadLabelHtml(data: LabelData) {
  // Saves a self-contained HTML file (the browser can later open and "Save as PDF")
  const html = await buildLabelHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `etiqueta-${data.orderId.slice(0, 8)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
