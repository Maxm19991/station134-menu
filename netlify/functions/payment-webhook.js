const { createMollieClient } = require('@mollie/api-client');
const fetch = require('node-fetch');

// Track webhook calls for debugging
global.webhookCalls = global.webhookCalls || 0;

exports.handler = async (event, context) => {
  global.webhookCalls++;

  // Handle GET requests for testing
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'Webhook is working',
        message: 'Ready to receive Mollie notifications',
        totalCalls: global.webhookCalls
      })
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('=== WEBHOOK CALLED ===');
    console.log('Total webhook calls so far:', global.webhookCalls);
    console.log('Webhook called with body:', event.body);
    console.log('Webhook headers:', event.headers);

    const { id } = JSON.parse(event.body);
    console.log('Extracted payment ID:', id);

    if (!id) {
      console.log('ERROR: Missing payment ID in request');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing payment ID' })
      };
    }

    // Initialize Mollie client with correct API key
    // For live payments, use live key. For test payments, use test key.
    // Since we're now in live mode, prioritize live API key
    let mollieClient;
    let isLivePayment = true;

    try {
      // Try live API key first (for live payments)
      console.log('Trying live API key for payment:', id);
      mollieClient = createMollieClient({
        apiKey: process.env.MOLLIE_LIVE_API_KEY
      });
      await mollieClient.payments.get(id);
      console.log('Live API key worked for payment:', id);
    } catch (error) {
      // If live API fails to find payment, it might be a test payment
      console.log('Live API failed, trying test API:', error.message);
      isLivePayment = false;
      try {
        mollieClient = createMollieClient({
          apiKey: process.env.MOLLIE_TEST_API_KEY
        });
        await mollieClient.payments.get(id);
        console.log('Test API key worked for payment:', id);
      } catch (testError) {
        console.log('Both API keys failed for payment:', id, testError.message);
        throw testError;
      }
    }

    // Get payment details
    const payment = await mollieClient.payments.get(id);

    // Log payment status for debugging
    console.log('Payment webhook received:', {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      description: payment.description,
      metadata: payment.metadata,
      isLivePayment: isLivePayment
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
        console.log('Storing order for printing...', {
          table: payment.metadata?.table,
          paymentId: payment.id,
          amount: payment.amount.value
        });
        
        const orderData = {
          table: payment.metadata?.table || 'Unknown',
          items: JSON.parse(payment.metadata?.orderItems || '[]'),
          total: parseFloat(payment.amount.value),
          comment: payment.metadata?.comment || '',
          tip: parseFloat(payment.metadata?.tip || '0'),
          paymentId: payment.id,
          timestamp: new Date().toISOString()
        };
        
        console.log('Order data prepared:', orderData);
        
        // Store order using new recent-orders function
        const storeResponse = await fetch('https://graceful-lebkuchen-da9a1f.netlify.app/.netlify/functions/recent-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        
        const responseText = await storeResponse.text();
        console.log('Store order response:', storeResponse.status, responseText);
        
        if (storeResponse.ok) {
          console.log('Order stored successfully for printing');
        } else {
          console.error('Failed to store order for printing:', storeResponse.status, responseText);
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