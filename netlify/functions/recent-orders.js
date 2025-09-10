// Simple recent orders endpoint for print server
// Returns orders from the last hour that need printing

// Use global variable to persist across function calls in same container
global.orderStorage = global.orderStorage || [];

exports.handler = async (event, context) => {
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
      const orderId = order.paymentId || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add order with timestamp
      const orderData = {
        id: orderId,
        ...order,
        timestamp: new Date().toISOString(),
        printed: false
      };
      
      global.orderStorage.push(orderData);
      
      // Keep only orders from last 2 hours to prevent memory issues
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      global.orderStorage = global.orderStorage.filter(o => new Date(o.timestamp) > twoHoursAgo);
      
      console.log('Order added:', orderId, 'Total orders:', global.orderStorage.length);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, orderId, totalOrders: global.orderStorage.length })
      };
    } catch (error) {
      console.error('Error adding order:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to add order' })
      };
    }
  }

  if (event.httpMethod === 'GET') {
    try {
      // Return unprinted orders from last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const unprintedOrders = global.orderStorage
        .filter(order => !order.printed && new Date(order.timestamp) > oneHourAgo)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      console.log(`GET request: returning ${unprintedOrders.length} unprinted orders from ${global.orderStorage.length} total`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(unprintedOrders)
      };
    } catch (error) {
      console.error('Error getting orders:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to get orders', orders: [] })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};