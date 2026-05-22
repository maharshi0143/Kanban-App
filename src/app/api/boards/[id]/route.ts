import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { getBoardById } from '@/lib/board-repo';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export async function GET(_: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const params = await context.params;
    const { id } = paramsSchema.parse(params);
    const board = await getBoardById(id);

    if (!board) {
      return NextResponse.json({ message: 'Board not found.' }, { status: 404 });
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error('GET /api/boards/:id failed', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
