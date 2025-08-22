const { createMollieClient } = require('@mollie/api-client');
const fetch = require('node-fetch');

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
      
      // Store order for printing
      try {
        const orderData = {
          table: payment.metadata?.table || 'Unknown',
          items: JSON.parse(payment.metadata?.orderItems || '[]'),
          total: parseFloat(payment.amount.value),
          paymentId: payment.id,
          timestamp: new Date().toISOString()
        };
        
        // Store order using Netlify function
        const storeResponse = await fetch(`${event.headers.origin || 'https://68a78e63b6598965dcaab232--graceful-lebkuchen-da9a1f.netlify.app'}/.netlify/functions/store-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        
        if (storeResponse.ok) {
          console.log('Order stored for printing');
        } else {
          console.error('Failed to store order for printing');
        }
      } catch (storeError) {
        console.error('Error storing order:', storeError);
      }
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