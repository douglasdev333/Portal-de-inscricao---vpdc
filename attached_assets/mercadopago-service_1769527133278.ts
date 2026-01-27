import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

// Initialize MercadoPago client with access token and secure timeout
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  options: {
    timeout: 30000 // Increased from 5s to 30s for payment stability
  }
});

const payment = new Payment(client);
const preference = new Preference(client);

// Helper function to get public key
export function getPublicKey(): string {
  return process.env.MERCADO_PAGO_PUBLIC_KEY || '';
}

export interface PaymentData {
  token?: string; // For credit/debit cards
  paymentMethodId: string; // credit_card, debit_card, pix
  email: string;
  amount: number;
  description: string;
  orderId: string;
  payer: {
    name: string;
    surname: string;
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

export interface PIXPaymentResponse {
  id: number;
  paymentId?: number;
  status: string;
  qr_code_base64?: string;
  qr_code?: string;
  ticket_url?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code_base64?: string;
      qr_code?: string;
      ticket_url?: string;
    };
  };
}

export class MercadoPagoService {
  /**
   * Process credit/debit card payment
   */
  static async processCardPayment(paymentData: PaymentData) {
    try {
      // Masked logging for security - never log sensitive data in production
      console.log('Processing card payment with data:', JSON.stringify({
        paymentMethodId: paymentData.paymentMethodId,
        email: paymentData.email,
        amount: paymentData.amount,
        description: paymentData.description,
        orderId: paymentData.orderId,
        token: paymentData.token ? '[MASKED_TOKEN]' : 'NO_TOKEN',
        payer: {
          name: paymentData.payer.name,
          surname: paymentData.payer.surname,
          email: paymentData.payer.email,
          identification: {
            type: paymentData.payer.identification.type,
            number: paymentData.payer.identification.number ? '[MASKED_CPF]' : 'NO_CPF'
          }
        }
      }, null, 2));
      
      if (!paymentData.token) {
        throw new Error('Token do cartão é obrigatório');
      }
      
      // Masked payer data logging for security
      console.log('🔍 DEBUGGING - Payer data being sent to MercadoPago (MASKED):', JSON.stringify({
        name: paymentData.payer.name,
        surname: paymentData.payer.surname,
        email: paymentData.payer.email,
        identification: {
          type: paymentData.payer.identification.type,
          number: '[MASKED_CPF]'
        }
      }, null, 2));
      
      // Enhanced validation to prevent diff_param_bins error
      if (!paymentData.token || paymentData.token.length < 10) {
        throw new Error('Token do cartão inválido ou muito curto');
      }
      
      const cleanCpf = paymentData.payer.identification.number?.replace(/\D/g, '') || '';
      if (cleanCpf.length !== 11) {
        throw new Error('CPF inválido - deve ter exatamente 11 dígitos');
      }
      
      // Validate and clean payer name to prevent conflicts
      const cleanName = paymentData.payer.name?.trim() || '';
      const cleanSurname = paymentData.payer.surname?.trim() || '';
      
      if (cleanName.length < 1 || cleanSurname.length < 1) {
        throw new Error('Nome e sobrenome são obrigatórios');
      }
      
      // Additional validation for email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(paymentData.payer.email)) {
        throw new Error('Email inválido');
      }

      const paymentResult = await payment.create({
        body: {
          transaction_amount: paymentData.amount,
          token: paymentData.token,
          description: paymentData.description,
          installments: 1,
          payment_method_id: paymentData.paymentMethodId,
          payer: {
            email: paymentData.payer.email,
            first_name: cleanName,
            last_name: cleanSurname,
            identification: {
              type: paymentData.payer.identification.type,
              number: cleanCpf,
            },
          },
          external_reference: paymentData.orderId,
          binary_mode: false,
        }
      });

      console.log('✅ Payment result status:', paymentResult.status);
      console.log('✅ Payment result status_detail:', paymentResult.status_detail);
      console.log('✅ Payment result ID:', paymentResult.id);
      
      // Check what MercadoPago actually received as cardholder name (masked for security)
      console.log('🔍 IMPORTANT - Cardholder name in MercadoPago response:', paymentResult.card?.cardholder?.name);
      console.log('🔍 IMPORTANT - CPF in MercadoPago response: [MASKED_CPF]');
      
      console.log('📋 Payment result (MASKED):', JSON.stringify({
        id: paymentResult.id,
        status: paymentResult.status,
        status_detail: paymentResult.status_detail,
        card: paymentResult.card ? {
          ...paymentResult.card,
          cardholder: paymentResult.card.cardholder ? {
            name: paymentResult.card.cardholder.name,
            identification: {
              type: paymentResult.card.cardholder.identification?.type,
              number: '[MASKED_CPF]'
            }
          } : null
        } : null,
        payer: paymentResult.payer ? {
          ...paymentResult.payer,
          identification: paymentResult.payer.identification ? {
            type: paymentResult.payer.identification.type,
            number: '[MASKED_ID]'
          } : null
        } : null
      }, null, 2));

      // Handle different payment statuses
      switch (paymentResult.status) {
        case 'approved':
          console.log('🟢 Payment APPROVED');
          return {
            success: true,
            payment: paymentResult,
            status: paymentResult.status,
            id: paymentResult.id
          };
        
        case 'pending':
          console.log('🟡 Payment PENDING');
          return {
            success: true,
            payment: paymentResult,
            status: paymentResult.status,
            id: paymentResult.id
          };
          
        case 'rejected':
          console.log('🔴 Payment REJECTED');
          return {
            success: false,
            payment: paymentResult,
            status: paymentResult.status,
            message: `Pagamento rejeitado: ${paymentResult.status_detail || 'Motivo não especificado'}`,
            id: paymentResult.id
          };
          
        case 'cancelled':
          console.log('⚫ Payment CANCELLED');
          return {
            success: false,
            payment: paymentResult,
            status: paymentResult.status,
            message: `Pagamento cancelado: ${paymentResult.status_detail || 'Motivo não especificado'}`,
            id: paymentResult.id
          };
          
        default:
          console.log(`❓ Payment status unknown: ${paymentResult.status}`);
          return {
            success: false,
            payment: paymentResult,
            status: paymentResult.status,
            message: `Status desconhecido: ${paymentResult.status} - ${paymentResult.status_detail || 'Sem detalhes'}`,
            id: paymentResult.id
          };
      }
    } catch (error: any) {
      console.error('Card payment error:', error);
      
      // Enhanced error logging for debugging
      console.log('🔍 DEBUGGING - Full error details:', JSON.stringify({
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        cause: error.cause,
        stack: error.stack?.substring(0, 200)
      }, null, 2));
      
      // Better error handling for common errors
      let errorMessage = 'Erro ao processar pagamento com cartão';
      let errorTitle = 'Erro no Gateway de Pagamento';
      let errorCode = 'GATEWAY_ERROR';
      
      if (error.message?.includes('bin_not_found')) {
        errorMessage = 'Número do cartão inválido. Use um cartão de teste válido.';
        errorTitle = 'Cartão Inválido';
        errorCode = 'INVALID_CARD_NUMBER';
      } else if (error.message?.includes('invalid_card')) {
        errorMessage = 'Dados do cartão inválidos. Verifique número, data de validade e CVV.';
        errorTitle = 'Dados do Cartão Inválidos';
        errorCode = 'INVALID_CARD_DATA';
      } else if (error.message?.includes('diff_param_bins')) {
        errorMessage = 'Conflito nos parâmetros do cartão. Verifique se os dados do cartão (número, nome, CPF) estão corretos e consistentes.';
        errorTitle = 'Conflito nos Dados do Cartão';
        errorCode = 'CARD_DATA_CONFLICT';
      } else if (error.message?.includes('internal_error')) {
        errorMessage = 'Erro interno do Mercado Pago. Verifique as credenciais e tente novamente.';
        errorTitle = 'Erro Interno do Gateway';
        errorCode = 'GATEWAY_INTERNAL_ERROR';
      } else if (error.cause?.length > 0) {
        const causeErrorCode = error.cause[0].code;
        const errorDesc = error.cause[0].description;
        
        // Handle specific error codes
        if (causeErrorCode === 10103) {
          errorMessage = 'Parâmetros conflitantes do cartão (código 10103). Verifique se:' +
            '\n• O nome no cartão está exatamente como no cartão físico' +
            '\n• O CPF está correto e pertence ao portador do cartão' +
            '\n• O número do cartão foi digitado corretamente' +
            '\n• Todos os dados foram preenchidos sem erro de digitação';
          errorTitle = 'Dados Conflitantes';
          errorCode = 'CARD_DATA_MISMATCH';
        } else {
          errorMessage = errorDesc || errorMessage;
          errorTitle = 'Erro do Gateway';
          errorCode = 'GATEWAY_ERROR';
        }
      } else if (error.message) {
        errorMessage = error.message;
        errorTitle = 'Erro de Processamento';
        errorCode = 'PROCESSING_ERROR';
      }
      
      return {
        success: false,
        error: error,
        message: "Erro ao processar o pagamento", // Generic message for all gateway errors
        title: "Erro no Pagamento",
        code: errorCode
      };
    }
  }

  /**
   * Create PIX payment
   */
  static async createPIXPayment(paymentData: PaymentData): Promise<PIXPaymentResponse | null> {
    try {
      console.log('🚀 Creating PIX payment with orderId:', paymentData.orderId);
      
      const paymentBody = {
        transaction_amount: paymentData.amount,
        description: paymentData.description,
        payment_method_id: 'pix',
        payer: {
          email: paymentData.payer.email,
          first_name: paymentData.payer.name,
          last_name: paymentData.payer.surname,
          identification: {
            type: paymentData.payer.identification.type,
            number: paymentData.payer.identification.number,
          },
        },
        external_reference: paymentData.orderId,
      };
      
      console.log('📦 PIX payment body:', JSON.stringify(paymentBody, null, 2));
      
      const paymentResult = await payment.create({
        body: paymentBody
      });

      console.log('✅ PIX payment result:', JSON.stringify({
        id: paymentResult.id,
        status: paymentResult.status,
        external_reference: paymentResult.external_reference,
        description: paymentResult.description
      }, null, 2));

      return {
        id: paymentResult.id!,
        status: paymentResult.status!,
        qr_code_base64: paymentResult.point_of_interaction?.transaction_data?.qr_code_base64,
        qr_code: paymentResult.point_of_interaction?.transaction_data?.qr_code,
        ticket_url: paymentResult.point_of_interaction?.transaction_data?.ticket_url,
        point_of_interaction: paymentResult.point_of_interaction
      };
    } catch (error) {
      console.error('PIX payment error:', error);
      return null;
    }
  }

  /**
   * Check payment status by ID
   */
  static async getPaymentStatus(paymentId: number) {
    try {
      const paymentResult = await payment.get({ id: paymentId });
      return {
        success: true,
        status: paymentResult.status,
        payment: paymentResult
      };
    } catch (error) {
      console.error('Payment status error:', error);
      return {
        success: false,
        error: error
      };
    }
  }

  /**
   * Renew PIX payment - create a new PIX for existing order
   */
  static async renewPIXPayment(orderId: string, paymentData: PaymentData): Promise<PIXPaymentResponse | null> {
    try {
      console.log('🔄 Renewing PIX payment for orderId:', orderId);
      
      // Create new PIX payment
      const renewedPayment = await this.createPIXPayment(paymentData);
      
      if (renewedPayment) {
        console.log('✅ PIX payment renewed successfully:', renewedPayment.id);
      } else {
        console.log('❌ Failed to renew PIX payment');
      }
      
      return renewedPayment;
    } catch (error) {
      console.error('PIX renewal error:', error);
      return null;
    }
  }

  /**
   * Check if PIX QR code is still valid (30 minutes)
   */
  static isPixExpired(expirationDate: string | null): boolean {
    if (!expirationDate) return true;
    
    const expiration = new Date(expirationDate);
    const now = new Date();
    
    return now > expiration;
  }

  /**
   * Check if order payment is expired (24 hours)
   */
  static isPaymentTimeout(paymentCreatedAt: string | null): boolean {
    if (!paymentCreatedAt) return false;
    
    const created = new Date(paymentCreatedAt);
    const now = new Date();
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    
    return diffHours >= 24;
  }

  /**
   * Get public key for frontend
   */
  static getPublicKey() {
    return process.env.MERCADO_PAGO_PUBLIC_KEY;
  }
}