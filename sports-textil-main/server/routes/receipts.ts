import { Router } from "express";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { storage } from "../storage";

const router = Router();

const BRAND_COLORS = {
  primary: "#032c6b",
  accent: "#e8b73d",
  text: "#333333",
  textLight: "#666666",
  border: "#e2e8f0",
  success: "#22c55e",
};

function formatDate(dateString: string | Date | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(value: number | string) {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return `R$ ${numValue.toFixed(2).replace(".", ",")}`;
}

function formatCPF(cpf: string | null): string {
  if (!cpf) return "N/A";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
}

router.get("/:registrationId", async (req, res) => {
  try {
    const athleteId = (req.session as any)?.athleteId;
    if (!athleteId) {
      return res.status(401).json({ success: false, error: "Não autenticado" });
    }

    const { registrationId } = req.params;
    const registration = await storage.getRegistration(registrationId);

    if (!registration) {
      return res
        .status(404)
        .json({ success: false, error: "Inscrição não encontrada" });
    }

    if (registration.athleteId !== athleteId) {
      return res
        .status(403)
        .json({ success: false, error: "Acesso não autorizado" });
    }

    if (registration.status !== "confirmada") {
      return res.status(400).json({
        success: false,
        error: "Comprovante disponível apenas para inscrições confirmadas",
      });
    }

    const [event, modality, athlete, order, batch] = await Promise.all([
      storage.getEvent(registration.eventId),
      storage.getModality(registration.modalityId),
      storage.getAthlete(registration.athleteId),
      registration.orderId ? storage.getOrder(registration.orderId) : null,
      registration.batchId ? storage.getBatch(registration.batchId) : null,
    ]);

    if (!event || !modality || !athlete) {
      return res
        .status(404)
        .json({ success: false, error: "Dados não encontrados" });
    }

    const qrData = JSON.stringify({
      nome: registration.nomeCompleto || athlete.nome,
      cpf: registration.cpf || athlete.cpf || "",
      n_inscricao: registration.numeroInscricao,
      n_pedido: order?.numeroPedido || "",
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 120,
      margin: 1,
      color: {
        dark: BRAND_COLORS.primary,
        light: "#ffffff",
      },
    });

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `Comprovante de Inscrição - ${event.nome}`,
        Author: "KitRunner - Inscrições",
        Subject: `Inscrição #${registration.numeroInscricao}`,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=comprovante-inscricao-${registration.numeroInscricao}.pdf`,
    );

    doc.pipe(res);

    doc.rect(0, 0, 595, 100).fill(BRAND_COLORS.primary);

    doc.save();
    doc
      .fontSize(32)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("KITRUNNER", 50, 30);

    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor(BRAND_COLORS.accent)
      .text("Comprovante de Inscrição", 50, 65);
    doc.restore();

    doc
      .rect(50, 110, 495, 50)
      .fill(BRAND_COLORS.accent);

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(BRAND_COLORS.primary)
      .text("INSCRIÇÃO CONFIRMADA", 60, 120);

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor(BRAND_COLORS.primary)
      .text(`#${registration.numeroInscricao}`, 60, 135);

    const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");
    doc.image(qrCodeBuffer, 420, 115, { width: 40, height: 40 });

    doc.y = 180;

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor(BRAND_COLORS.primary)
      .text(event.nome, 50, doc.y);

    doc.moveDown(0.3);
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor(BRAND_COLORS.textLight)
      .text(`${formatDate(event.dataEvento)} | ${event.cidade} - ${event.estado}`, 50);

    doc.moveDown(1.5);

    const drawSectionHeader = (title: string) => {
      doc
        .rect(50, doc.y, 495, 25)
        .fill("#f8fafc");

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(BRAND_COLORS.primary)
        .text(title, 60, doc.y + 7);

      doc.y += 35;
    };

    const drawDataRow = (label: string, value: string, isHighlighted = false) => {
      const rowHeight = 20;
      const startY = doc.y;

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(BRAND_COLORS.textLight)
        .text(label, 60, startY);

      doc
        .fontSize(10)
        .font(isHighlighted ? "Helvetica-Bold" : "Helvetica")
        .fillColor(isHighlighted ? BRAND_COLORS.primary : BRAND_COLORS.text)
        .text(value, 200, startY);

      doc.y = startY + rowHeight;
    };

    drawSectionHeader("MODALIDADE");

    drawDataRow("Modalidade", `${modality.nome} - ${modality.distancia} ${modality.unidadeDistancia}`, true);
    drawDataRow("Horário de Largada", modality.horarioLargada || "A confirmar");
    if (batch) {
      drawDataRow("Lote", batch.nome);
    }
    if (registration.tamanhoCamisa) {
      let camisaValue = registration.tamanhoCamisa;
      const usarGradePorModalidade = event.usarGradePorModalidade || false;
      let shirtSizes;
      if (usarGradePorModalidade) {
        shirtSizes = await storage.getShirtSizesByModality(registration.modalityId);
      } else {
        shirtSizes = await storage.getShirtSizesByEvent(event.id);
      }
      const selectedSize = shirtSizes.find((s) => s.tamanho === registration.tamanhoCamisa);
      if (selectedSize) {
        const ajustePreco = parseFloat(selectedSize.ajustePreco || "0");
        if (ajustePreco !== 0) {
          const ajusteText =
            ajustePreco < 0
              ? `(Desconto: -R$ ${Math.abs(ajustePreco).toFixed(2).replace(".", ",")})`
              : `(Acréscimo: +R$ ${ajustePreco.toFixed(2).replace(".", ",")})`;
          camisaValue = `${registration.tamanhoCamisa} ${ajusteText}`;
        }
      }
      drawDataRow("Tamanho da Camisa", camisaValue);
    }
    if (registration.equipe) {
      drawDataRow("Equipe", registration.equipe);
    }
    drawDataRow("Data da Inscrição", formatDate(registration.dataInscricao));

    doc.moveDown(1);

    drawSectionHeader("PARTICIPANTE");

    drawDataRow("Nome Completo", registration.nomeCompleto || athlete.nome, true);
    drawDataRow("CPF", formatCPF(registration.cpf || athlete.cpf));
    drawDataRow("E-mail", athlete.email);
    drawDataRow("Telefone", athlete.telefone || "N/A");
    if (athlete.dataNascimento) {
      drawDataRow("Data de Nascimento", formatDate(athlete.dataNascimento));
    }
    if (athlete.cidade && athlete.estado) {
      drawDataRow("Cidade/Estado", `${athlete.cidade} - ${athlete.estado}`);
    }

    if (order) {
      doc.moveDown(1);

      drawSectionHeader("PAGAMENTO");

      const valorUnitario = parseFloat(registration.valorUnitario);
      const taxaComodidade = parseFloat(registration.taxaComodidade);
      const valorDesconto = parseFloat(order.valorDesconto || "0");

      drawDataRow("Número do Pedido", `#${order.numeroPedido}`);
      drawDataRow("Valor da Inscrição", formatCurrency(valorUnitario));

      if (taxaComodidade > 0) {
        drawDataRow("Taxa de Comodidade", formatCurrency(taxaComodidade));
      }

      if (valorDesconto > 0) {
        let descontoLabel = "Desconto";
        if (order.codigoCupom) {
          descontoLabel = `Desconto (Cupom: ${order.codigoCupom})`;
        } else if (order.codigoVoucher) {
          descontoLabel = `Desconto (Voucher: ${order.codigoVoucher})`;
        }
        drawDataRow(descontoLabel, `- ${formatCurrency(valorDesconto)}`);
      }

      const valorFinal = valorUnitario + taxaComodidade - valorDesconto;
      drawDataRow("Valor Total Pago", formatCurrency(valorFinal > 0 ? valorFinal : 0), true);

      if (order.dataPagamento) {
        drawDataRow("Data do Pagamento", formatDate(order.dataPagamento));
      }

      if (order.metodoPagamento) {
        const metodoPagamentoLabel =
          order.metodoPagamento === "pix"
            ? "PIX"
            : order.metodoPagamento === "credit_card"
              ? "Cartão de Crédito"
              : order.metodoPagamento;
        drawDataRow("Método de Pagamento", metodoPagamentoLabel);
      }
    }

    doc.moveDown(2);

    doc
      .rect(50, doc.y, 495, 100)
      .lineWidth(1)
      .strokeColor(BRAND_COLORS.border)
      .stroke();

    const qrCodeLargeBuffer = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");
    doc.image(qrCodeLargeBuffer, 65, doc.y + 10, { width: 80, height: 80 });

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(BRAND_COLORS.primary)
      .text("QR Code de Verificação", 160, doc.y + 20);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(BRAND_COLORS.textLight)
      .text("Apresente este QR code no dia do evento", 160, doc.y + 10)
      .text("para agilizar sua identificação.", 160);

    doc.y += 110;

    doc.moveDown(1);
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor(BRAND_COLORS.border)
      .stroke();

    doc.moveDown(0.5);
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(BRAND_COLORS.textLight)
      .text(
        "Este documento é um comprovante de inscrição gerado eletronicamente pelo sistema KitRunner.",
        { align: "center" },
      )
      .text(`Documento gerado em: ${new Date().toLocaleString("pt-BR")}`, {
        align: "center",
      });

    doc.end();
  } catch (error) {
    console.error("[receipts] Erro ao gerar comprovante:", error);
    return res
      .status(500)
      .json({ success: false, error: "Erro ao gerar comprovante" });
  }
});

export default router;
