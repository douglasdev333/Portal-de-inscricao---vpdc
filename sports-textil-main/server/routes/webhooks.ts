import { Router } from "express";
import { storage } from "../storage";
import { getPaymentStatus, validateWebhookSignature } from "../services/mercadopago-service";

const router = Router();

router.post("/mercadopago", async (req, res) => {
  console.log("[webhook] ========== WEBHOOK RECEBIDO ==========");
  console.log("[webhook] Headers:", JSON.stringify(req.headers, null, 2));
  console.log("[webhook] Body:", JSON.stringify(req.body, null, 2));
  console.log("[webhook] ========================================");
  
  try {
    const xSignature = req.headers['x-signature'] as string | undefined;
    const xRequestId = req.headers['x-request-id'] as string | undefined;
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

    const body = req.body;
    const dataId = body?.data?.id?.toString() || "";
    const notificationType = body?.type || body?.action;

    console.log(`[webhook] Notificação recebida: type=${notificationType}, data.id=${dataId}`);

    if (webhookSecret && !validateWebhookSignature(xSignature, xRequestId, dataId, webhookSecret)) {
      console.warn("[webhook] Assinatura inválida - ignorando webhook");
      return res.status(200).json({ received: true });
    }

    if (notificationType === "payment" || notificationType === "payment.created" || notificationType === "payment.updated") {
      const paymentId = dataId;
      
      if (!paymentId) {
        console.warn("[webhook] Payment ID não encontrado no payload");
        return res.status(200).json({ received: true });
      }

      const paymentResult = await getPaymentStatus(paymentId);
      
      if (!paymentResult.success) {
        console.error(`[webhook] Erro ao consultar pagamento ${paymentId}:`, paymentResult.error);
        return res.status(200).json({ received: true });
      }

      console.log(`[webhook] Status do pagamento ${paymentId}: ${paymentResult.status}`);

      const ordersResult = await storage.getOrdersByPaymentId(paymentId);
      const order = ordersResult;

      if (!order) {
        console.warn(`[webhook] Pedido não encontrado para pagamento ${paymentId}`);
        return res.status(200).json({ received: true });
      }

      if (paymentResult.status === "approved" && order.status === "pendente") {
        await storage.confirmOrderPayment(order.id, paymentId);
        console.log(`[webhook] Pedido ${order.id} confirmado via webhook`);
      } else if (paymentResult.status === "rejected" || paymentResult.status === "cancelled") {
        console.log(`[webhook] Pagamento ${paymentId} rejeitado/cancelado - pedido ${order.id} permanece pendente`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[webhook] Erro ao processar webhook:", error);
    return res.status(200).json({ received: true });
  }
});

export default router;
