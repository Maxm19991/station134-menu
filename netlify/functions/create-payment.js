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

    console.log('Payment request:', { table, itemCount: items?.length, total, testMode, tip });

    // Validate required fields
    if (!items || !total || items.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: items, total' })
      };
    }

    // Validate total amount
    if (total <= 0 || isNaN(total)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid total amount', details: `Total must be a positive number, got: ${total}` })
      };
    }

    // Get API key and validate
    const apiKey = testMode ? process.env.MOLLIE_TEST_API_KEY : process.env.MOLLIE_LIVE_API_KEY;

    if (!apiKey) {
      console.error('Missing Mollie API key!', { testMode });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Payment configuration error',
          details: `Missing ${testMode ? 'test' : 'live'} API key in environment variables`
        })
      };
    }

    // Initialize Mollie client
    const mollieClient = createMollieClient({ apiKey });

    // Create order description
    const orderDescription = `Station 134 - ${table !== 'Geen tafel' ? `Tafel ${table}` : 'Takeaway'}`;
    
    // Create line items for Mollie with validation
    const lines = items.map((item, index) => {
      try {
        const priceStr = item.price.replace('€', '').replace(',', '.');
        const unitPrice = parseFloat(priceStr);

        if (isNaN(unitPrice) || unitPrice < 0) {
          throw new Error(`Invalid price for item "${item.name}": ${item.price}`);
        }

        return {
          name: item.displayName || item.name,
          quantity: item.quantity,
          unitPrice: {
            currency: currency,
            value: unitPrice.toFixed(2)
          },
          totalAmount: {
            currency: currency,
            value: (unitPrice * item.quantity).toFixed(2)
          }
        };
      } catch (err) {
        console.error(`Error parsing item ${index}:`, item, err);
        throw new Error(`Failed to parse item price: ${err.message}`);
      }
    });

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