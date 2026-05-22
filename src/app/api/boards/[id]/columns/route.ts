import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { getDb } from '@/db/client';
import { boards, columns } from '@/db/schema';
import { emitBoardEvent } from '@/lib/socket-emitter';
import { createColumnSchema } from '@/lib/validation';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const params = await context.params;
    const { id: boardId } = paramsSchema.parse(params);
    const payload = createColumnSchema.parse(await request.json());

    const db = getDb();

    const [board] = await db.select({ id: boards.id }).from(boards).where(eq(boards.id, boardId)).limit(1);
    if (!board) {
      return NextResponse.json({ message: 'Board not found.' }, { status: 404 });
    }

    const [createdColumn] = await db
      .insert(columns)
      .values({
        name: payload.name,
        boardId
      })
      .returning();

    await emitBoardEvent({
      boardId,
      event: 'column:created',
      payload: {
        id: createdColumn.id,
        name: createdColumn.name,
        boardId: createdColumn.boardId,
        cards: []
      }
    });

    return NextResponse.json(
      {
        id: createdColumn.id,
        name: createdColumn.name,
        boardId: createdColumn.boardId,
        cards: []
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/boards/:id/columns failed', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid column payload.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
