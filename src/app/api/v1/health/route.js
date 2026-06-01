import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import mongoose from 'mongoose';
import { ApiResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  
  try {
    await dbConnect();
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    const state = mongoose.connection.readyState;
    if (state === 1) dbStatus = 'connected';
    else if (state === 2) dbStatus = 'connecting';
  } catch (error) {
    console.error('Health check DB error:', error);
    dbStatus = 'error';
  }

  const responseTime = Date.now() - startTime;
  const isHealthy = dbStatus === 'connected';
  const status = isHealthy ? 200 : 503;

  return ApiResponse.success({
    status: isHealthy ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStatus,
    responseTime: `${responseTime}ms`,
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV,
  }, status);
}
