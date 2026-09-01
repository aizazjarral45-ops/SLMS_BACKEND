const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SLMS API',
      version: '1.0.0',
      description: 'Student Life Management System API documentation',
    },
    servers: [{ url: '/api' }],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

module.exports = swaggerJsdoc(options);
