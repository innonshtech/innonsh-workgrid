// src/instrumentation.js
// This file runs once when the server starts (Next.js 15+)

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const dns = await import('dns');
      const servers = dns.getServers();
      if (servers.includes('127.0.0.1') || servers.includes('::1') || servers.length === 0) {
        dns.setServers(['8.8.8.8', '8.8.4.4']);
        console.log('🔧 Local DNS detected. Fallback DNS servers set to Google DNS (8.8.8.8, 8.8.4.4) globally');
      }
    } catch (e) {
      console.warn('⚠️ Could not configure DNS fallback:', e);
    }

    const { initializeCronJobs } = await import('./lib/cron/init');
    initializeCronJobs();
  }
}