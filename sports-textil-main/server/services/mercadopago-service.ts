import { MercadoPagoConfig, Payment } from 'mercadopago';
import crypto from 'crypto';

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!accessToken) {
  console.warn('[mercadopago-service] MERCADOPAGO_ACCESS_TOKEN não configurado. Integração com Mercado Pago desabilitada.');
}

const client = accessToken ? new MercadoPagoConfig({ 
  accessToken,
  options: {
    timeout: 30000 // 30 segundos para evitar falhas de timeout
  }
}) : null;
const paymentClient = client ? new Payment(client) : null;

export interface PixPaymentResult {
  success: boolean;
  paymentId?: string;
  status?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  expirationDate?: string;
  error?: string;
}

export interface CardPaymentResult {
  success: boolean;
  paymentId?: string;
  status?: string;
  statusDetail?: string;
  error?: string;
}

export interface PaymentStatusResult {
  success: boolean;
  paymentId?: string;
  status?: string;
  statusDetail?: string;
  dateApproved?: string;
  externalReference?: string;
  error?: string;
}

export async function createPixPayment(
  orderId: string,
  amount: number,
  description: string,
  buyerEmail: string,
  externalReference?: string
): Promise<PixPaymentResult> {
  if (!paymentClient) {
    return {
      success: false,
      error: 'Mercado Pago não configurado. Configure MERCADOPAGO_ACCESS_TOKEN.'
    };
  }

  try {
    const expirationMinutes = parseInt(process.env.ORDER_EXPIRATION_MINUTES || "30", 10);
    const expirationDate = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const payment = await paymentClient.create({
      body: {
        transaction_amount: amount,
        description: description,
        payment_method_id: 'pix',
        payer: {
          email: buyerEmail
        },
        external_reference: externalReference || orderId,
        date_of_expiration: expirationDate.toISOString()
      }
    });

    const pixData = payment.point_of_interaction?.transaction_data;

    return {
      success: true,
      paymentId: payment.id?.toString(),
      status: payment.status || undefined,
      qrCode: pixData?.qr_code || undefined,
      qrCodeBase64: pixData?.qr_code_base64 || undefined,
      expirationDate: payment.date_of_expiration || undefined
    };
  } catch (error: any) {
    console.error('[mercadopago-service] Erro ao criar pagamento PIX:', error);
    return {
      success: false,
      error: error.message || 'Erro ao criar pagamento PIX'
    };
  }
}

export interface PayerAddressInfo {
  zipCode?: string;
  streetName?: string;
  streetNumber?: string;
  neighborhood?: string;
  city?: string;
  federalUnit?: string;
}

export interface PayerPhoneInfo {
  areaCode?: string;
  number?: string;
}

