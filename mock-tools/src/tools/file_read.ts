import { Request, Response } from 'express';

export function handleFileRead(req: Request, res: Response): void {
  const filePath = (req.body as Record<string, unknown>).path as string || '/data/unknown';

  res.json({
    tool: 'file_read',
    content: `date,revenue,region\n2026-04-01,1250000,northeast\n2026-04-01,980000,southeast\n2026-04-01,1100000,west\n2026-04-01,870000,midwest`,
    metadata: {
      path: filePath,
      size_bytes: 184,
      last_modified: '2026-06-15T14:30:00Z',
      mime_type: 'text/csv',
    },
  });
}
