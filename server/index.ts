/**
 * Main entry point for the NexLead application
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { searchController } from './controllers/search-controller';
import { runStartupOperations, schedulePeriodicHealthChecks } from './startup';
import { SearchParams } from './models/business-data';
import { setupVite, serveStatic, log } from './vite';
import http from 'http';
import { registerRoutes } from './routes';
import { registerBulkLeadRoutes } from './routes/bulk-leads';
import { registerDirectDownloadRoutes } from './routes/direct-download';
import { registerB2CRoutes } from './routes/b2c-routes';
import { registerVerificationRoutes } from './routes/verification-routes';
import { GooglePlacesService } from './api/google-places-service';

// Load environment variables
dotenv.config();

// Create Express application
const app: Express = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Parse JSON body
app.use(express.json());

// Use URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Root route will now be handled by the React frontend after Vite setup

// API Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Scraping Endpoint
app.get('/scrape', async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string;
    const location = req.query.location as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!query) {
      return res.status(400).json({
        error: 'Query parameter is required',
        error_code: 'MISSING_QUERY',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`📊 API Request: Scraping for "${query}" in ${location || 'any location'}`);
    
    const searchParams: SearchParams = {
      query,
      location,
      page,
      limit
    };
    
    const result = await searchController.searchBusinessData(searchParams);
    
    return res.json(result);
  } catch (error) {
    console.error('Error handling scrape request:', error);
    
    return res.status(500).json({
      error: 'An unexpected error occurred',
      error_code: 'SERVER_ERROR',
      timestamp: new Date().toISOString(),
      details: {
        message: (error as Error).message
      }
    });
  }
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'An unexpected error occurred',
    error_code: 'SERVER_ERROR',
    timestamp: new Date().toISOString(),
    details: {
      message: err.message
    }
  });
});

async function startServer(app: Express) {
  try {
    // Run startup operations (health checks, API key validation, etc.)
    await runStartupOperations();
    
    // Schedule periodic health checks
    schedulePeriodicHealthChecks();
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Create Google Places service for bulk lead generation
    const googlePlacesService = new GooglePlacesService();
    
    // Register standard API routes
    await registerRoutes(app);
    
    // Register bulk lead generation routes
    registerBulkLeadRoutes(app, googlePlacesService);
    
    // Register direct download routes for CSV exports on mobile
    registerDirectDownloadRoutes(app);
    
    // Register B2C lead generation routes
    registerB2CRoutes(app);
    
    // Register verification routes
    registerVerificationRoutes(app);
    
    // Clean up routes to avoid conflicts
    if (app._router && app._router.stack) {
      app._router.stack = app._router.stack.filter((layer: any) => {
        return !(layer.route && layer.route.path === '/');
      });
    }
    
    // Setup Vite for development or static serving for production
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, server);
    } else {
      // For production, serve the React build
      serveStatic(app);
    }
    
    // Add a fallback route handler for all routes not caught
    // This ensures all React routes work via history API
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/scrape')) {
        return next();
      }
      
      if (process.env.NODE_ENV === 'development') {
        // In development, the Vite middleware will handle this
        next();
      } else {
        // In production, serve the index.html
        res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
      }
    });
    
    // Start the server with better error handling
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔍 NexLead Hunter is now ready to find business leads`);
    }).on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        console.error(`⚠️ Port ${PORT} is already in use. Please free up the port and try again.`);
        process.exit(1);
      } else {
        console.error('Failed to start server:', e);
        process.exit(1);
      }
    });
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server immediately
startServer(app).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app, startServer };