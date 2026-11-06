import { Request, Response } from 'express';
import { searchService } from './search.service.js';

export const searchEmails = async (req: Request, res: Response) => {
  const user = req.user as any;
  const q = req.query.q ? String(req.query.q) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;
  const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

  const results = await searchService.searchEmails({
    userId: user.id,
    q,
    status,
    page: isNaN(page) ? 1 : page,
    limit: isNaN(limit) ? 20 : limit,
  });

  res.status(200).json({
    success: true,
    ...results,
  });
};

