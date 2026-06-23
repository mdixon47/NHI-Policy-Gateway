import { Request, Response } from 'express';

export function handleApiCall(req: Request, res: Response): void {
  const url = (req.body as Record<string, unknown>).url as string || 'https://api.example.com';
  const method = (req.body as Record<string, unknown>).method as string || 'GET';

  res.json({
    tool: 'api_call',
    status: 200,
    body: {
      transactions: [
        { id: 'txn-001', amount: 2500.00, currency: 'USD', status: 'completed' },
        { id: 'txn-002', amount: 1800.50, currency: 'USD', status: 'pending' },
        { id: 'txn-003', amount: 975.00, currency: 'USD', status: 'completed' },
      ],
      total_count: 156,
      page: 1,
    },
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'req-mock-abc123',
    },
    request: { url, method },
  });
}
