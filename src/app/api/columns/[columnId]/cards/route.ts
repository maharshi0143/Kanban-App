import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { getDb } from '@/db/client';
import { cards } from '@/db/schema';
import { emitBoardEvent } from '@/lib/socket-emitter';
import { getBoardIdForColumn } from '@/lib/board-repo';
import { createCardSchema } from '@/lib/validation';

const paramsSchema = z.object({ columnId: z.coerce.number().int().positive() });

export async function POST(request: Request, context: { params: Promise<{ columnId: string }> }): Promise<NextResponse> {
  try {
    const params = await context.params;
    const { columnId } = paramsSchema.parse(params);
    const payload = createCardSchema.parse(await request.json());

    const boardId = await getBoardIdForColumn(columnId);
    if (!boardId) {
      return NextResponse.json({ message: 'Column not found.' }, { status: 404 });
    }

    const db = getDb();

    let position = payload.position;
    if (position === undefined) {
      const [lastCard] = await db
        .select({ position: cards.position })
        .from(cards)
        .where(eq(cards.columnId, columnId))
        .orderBy(desc(cards.position))
        .limit(1);

      position = (lastCard?.position ?? 0) + 1;
    }

    const [createdCard] = await db
      .insert(cards)
      .values({
        title: payload.title,
        description: payload.description ?? null,
        columnId,
        position
      })
      .returning();

    await emitBoardEvent({
      boardId,
      event: 'card:created',
      payload: {
        id: createdCard.id,
        title: createdCard.title,
        description: createdCard.description,
        position: createdCard.position,
        columnId: createdCard.columnId
      }
    });

    return NextResponse.json(
      {
        id: createdCard.id,
        title: createdCard.title,
        description: createdCard.description,
        position: createdCard.position,
        columnId: createdCard.columnId
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/columns/:columnId/cards failed', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid request payload.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
