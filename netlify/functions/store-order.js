// Order storage using environment variables for persistence
// Since Netlify functions are stateless, we use environment variables as simple storage

function loadOrders() {
  try {
    const ordersData = process.env.STORED_ORDERS;
    if (ordersData) {
      return JSON.parse(ordersData);
    }
  } catch (error) {
    console.error('Error loading orders from env:', error);
  }
  return [];
}

// For now, we'll store orders in memory and return them immediately
// This is a simple fix - in production you'd use a database
let inMemoryOrders = [];

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
      
      // Store in memory for immediate retrieval
      inMemoryOrders.push(orderData);
      
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
      // Return all unprinted orders from memory
      const unprintedOrders = inMemoryOrders
        .filter(order => !order.printed)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      console.log(`Returning ${unprintedOrders.length} unprinted orders from ${inMemoryOrders.length} total orders`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(unprintedOrders)
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