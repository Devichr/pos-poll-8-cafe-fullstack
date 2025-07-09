import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
const midtransClient = require('midtrans-client');

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Midtrans configuration
const snap = new midtransClient.Snap({
  isProduction: false, // Set to true for production
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

const coreApi = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

interface CreatePaymentBody {
  orderId?: number;
  bookingId?: number;
  paymentType: 'Order' | 'Booking';
}

interface PaymentNotificationBody {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  transaction_id: string;
  fraud_status?: string;
  payment_type?: string;
}

// Authentication middleware
async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return reply.status(401).send({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    request.user = decoded;
  } catch (error) {
    return reply.status(401).send({ error: "Invalid token" });
  }
}

export async function PaymentRoute(fastify: FastifyInstance) {
  // Create payment transaction
  fastify.post<{ Body: CreatePaymentBody }>("/payment/create", async (request, reply) => {
    try {
      const { orderId, bookingId, paymentType } = request.body;

      // Check if Midtrans keys are configured
      if (!process.env.MIDTRANS_SERVER_KEY || !process.env.MIDTRANS_CLIENT_KEY) {
        return reply.status(500).send({ 
          error: "Midtrans API keys not configured",
          message: "Please configure MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY environment variables"
        });
      }

      let amount = 0;
      let customerName = "Customer";
      let itemDetails: any[] = [];

      if (paymentType === 'Order' && orderId) {
        // Get order details
        const order = await fastify.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            orderItems: {
              include: {
                product: true
              }
            }
          }
        });

        if (!order) {
          return reply.status(404).send({ error: "Order not found" });
        }

        amount = parseInt(order.totalAmount.toString());
        customerName = order.customerName || "Customer";
        itemDetails = order.orderItems.map(item => ({
          id: item.product.id,
          price: parseInt(item.price.toString()),
          quantity: item.quantity,
          name: item.product.name
        }));

      } else if (paymentType === 'Booking' && bookingId) {
        // Get booking details
        const booking = await fastify.prisma.poolBookings.findUnique({
          where: { id: bookingId },
          include: {
            poolTable: true
          }
        });

        if (!booking) {
          return reply.status(404).send({ error: "Booking not found" });
        }

        amount = parseInt((booking.totalPrice || 0).toString());
        customerName = booking.customer_name || "Customer";
        itemDetails = [{
          id: booking.poolTable.id,
          price: amount,
          quantity: 1,
          name: `${booking.poolTable.name} - ${booking.durationHours} jam`
        }];

      } else {
        return reply.status(400).send({ error: "Invalid payment type or missing ID" });
      }

      // Generate unique order ID for Midtrans
      const midtransOrderId = `${paymentType.toUpperCase()}-${orderId || bookingId}-${Date.now()}`;

      // Prepare transaction details for Midtrans
      const transactionDetails = {
        transaction_details: {
          order_id: midtransOrderId,
          gross_amount: amount
        },
        customer_details: {
          first_name: customerName,
          email: "customer@poll8cafe.com"
        },
        item_details: itemDetails,
        credit_card: {
          secure: true
        },
        callbacks: {
          finish: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/payment/success`
        }
      };

      // Create transaction with Midtrans
      const transaction = await snap.createTransaction(transactionDetails);

      // Save payment record to database
      const payment = await fastify.prisma.payment.create({
        data: {
          orderId: paymentType === 'Order' ? orderId : null,
          bookingId: paymentType === 'Booking' ? bookingId : null,
          paymentType: paymentType,
          amount: amount,
          status: 'Pending',
          midtransOrderId: midtransOrderId,
          midtransToken: transaction.token,
          midtransRedirectUrl: transaction.redirect_url
        }
      });

      reply.send({
        message: "Payment transaction created successfully",
        paymentId: payment.id,
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        order_id: midtransOrderId
      });
    } catch (error) {
      console.error("Payment creation error:", error);
      reply.status(500).send({ 
        error: "Failed to create payment transaction",
        details: error.message
      });
    }
  });

  // Handle payment notification from Midtrans
  fastify.post<{ Body: PaymentNotificationBody }>("/payment/notification", async (request, reply) => {
    try {
      const notification = request.body;

      // Check if Midtrans keys are configured
      if (!process.env.MIDTRANS_SERVER_KEY) {
        return reply.status(500).send({ 
          error: "Midtrans server key not configured"
        });
      }

      // Verify notification authenticity
      const statusResponse = await coreApi.transaction.notification(notification);

      const orderId = statusResponse.order_id;
      const transactionStatus = statusResponse.transaction_status;
      const fraudStatus = statusResponse.fraud_status;
      const transactionId = statusResponse.transaction_id;
      const paymentType = statusResponse.payment_type;

      console.log(`Transaction notification received. Order ID: ${orderId}. Transaction status: ${transactionStatus}. Fraud status: ${fraudStatus}`);

      // Find payment record in database
      const payment = await fastify.prisma.payment.findUnique({
        where: { midtransOrderId: orderId },
        include: {
          order: true,
          booking: true
        }
      });

      if (!payment) {
        console.error(`Payment not found for order ID: ${orderId}`);
        return reply.status(404).send({ error: "Payment not found" });
      }

      let newStatus: 'Pending' | 'Success' | 'Failed' | 'Cancelled' | 'Expired' | 'Challenge' = 'Pending';
      let paidAt: Date | null = null;

      // Handle different transaction statuses
      if (transactionStatus === 'capture') {
        if (fraudStatus === 'challenge') {
          newStatus = 'Challenge';
          console.log('Transaction is challenged');
        } else if (fraudStatus === 'accept') {
          newStatus = 'Success';
          paidAt = new Date();
          console.log('Transaction is successful');
        }
      } else if (transactionStatus === 'settlement') {
        newStatus = 'Success';
        paidAt = new Date();
        console.log('Transaction is settled');
      } else if (transactionStatus === 'cancel' || transactionStatus === 'deny') {
        newStatus = 'Cancelled';
        console.log('Transaction is cancelled/denied');
      } else if (transactionStatus === 'expire') {
        newStatus = 'Expired';
        console.log('Transaction is expired');
      } else if (transactionStatus === 'pending') {
        newStatus = 'Pending';
        console.log('Transaction is pending');
      } else {
        newStatus = 'Failed';
        console.log('Transaction failed');
      }

      // Update payment record
      await fastify.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          transactionId: transactionId,
          paymentMethod: paymentType,
          paidAt: paidAt
        }
      });

      // Update order/booking status if payment is successful
      if (newStatus === 'Success') {
        if (payment.order) {
          await fastify.prisma.order.update({
            where: { id: payment.order.id },
            data: { status: 'Paid' }
          });
        }
        
        if (payment.booking) {
          await fastify.prisma.poolBookings.update({
            where: { id: payment.booking.id },
            data: { status: 'InProgress' }
          });
        }
      }

      reply.send({ status: 'ok' });
    } catch (error) {
      console.error("Payment notification error:", error);
      reply.status(500).send({ error: "Failed to process payment notification" });
    }
  });

  // Check payment status
  fastify.get<{ Params: { paymentId: string } }>("/payment/status/:paymentId", async (request, reply) => {
    try {
      const { paymentId } = request.params;

      const payment = await fastify.prisma.payment.findUnique({
        where: { id: parseInt(paymentId) },
        include: {
          order: true,
          booking: true
        }
      });

      if (!payment) {
        return reply.status(404).send({ error: "Payment not found" });
      }

      reply.send({
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        paymentType: payment.paymentType,
        midtransOrderId: payment.midtransOrderId,
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        order: payment.order,
        booking: payment.booking
      });
    } catch (error) {
      console.error("Payment status check error:", error);
      reply.status(500).send({ 
        error: "Failed to check payment status",
        details: error.message
      });
    }
  });

  // Cancel payment
  fastify.post<{ Params: { paymentId: string } }>("/payment/cancel/:paymentId", async (request, reply) => {
    try {
      const { paymentId } = request.params;

      const payment = await fastify.prisma.payment.findUnique({
        where: { id: parseInt(paymentId) }
      });

      if (!payment) {
        return reply.status(404).send({ error: "Payment not found" });
      }

      // Check if Midtrans keys are configured
      if (!process.env.MIDTRANS_SERVER_KEY) {
        return reply.status(500).send({ 
          error: "Midtrans server key not configured"
        });
      }

      // Cancel transaction in Midtrans
      const cancelResponse = await coreApi.transaction.cancel(payment.midtransOrderId);

      // Update payment status
      await fastify.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'Cancelled' }
      });

      reply.send({
        message: "Payment cancelled successfully",
        paymentId: payment.id,
        order_id: cancelResponse.order_id,
        transaction_status: cancelResponse.transaction_status
      });
    } catch (error) {
      console.error("Payment cancellation error:", error);
      reply.status(500).send({ 
        error: "Failed to cancel payment",
        details: error.message
      });
    }
  });

  // Get payment methods (for frontend)
  fastify.get("/payment/methods", async (request, reply) => {
    try {
      const paymentMethods = [
        {
          id: "credit_card",
          name: "Credit Card",
          description: "Pay with Visa, MasterCard, JCB",
          icon: "💳"
        },
        {
          id: "bank_transfer",
          name: "Bank Transfer",
          description: "Transfer via ATM, Internet Banking, Mobile Banking",
          icon: "🏦"
        },
        {
          id: "echannel",
          name: "Mandiri Bill Payment",
          description: "Pay via Mandiri ATM or Internet Banking",
          icon: "🏧"
        },
        {
          id: "permata",
          name: "Permata Virtual Account",
          description: "Pay via Permata ATM or Internet Banking",
          icon: "🏧"
        },
        {
          id: "bca_va",
          name: "BCA Virtual Account",
          description: "Pay via BCA ATM or m-BCA",
          icon: "🏧"
        },
        {
          id: "bni_va",
          name: "BNI Virtual Account",
          description: "Pay via BNI ATM or Internet Banking",
          icon: "🏧"
        },
        {
          id: "bri_va",
          name: "BRI Virtual Account",
          description: "Pay via BRI ATM or Internet Banking",
          icon: "🏧"
        },
        {
          id: "gopay",
          name: "GoPay",
          description: "Pay with GoPay e-wallet",
          icon: "📱"
        },
        {
          id: "shopeepay",
          name: "ShopeePay",
          description: "Pay with ShopeePay e-wallet",
          icon: "📱"
        },
        {
          id: "qris",
          name: "QRIS",
          description: "Pay with any QRIS-enabled app",
          icon: "📱"
        }
      ];

      reply.send({ paymentMethods });
    } catch (error) {
      reply.status(500).send({ error: "Failed to get payment methods" });
    }
  });

  // Get Midtrans client key for frontend
  fastify.get("/payment/config", async (request, reply) => {
    try {
      reply.send({
        clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
        isProduction: false
      });
    } catch (error) {
      reply.status(500).send({ error: "Failed to get payment config" });
    }
  });

  // Get payment history
  fastify.get("/payment/history", async (request, reply) => {
    try {
      const payments = await fastify.prisma.payment.findMany({
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true
                }
              }
            }
          },
          booking: {
            include: {
              poolTable: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      reply.send({ payments });
    } catch (error) {
      console.error("Payment history error:", error);
      reply.status(500).send({ 
        error: "Failed to get payment history",
        details: error.message
      });
    }
  });
}

