const { createMollieClient } = require('@mollie/api-client');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { id } = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing payment ID' })
      };
    }

    // Initialize Mollie client (try both test and live keys)
    let mollieClient;
    try {
      mollieClient = createMollieClient({
        apiKey: process.env.MOLLIE_LIVE_API_KEY
      });
      // Test if this is a live payment
      await mollieClient.payments.get(id);
    } catch (error) {
      // If live fails, try test
      mollieClient = createMollieClient({
        apiKey: process.env.MOLLIE_TEST_API_KEY
      });
    }

    // Get payment details
    const payment = await mollieClient.payments.get(id);

    // Log payment status for debugging
    console.log('Payment webhook received:', {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      description: payment.description,
      metadata: payment.metadata
    });

    // Handle different payment statuses
    if (payment.isPaid()) {
      console.log('Payment successful:', {
        id: payment.id,
        table: payment.metadata?.table,
        amount: payment.amount.value,
        items: payment.metadata?.orderItems
      });
      
      // Here you could:
      // - Send email confirmation
      // - Save order to database
      // - Notify restaurant staff
      // - Send to POS system
    } else if (payment.isFailed() || payment.isExpired() || payment.isCanceled()) {
      console.log('Payment failed/expired/canceled:', {
        id: payment.id,
        status: payment.status
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook processing failed' })
    };
  }
};