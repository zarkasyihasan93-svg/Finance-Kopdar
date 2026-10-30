// Shared adapter used by explicit Vercel Functions. Keeping this outside the
// api directory prevents Vercel from publishing the adapter as its own route.
let appPromise: Promise<any> | undefined;

export default async function vercelExpressHandler(request: any, response: any) {
  try {
    appPromise ??= import('./backendApp.js').then((module) => module.default);
    const app = await appPromise;
    return app(request, response);
  } catch (error: any) {
    console.error('[API INIT] Failed to load Express app:', error);
    return response.status(500).json({
      success: false,
      error: 'Backend Telegram gagal dimuat di Vercel.',
      detail: error?.message || String(error),
    });
  }
}
