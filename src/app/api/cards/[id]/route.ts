import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { getDb } from '@/db/client';
import { cards } from '@/db/schema';
import { emitBoardEvent } from '@/lib/socket-emitter';
import { getBoardIdForCard } from '@/lib/board-repo';
import { updateCardSchema } from '@/lib/validation';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const params = await context.params;
    const { id } = paramsSchema.parse(params);
    const payload = updateCardSchema.parse(await request.json());

    const boardId = await getBoardIdForCard(id);
    if (!boardId) {
      return NextResponse.json({ message: 'Card not found.' }, { status: 404 });
    }

    const db = getDb();

    const [updatedCard] = await db.update(cards).set(payload).where(eq(cards.id, id)).returning();

    if (!updatedCard) {
      return NextResponse.json({ message: 'Card not found.' }, { status: 404 });
    }

    await emitBoardEvent({
      boardId,
      event: 'card:updated',
      payload: {
        id: updatedCard.id,
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {})
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
    console.error('PATCH /api/cards/:id failed', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid update payload.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const params = await context.params;
    const { id } = paramsSchema.parse(params);

    const boardId = await getBoardIdForCard(id);
    if (!boardId) {
      return NextResponse.json({ message: 'Card not found.' }, { status: 404 });
    }

    const db = getDb();
    const [deletedCard] = await db.delete(cards).where(eq(cards.id, id)).returning({ id: cards.id });

    if (!deletedCard) {
      return NextResponse.json({ message: 'Card not found.' }, { status: 404 });
    }

    await emitBoardEvent({
      boardId,
      event: 'card:deleted',
      payload: { id: deletedCard.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/cards/:id failed', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
