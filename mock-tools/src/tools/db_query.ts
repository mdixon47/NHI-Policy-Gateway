import { Request, Response } from 'express';

export function handleDbQuery(req: Request, res: Response): void {
  const query = (req.body as Record<string, unknown>).query as string || 'SELECT 1';

  res.json({
    tool: 'db_query',
    columns: ['id', 'name', 'region', 'revenue'],
    rows: [
      { id: 1, name: 'Acme Corp', region: 'northeast', revenue: 450000 },
      { id: 2, name: 'Widget Inc', region: 'northeast', revenue: 320000 },
      { id: 3, name: 'DataFlow LLC', region: 'northeast', revenue: 280000 },
    ],
    count: 47,
    query_executed: query,
    execution_time_ms: 23,
  });
}
