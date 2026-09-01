const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const indexRoutes = require('./routes');

const app = express();

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
].filter(Boolean));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
}));
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.MAX_REQUESTS_PER_WINDOW || 200),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limit);

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'SLMS backend is healthy', data: { status: 'ok' } });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', indexRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
