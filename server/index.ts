/**
 * Main entry point for the NexLead application
 */

import express, { Request, Response, NextFunction, Express } from 'express';
import session from 'express-session';
import path from 'path';
import { setupVite, serveStatic, log } from './vite';
import { runStartupOperations, schedulePeriodicHealthChecks } from './startup';
import scrapeRoutes from './routes/scrape-routes';
import { v4 as uuidv4 } from 'uuid';

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

// JSON body parser
app.use(express.json());

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'nexlead-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  })
);

// Register routes
app.use(scrapeRoutes);

// Simple health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Server error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    error_code: 'SERVER_ERROR',
    timestamp: new Date().toISOString(),
    request_id: uuidv4(),
    details: process.env.NODE_ENV === 'development' ? { message: err.message, stack: err.stack } : undefined
  });
});

// Setup Vite for development
async function startServer(app: Express) {
  if (process.env.NODE_ENV === 'development') {
    const server = await setupVite(app);
    
    // Run startup operations
    await runStartupOperations();
    
    // Schedule periodic health checks
    schedulePeriodicHealthChecks();
    
    return server;
  } else {
    // Serve static files in production
    serveStatic(app);
    
    const server = app.listen(port, () => {
      log(`serving on port ${port}`);
    });
    
    // Run startup operations
    await runStartupOperations();
    
    // Schedule periodic health checks
    schedulePeriodicHealthChecks();
    
    return server;
  }
}

startServer(app).catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});