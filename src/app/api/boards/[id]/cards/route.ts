import { eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { getDb } from '@/db/client';
import { boards, cards, columns } from '@/db/schema';
import { emitBoardEvent } from '@/lib/socket-emitter';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const params = await context.params;
    const { id: boardId } = paramsSchema.parse(params);

    const db = getDb();
    const [board] = await db.select({ id: boards.id }).from(boards).where(eq(boards.id, boardId)).limit(1);

    if (!board) {
      return NextResponse.json({ message: 'Board not found.' }, { status: 404 });
    }

    const boardColumns = await db.select({ id: columns.id }).from(columns).where(eq(columns.boardId, boardId));
    const columnIds = boardColumns.map((column) => column.id);

    if (columnIds.length) {
      await db.delete(cards).where(inArray(cards.columnId, columnIds));
    }

    await emitBoardEvent({
      boardId,
      event: 'board:cleared',
      payload: { boardId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/boards/:id/cards failed', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
