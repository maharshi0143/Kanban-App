import { index, integer, pgTable, real, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const boards = pgTable('boards', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const columns = pgTable(
  'columns',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 256 }).notNull(),
    boardId: integer('board_id')
      .references(() => boards.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => ({
    boardIdx: index('columns_board_id_idx').on(table.boardId)
  })
);

export const cards = pgTable(
  'cards',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 256 }).notNull(),
    description: text('description'),
    position: real('position').notNull(),
    columnId: integer('column_id')
      .references(() => columns.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => ({
    columnIdx: index('cards_column_id_idx').on(table.columnId),
    positionIdx: index('cards_column_position_idx').on(table.columnId, table.position)
  })
);
