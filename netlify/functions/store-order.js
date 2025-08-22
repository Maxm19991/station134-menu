// Simple order storage using Netlify Functions
// This stores orders in a way that can be retrieved by the print server

const fs = require('fs');
const path = require('path');

// Use file-based storage since Netlify functions are stateless
const ORDERS_FILE = '/tmp/orders.json';

function loadOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading orders:', error);
  }
  return [];
}

function saveOrders(orders) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error saving orders:', error);
  }
}

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
      
      // Load existing orders and add new one
      const orders = loadOrders();
      orders.push(orderData);
      saveOrders(orders);
      
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
      const orders = loadOrders();
      const unprintedOrders = orders
        .filter(order => !order.printed)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      console.log(`Returning ${unprintedOrders.length} unprinted orders`);
      
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