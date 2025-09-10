const { createMollieClient } = require('@mollie/api-client');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { table, items, total, currency = 'EUR', testMode = true, comment, tip = 0 } = JSON.parse(event.body);

    // Validate required fields
    if (!items || !total || items.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: items, total' })
      };
    }

    // Initialize Mollie client
    const mollieClient = createMollieClient({
      apiKey: testMode ? process.env.MOLLIE_TEST_API_KEY : process.env.MOLLIE_LIVE_API_KEY
    });

    // Create order description
    const orderDescription = `Station 134 - ${table !== 'Geen tafel' ? `Tafel ${table}` : 'Takeaway'}`;
    
    // Create line items for Mollie
    const lines = items.map(item => ({
      name: item.displayName || item.name,
      quantity: item.quantity,
      unitPrice: {
        currency: currency,
        value: parseFloat(item.price.replace('€', '').replace(',', '.')).toFixed(2)
      },
      totalAmount: {
        currency: currency,
        value: (parseFloat(item.price.replace('€', '').replace(',', '.')) * item.quantity).toFixed(2)
      }
    }));

    // Calculate total amount
    const totalAmount = {
      currency: currency,
      value: total.toFixed(2)
    };

    // Get the site URL from headers
    const siteUrl = event.headers.origin || 'https://graceful-lebkuchen-da9a1f.netlify.app';

    // Create payment with Mollie
    const payment = await mollieClient.payments.create({
      amount: totalAmount,
      description: orderDescription,
      redirectUrl: `${siteUrl}?payment=success`,
      webhookUrl: `https://graceful-lebkuchen-da9a1f.netlify.app/.netlify/functions/payment-webhook`,
      metadata: {
        table: table,
        orderItems: JSON.stringify(items),
        totalAmount: total.toFixed(2),
        comment: comment || '',
        tip: tip.toFixed(2)
      }
    });

    // Return payment URL
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        paymentUrl: payment.getCheckoutUrl(),
        paymentId: payment.id
      })
    };

  } catch (error) {
    console.error('Payment creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create payment',
        details: error.message 
      })
    };
  }
};