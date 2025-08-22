// Simple order storage using Netlify Functions
// This stores orders in a way that can be retrieved by the print server

const orders = new Map(); // In-memory storage (resets on function restart)

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'POST') {
    try {
      const order = JSON.parse(event.body);
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store order with timestamp
      const orderData = {
        id: orderId,
        ...order,
        timestamp: new Date().toISOString(),
        printed: false
      };
      
      orders.set(orderId, orderData);
      
      console.log('Order stored:', orderId);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, orderId })
      };
    } catch (error) {
      console.error('Error storing order:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to store order' })
      };
    }
  }

  if (event.httpMethod === 'GET') {
    try {
      // Return all unprinted orders
      const allOrders = Array.from(orders.values())
        .filter(order => !order.printed)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(allOrders)
      };
    } catch (error) {
      console.error('Error retrieving orders:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to retrieve orders' })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};