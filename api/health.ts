// Independent health check: deliberately has no application imports so it can
// distinguish a Vercel runtime/routing issue from an Express startup failure.
export default function handler(_request: any, response: any) {
  return response.status(200).json({
    status: 'ok',
    runtime: 'vercel-function',
  });
}
