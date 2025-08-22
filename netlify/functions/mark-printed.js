// Mark orders as printed

const orders = new Map(); // Shared with store-order.js (in production you'd use a real database)

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'POST') {
    try {
      const { orderId } = JSON.parse(event.body);
      
      if (orders.has(orderId)) {
        orders.get(orderId).printed = true;
        console.log('Order marked as printed:', orderId);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      } else {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Order not found' })
        };
      }
    } catch (error) {
      console.error('Error marking order as printed:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to mark order as printed' })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};