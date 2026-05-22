import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { getDb } from '@/db/client';
import { cards } from '@/db/schema';
import { emitBoardEvent } from '@/lib/socket-emitter';
import { computeFractionalPosition, getBoardIdForCard, getBoardIdForColumn } from '@/lib/board-repo';
import { moveCardSchema } from '@/lib/validation';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const params = await context.params;
    const { id } = paramsSchema.parse(params);
    const payload = moveCardSchema.parse(await request.json());

    const boardId = await getBoardIdForCard(id);
    if (!boardId) {
      return NextResponse.json({ message: 'Card not found.' }, { status: 404 });
    }

    const targetBoardId = await getBoardIdForColumn(payload.newColumnId);
    if (!targetBoardId) {
      return NextResponse.json({ message: 'Column not found.' }, { status: 404 });
    }

    if (targetBoardId !== boardId) {
      return NextResponse.json({ message: 'Card cannot be moved to another board.' }, { status: 400 });
    }

    const db = getDb();

    const newPosition =
      payload.newPosition ??
      (await computeFractionalPosition(payload.newColumnId, payload.afterCardId, payload.beforeCardId));

    const [updatedCard] = await db
      .update(cards)
      .set({
        columnId: payload.newColumnId,
        position: newPosition
      })
      .where(eq(cards.id, id))
      .returning();

    if (!updatedCard) {
      return NextResponse.json({ message: 'Card not found.' }, { status: 404 });
    }

    await emitBoardEvent({
      boardId,
      event: 'card:moved',
      payload: {
        id: updatedCard.id,
        newColumnId: updatedCard.columnId,
        newPosition: updatedCard.position
      }
    });

    return NextResponse.json({
      id: updatedCard.id,
      title: updatedCard.title,
      description: updatedCard.description,
      position: updatedCard.position,
      columnId: updatedCard.columnId
    });
  } catch (error) {
    console.error('PATCH /api/cards/:id/move failed', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid move payload.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
