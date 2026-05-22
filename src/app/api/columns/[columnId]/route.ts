import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { getDb } from '@/db/client';
import { columns } from '@/db/schema';
import { emitBoardEvent } from '@/lib/socket-emitter';
import { getBoardIdForColumn } from '@/lib/board-repo';

const paramsSchema = z.object({ columnId: z.coerce.number().int().positive() });

export async function DELETE(_: Request, context: { params: Promise<{ columnId: string }> }): Promise<NextResponse> {
  try {
    const params = await context.params;
    const { columnId } = paramsSchema.parse(params);

    const boardId = await getBoardIdForColumn(columnId);
    if (!boardId) {
      return NextResponse.json({ message: 'Column not found.' }, { status: 404 });
    }

    const db = getDb();
    const [deletedColumn] = await db
      .delete(columns)
      .where(eq(columns.id, columnId))
      .returning({ id: columns.id });

    if (!deletedColumn) {
      return NextResponse.json({ message: 'Column not found.' }, { status: 404 });
    }

    await emitBoardEvent({
      boardId,
      event: 'column:deleted',
      payload: { id: deletedColumn.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/columns/:columnId failed', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
