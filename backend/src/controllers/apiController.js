import { HTTP_STATUS } from '../utils/constants.js';

// Mock product catalog data for testing API throughput and rate limits
const MOCK_PRODUCTS = [
  { id: '1', name: 'High-Performance Cloud Server', category: 'Compute', price: 149.99, stock: 45, description: 'Dedicated cloud computing node with 8 vCPUs and 32GB RAM.' },
  { id: '2', name: 'Distributed In-Memory Cache', category: 'Database', price: 89.99, stock: 120, description: 'Ultra-low latency key-value storage cluster powered by Redis.' },
  { id: '3', name: 'Managed Document Database', category: 'Database', price: 119.99, stock: 80, description: 'Scalable NoSQL document store with automated sharding.' },
  { id: '4', name: 'API Gateway & Load Balancer', category: 'Networking', price: 59.99, stock: 200, description: 'Layer 7 reverse proxy with rate limiting and TLS termination.' },
  { id: '5', name: 'Real-Time Analytics Engine', category: 'Analytics', price: 199.99, stock: 30, description: 'High-throughput stream processing engine for event auditing.' },
  { id: '6', name: 'Edge CDN Acceleration', category: 'Networking', price: 49.99, stock: 350, description: 'Global content delivery network with sub-20ms edge latency.' },
];

// Returns catalog of mock products
export const getProducts = (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      total: MOCK_PRODUCTS.length,
      products: MOCK_PRODUCTS,
    },
  });
};

// Returns a single product by ID
export const getProductById = (req, res) => {
  const { id } = req.params;
  const product = MOCK_PRODUCTS.find((p) => p.id === id);

  if (!product) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: `Product with ID '${id}' not found.`,
    });
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { product },
  });
};
