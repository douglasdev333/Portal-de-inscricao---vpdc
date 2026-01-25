import { Router } from "express";
import PDFDocument from "pdfkit";
import { storage } from "../storage";

const router = Router();

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

router.get("/:registrationId", async (req, res) => {
  try {
    const athleteId = (req.session as any)?.athleteId;
    if (!athleteId) {
      return res.status(401).json({ success: false, error: "Não autenticado" });
    }

    const { registrationId } = req.params;
    const registration = await storage.getRegistration(registrationId);

    if (!registration) {
      return res.status(404).json({ success: false, error: "Inscrição não encontrada" });
    }

    if (registration.athleteId !== athleteId) {
      return res.status(403).json({ success: false, error: "Acesso não autorizado" });
    }

    if (registration.status !== "confirmada") {
      return res.status(400).json({ 
        success: false, 
        error: "Comprovante disponível apenas para inscrições confirmadas" 
      });
    }

    const [event, modality, athlete, order, batch] = await Promise.all([
      storage.getEvent(registration.eventId),
      storage.getModality(registration.modalityId),
      storage.getAthlete(registration.athleteId),
      registration.orderId ? storage.getOrder(registration.orderId) : null,
      registration.batchId ? storage.getBatch(registration.batchId) : null
    ]);

    if (!event || !modality || !athlete) {
      return res.status(404).json({ success: false, error: "Dados não encontrados" });
    }

    const doc = new PDFDocument({ 
      size: "A4", 
      margin: 50,
      info: {
        Title: `Comprovante de Inscrição - ${event.nome}`,
        Author: "ST Eventos",
        Subject: `Inscrição #${registration.numeroInscricao}`
      }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition", 
      `attachment; filename=comprovante-inscricao-${registration.numeroInscricao}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(24)
       .font("Helvetica-Bold")
       .fillColor("#1a365d")
       .text("ST EVENTOS", { align: "center" });

    doc.moveDown(0.5);
    doc.fontSize(16)
       .font("Helvetica")
       .fillColor("#333333")
       .text("Comprovante de Inscrição", { align: "center" });

    doc.moveDown(2);

    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor("#e2e8f0")
       .stroke();

    doc.moveDown(1);

    doc.fontSize(18)
       .font("Helvetica-Bold")
       .fillColor("#1a365d")
       .text(event.nome);

    doc.moveDown(0.5);
    doc.fontSize(11)
       .font("Helvetica")
       .fillColor("#4a5568")
       .text(`Data do Evento: ${formatDate(event.dataEvento)}`)
       .text(`Local: ${event.endereco}`)
       .text(`${event.cidade} - ${event.estado}`);

    doc.moveDown(1.5);

    doc.fontSize(14)
       .font("Helvetica-Bold")
       .fillColor("#1a365d")
       .text("Dados da Inscrição");

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor("#e2e8f0")
       .stroke();

    doc.moveDown(0.5);
    doc.fontSize(11)
       .font("Helvetica")
       .fillColor("#333333");

    const inscricaoData = [
      { label: "Número da Inscrição", value: `#${registration.numeroInscricao}` },
      { label: "Status", value: "CONFIRMADA" },
      { label: "Modalidade", value: `${modality.nome} - ${modality.distancia} ${modality.unidadeDistancia}` },
      { label: "Horário de Largada", value: modality.horarioLargada || "A confirmar" },
    ];

    if (batch) {
      inscricaoData.push({ label: "Lote", value: batch.nome });
    }

    if (registration.tamanhoCamisa) {
      inscricaoData.push({ label: "Tamanho da Camisa", value: registration.tamanhoCamisa });
    }

    if (registration.equipe) {
      inscricaoData.push({ label: "Equipe", value: registration.equipe });
    }

    inscricaoData.push({ 
      label: "Data da Inscrição", 
      value: formatDate(registration.dataInscricao) 
    });

    inscricaoData.forEach(item => {
      doc.font("Helvetica-Bold").text(`${item.label}: `, { continued: true });
      doc.font("Helvetica").text(item.value);
    });

    doc.moveDown(1.5);

    doc.fontSize(14)
       .font("Helvetica-Bold")
       .fillColor("#1a365d")
       .text("Dados do Participante");

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor("#e2e8f0")
       .stroke();

    doc.moveDown(0.5);
    doc.fontSize(11)
       .font("Helvetica")
       .fillColor("#333333");

    const participanteData = [
      { label: "Nome", value: registration.nomeCompleto || athlete.nome },
      { label: "CPF", value: registration.cpf || athlete.cpf || "N/A" },
      { label: "Email", value: athlete.email },
      { label: "Telefone", value: athlete.telefone || "N/A" },
    ];

    if (athlete.dataNascimento) {
      participanteData.push({ label: "Data de Nascimento", value: formatDate(athlete.dataNascimento) });
    }

    if (athlete.cidade && athlete.estado) {
      participanteData.push({ label: "Cidade/Estado", value: `${athlete.cidade} - ${athlete.estado}` });
    }

    participanteData.forEach(item => {
      doc.font("Helvetica-Bold").text(`${item.label}: `, { continued: true });
      doc.font("Helvetica").text(item.value);
    });

    if (order) {
      doc.moveDown(1.5);

      doc.fontSize(14)
         .font("Helvetica-Bold")
         .fillColor("#1a365d")
         .text("Dados do Pagamento");

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .strokeColor("#e2e8f0")
         .stroke();

      doc.moveDown(0.5);
      doc.fontSize(11)
         .font("Helvetica")
         .fillColor("#333333");

      const valorUnitario = parseFloat(registration.valorUnitario);
      const taxaComodidade = parseFloat(registration.taxaComodidade);
      const totalInscricao = valorUnitario + taxaComodidade;

      const pagamentoData = [
        { label: "Número do Pedido", value: `#${order.numeroPedido}` },
        { label: "Valor da Inscrição", value: formatCurrency(valorUnitario) },
      ];

      if (taxaComodidade > 0) {
        pagamentoData.push({ label: "Taxa de Comodidade", value: formatCurrency(taxaComodidade) });
      }

      pagamentoData.push(
        { label: "Valor Total", value: formatCurrency(totalInscricao) },
        { label: "Status do Pagamento", value: "PAGO" }
      );

      if (order.dataPagamento) {
        pagamentoData.push({ label: "Data do Pagamento", value: formatDate(order.dataPagamento) });
      }

      if (order.metodoPagamento) {
        const metodoPagamentoLabel = order.metodoPagamento === "pix" ? "PIX" : 
                                     order.metodoPagamento === "credit_card" ? "Cartão de Crédito" : 
                                     order.metodoPagamento;
        pagamentoData.push({ label: "Método de Pagamento", value: metodoPagamentoLabel });
      }

      if (order.idPagamentoGateway) {
        pagamentoData.push({ label: "ID da Transação", value: order.idPagamentoGateway });
      }

      pagamentoData.forEach(item => {
        doc.font("Helvetica-Bold").text(`${item.label}: `, { continued: true });
        doc.font("Helvetica").text(item.value);
      });
    }

    doc.moveDown(3);
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor("#e2e8f0")
       .stroke();

    doc.moveDown(1);
    doc.fontSize(9)
       .font("Helvetica")
       .fillColor("#718096")
       .text("Este documento é um comprovante de inscrição gerado eletronicamente.", { align: "center" })
       .text(`Documento gerado em: ${new Date().toLocaleString("pt-BR")}`, { align: "center" });

    doc.end();
  } catch (error) {
    console.error("[receipts] Erro ao gerar comprovante:", error);
    return res.status(500).json({ success: false, error: "Erro ao gerar comprovante" });
  }
});

export default router;
