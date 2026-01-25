import { storage } from '../storage';
import { getPaymentStatus, isConfigured } from '../services/mercadopago-service';

const POLLING_INTERVAL_MS = parseInt(process.env.PAYMENT_POLLING_INTERVAL_MS || '120000', 10);

export async function pollPayments(): Promise<{ processed: number; confirmed: number; errors: number }> {
  if (!isConfigured()) {
    return { processed: 0, confirmed: 0, errors: 0 };
  }

  let processed = 0;
  let confirmed = 0;
  let errors = 0;

  try {
    const pendingOrders = await storage.getPendingOrdersWithPayment();
    
    console.log(`[payment-polling] Verificando ${pendingOrders.length} pedidos pendentes com pagamento criado`);

    for (const order of pendingOrders) {
      processed++;
      
      try {
        if (!order.idPagamentoGateway) continue;

        const result = await getPaymentStatus(order.idPagamentoGateway);
        
        if (!result.success) {
          console.error(`[payment-polling] Erro ao consultar pagamento ${order.idPagamentoGateway}:`, result.error);
          errors++;
          continue;
        }

        if (result.status === 'approved') {
          await storage.confirmOrderPayment(order.id, order.idPagamentoGateway);
          console.log(`[payment-polling] Pedido ${order.id} confirmado via polling`);
          confirmed++;
        } else if (result.status === 'rejected' || result.status === 'cancelled') {
          console.log(`[payment-polling] Pagamento ${order.idPagamentoGateway} rejeitado/cancelado - pedido ${order.id} permanece pendente`);
        }
      } catch (orderError) {
        console.error(`[payment-polling] Erro ao processar pedido ${order.id}:`, orderError);
        errors++;
      }
    }
  } catch (error) {
    console.error('[payment-polling] Erro geral no job:', error);
    errors++;
  }

  return { processed, confirmed, errors };
}

export function startPaymentPollingJob(): NodeJS.Timeout {
  console.log(`[payment-polling] Iniciando job de polling (intervalo: ${POLLING_INTERVAL_MS}ms)`);
  
  return setInterval(async () => {
    const result = await pollPayments();
    if (result.processed > 0) {
      console.log(`[payment-polling] Resultado: ${result.processed} processados, ${result.confirmed} confirmados, ${result.errors} erros`);
    }
  }, POLLING_INTERVAL_MS);
}
