import { asc, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { boards, cards, columns } from '@/db/schema';
import type { Board, Card, Column } from '@/lib/types';

export async function getBoardById(boardId: number): Promise<Board | null> {
  const db = getDb();
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1);

  if (!board) {
    return null;
  }

  const boardColumns = await db
    .select()
    .from(columns)
    .where(eq(columns.boardId, boardId))
    .orderBy(asc(columns.id));

  const columnIds = boardColumns.map((column) => column.id);

  const boardCards = columnIds.length
    ? await db.select().from(cards).where(inArray(cards.columnId, columnIds)).orderBy(asc(cards.position), asc(cards.id))
    : [];

  const cardsByColumn = new Map<number, Card[]>();

  for (const card of boardCards) {
    const list = cardsByColumn.get(card.columnId) ?? [];
    list.push({
      id: card.id,
      title: card.title,
      description: card.description,
      position: card.position,
      columnId: card.columnId
    });
    cardsByColumn.set(card.columnId, list);
  }

  const hydratedColumns: Column[] = boardColumns.map((column) => ({
    id: column.id,
    name: column.name,
    boardId: column.boardId,
    cards: cardsByColumn.get(column.id) ?? []
  }));

  return {
    id: board.id,
    name: board.name,
    columns: hydratedColumns
  };
}

export async function getBoardIdForCard(cardId: number): Promise<number | null> {
  const db = getDb();
  const result = await db
    .select({ boardId: columns.boardId })
    .from(cards)
    .innerJoin(columns, eq(cards.columnId, columns.id))
    .where(eq(cards.id, cardId))
    .limit(1);

  return result[0]?.boardId ?? null;
}

export async function getBoardIdForColumn(columnId: number): Promise<number | null> {
  const db = getDb();
  const result = await db
    .select({ boardId: columns.boardId })
    .from(columns)
    .where(eq(columns.id, columnId))
    .limit(1);

  return result[0]?.boardId ?? null;
}

export async function computeFractionalPosition(
  targetColumnId: number,
  afterCardId?: number | null,
  beforeCardId?: number | null
): Promise<number> {
  const db = getDb();
  if (afterCardId && beforeCardId) {
    const neighbors = await db
      .select({ id: cards.id, position: cards.position, columnId: cards.columnId })
      .from(cards)
      .where(inArray(cards.id, [afterCardId, beforeCardId]));

    const after = neighbors.find((card) => card.id === afterCardId);
    const before = neighbors.find((card) => card.id === beforeCardId);

    if (after && before && after.columnId === targetColumnId && before.columnId === targetColumnId) {
      return (after.position + before.position) / 2;
    }
  }

  if (beforeCardId) {
    const [before] = await db.select({ position: cards.position, columnId: cards.columnId }).from(cards).where(eq(cards.id, beforeCardId)).limit(1);

    if (before && before.columnId === targetColumnId) {
      return before.position / 2;
    }
  }

  if (afterCardId) {
    const [after] = await db.select({ position: cards.position, columnId: cards.columnId }).from(cards).where(eq(cards.id, afterCardId)).limit(1);

    if (after && after.columnId === targetColumnId) {
      return after.position + 1;
    }
  }

  const [lastCard] = await db
    .select({ position: cards.position })
    .from(cards)
    .where(eq(cards.columnId, targetColumnId))
    .orderBy(desc(cards.position))
    .limit(1);

  if (!lastCard) {
    return 1;
  }

  return lastCard.position + 1;
}