export async function createCardPayment(
  orderId: string,
  amount: number,
  token: string,
  installments: number,
  buyerEmail: string,
  paymentMethodId: string,
  issuerId: string,
  externalReference?: string,
  payerIdentification?: { type: string; number: string },
  cardholderName?: string,
  description?: string,
  ipAddress?: string,
  payerPhone?: PayerPhoneInfo,
  payerAddress?: PayerAddressInfo
): Promise<CardPaymentResult> {
  if (!paymentClient) {
    return {
      success: false,
      error: 'Mercado Pago não configurado. Configure MERCADOPAGO_ACCESS_TOKEN.'
    };
  }

  try {
    // === VALIDAÇÕES ===
    // Validar token do cartão
    if (!token || token.length < 10) {
      return {
        success: false,
        error: 'Token do cartão inválido ou muito curto'
      };
    }

    // Validar CPF (11 dígitos)
    const cleanCpf = payerIdentification?.number?.replace(/\D/g, '') || '';
    if (cleanCpf.length !== 11) {
      return {
        success: false,
        error: 'CPF inválido - deve ter exatamente 11 dígitos'
      };
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail)) {
      return {
        success: false,
        error: 'Email inválido'
      };
    }

    // Parse first_name and last_name from cardholderName
    let firstName = "";
    let lastName = "";
    if (cardholderName) {
      const nameParts = cardholderName.trim().split(/\s+/);
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || nameParts[0] || "";
    }

    // Validar nome e sobrenome
    if (firstName.length < 1 || lastName.length < 1) {
      return {
        success: false,
        error: 'Nome e sobrenome são obrigatórios'
      };
    }

    const paymentBody: any = {
      transaction_amount: amount,
      token: token,
      description: description || `Pagamento pedido ${orderId}`,
      installments: installments,
      payment_method_id: paymentMethodId,
      statement_descriptor: "STEVENTOS",
      binary_mode: false, // Permite análise adicional ao invés de rejeitar imediatamente
      payer: {
        email: buyerEmail,
        first_name: firstName,
        last_name: lastName
      },
      external_reference: externalReference || orderId,
      additional_info: {
        items: [
          {
            id: orderId,
            title: description || `Inscrição em evento esportivo`,
            description: description || `Inscrição em evento esportivo`,
            category_id: "services",
            quantity: 1,
            unit_price: amount
          }
        ],
        payer: {
          first_name: firstName,
          last_name: lastName
        }
      }
    };

    // Add payer identification (required for real cards in Brazil)
    if (payerIdentification) {
      paymentBody.payer.identification = {
        type: payerIdentification.type,
        number: payerIdentification.number
      };
    }

    // Add payer phone (helps with anti-fraud analysis)
    if (payerPhone?.areaCode && payerPhone?.number) {
      paymentBody.payer.phone = {
        area_code: payerPhone.areaCode,
        number: payerPhone.number
      };
      paymentBody.additional_info.payer.phone = {
        area_code: payerPhone.areaCode,
        number: payerPhone.number
      };
    }

    // Add payer address (critical for anti-fraud analysis)
    if (payerAddress?.zipCode) {
      paymentBody.payer.address = {
        zip_code: payerAddress.zipCode.replace(/\D/g, ""),
        street_name: payerAddress.streetName || "Não informado",
        street_number: payerAddress.streetNumber || "S/N"
      };
      // additional_info.payer.address only supports: zip_code, street_name, street_number
      paymentBody.additional_info.payer.address = {
        zip_code: payerAddress.zipCode.replace(/\D/g, ""),
        street_name: payerAddress.streetName || "Não informado",
        street_number: payerAddress.streetNumber || "S/N"
      };
    }

    if (issuerId && issuerId.trim() !== "") {
      paymentBody.issuer_id = parseInt(issuerId, 10);
    }

    // Add IP address for fraud prevention if available
    if (ipAddress) {
      paymentBody.additional_info.ip_address = ipAddress;
    }

    // Enable 3D Secure for improved approval rates on high-risk payments
    // "optional" allows MP to decide when 3DS is needed
    paymentBody.three_d_secure_mode = "optional";

    console.log('[mercadopago-service] Enviando pagamento cartão:', {
      transaction_amount: paymentBody.transaction_amount,
      payment_method_id: paymentBody.payment_method_id,
      installments: paymentBody.installments,
      issuer_id: paymentBody.issuer_id,
      has_token: !!paymentBody.token,
      has_identification: !!paymentBody.payer?.identification,
      has_phone: !!paymentBody.payer?.phone,
      has_address: !!paymentBody.payer?.address,
      payer_email: paymentBody.payer?.email,
      payer_first_name: paymentBody.payer?.first_name,
      payer_last_name: paymentBody.payer?.last_name,
      has_additional_info: !!paymentBody.additional_info
    });

    const payment = await paymentClient.create({
      body: paymentBody
    });

    console.log('[mercadopago-service] Resposta pagamento:', {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail
    });

    return {
      success: true,
      paymentId: payment.id?.toString(),
      status: payment.status || undefined,
      statusDetail: payment.status_detail || undefined
    };
  } catch (error: any) {
    console.error('[mercadopago-service] Erro ao criar pagamento com cartão:', error);
    // Log full error details for debugging
    if (error.cause) {
      console.error('[mercadopago-service] Detalhes do erro:', JSON.stringify(error.cause, null, 2));
    }
    return {
      success: false,
      error: error.message || 'Erro ao criar pagamento com cartão'
    };
  }
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
  if (!paymentClient) {
    return {
      success: false,
      error: 'Mercado Pago não configurado. Configure MERCADOPAGO_ACCESS_TOKEN.'
    };
  }

  try {
    const payment = await paymentClient.get({ id: paymentId });

    return {
      success: true,
      paymentId: payment.id?.toString(),
      status: payment.status || undefined,
      statusDetail: payment.status_detail || undefined,
      dateApproved: payment.date_approved || undefined,
      externalReference: payment.external_reference || undefined
    };
  } catch (error: any) {
    console.error('[mercadopago-service] Erro ao consultar status do pagamento:', error);
    return {
      success: false,
      error: error.message || 'Erro ao consultar status do pagamento'
    };
  }
}

export function validateWebhookSignature(
  xSignature: string | undefined,
  xRequestId: string | undefined,
  dataId: string,
  secret: string
): boolean {
  if (!xSignature || !xRequestId || !secret) {
    return false;
  }

  try {
    const parts = xSignature.split(',');
    let ts: string | undefined;
    let hash: string | undefined;
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key?.trim() === 'ts') {
        ts = value?.trim();
      } else if (key?.trim() === 'v1') {
        hash = value?.trim();
      }
    }
    
    if (!ts || !hash) {
      return false;
    }
    
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');
    
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  } catch (error) {
    console.error('[mercadopago-service] Erro ao validar assinatura do webhook:', error);
    return false;
  }
}

export function isConfigured(): boolean {
  return !!paymentClient;
}
