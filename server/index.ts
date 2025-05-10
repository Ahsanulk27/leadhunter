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

// Load environment variables
dotenv.config();

// Create Express application
const app: Express = express();
const PORT = process.env.PORT || 5000;

// Parse JSON body
app.use(express.json());

// Use URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Unlocked Root Route - No Upgrade Required Blocking
app.get('/', (req, res) => {
  res.send(`
    <h1>NexLead Hunter is Live</h1>
    <p>Try the scraping API at <code>/scrape?query=Plumber&location=New York</code></p>
  `);
});

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
    
    // Setup Vite development environment
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔍 NexLead Hunter is now ready to find business leads`);
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