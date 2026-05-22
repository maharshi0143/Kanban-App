'use client';

import { create } from 'zustand';
import type { Board, Card } from '@/lib/types';
import type { Column } from '@/lib/types';

type BoardStore = {
  board: Board | null;
  toast: string | null;
  setBoard: (board: Board) => void;
  clearToast: () => void;
  setToast: (message: string | null) => void;
  addColumn: (column: Column) => void;
  replaceColumn: (tempColumnId: number, column: Column) => void;
  removeColumn: (columnId: number) => void;
  clearBoardCards: () => void;
  addCard: (card: Card) => void;
  removeCard: (cardId: number) => void;
  replaceCard: (tempCardId: number, card: Card) => void;
  moveCard: (cardId: number, newColumnId: number, newPosition: number) => void;
  updateCard: (cardId: number, patch: Partial<Pick<Card, 'title' | 'description'>>) => void;
};

function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => (a.position === b.position ? a.id - b.id : a.position - b.position));
}

export const useBoardStore = create<BoardStore>((set) => ({
  board: null,
  toast: null,
  setBoard: (board) => set({ board }),
  clearToast: () => set({ toast: null }),
  setToast: (message) => set({ toast: message }),
  addColumn: (column) =>
    set((state) => {
      if (!state.board) {
        return state;
      }

      const withoutExisting = state.board.columns.filter((existingColumn) => existingColumn.id !== column.id);
      return { board: { ...state.board, columns: [...withoutExisting, column] } };
    }),
  replaceColumn: (tempColumnId, column) =>
    set((state) => {
      if (!state.board) {
        return state;
      }

      const replacedColumns = state.board.columns.map((existingColumn) =>
        existingColumn.id === tempColumnId ? column : existingColumn
      );

      const hasTemp = state.board.columns.some((existingColumn) => existingColumn.id === tempColumnId);
      if (!hasTemp) {
        const withoutExisting = state.board.columns.filter((existingColumn) => existingColumn.id !== column.id);
        return { board: { ...state.board, columns: [...withoutExisting, column] } };
      }

      const seen = new Set<number>();
      const columns = replacedColumns.filter((existingColumn) => {
        if (seen.has(existingColumn.id)) {
          return false;
        }

        seen.add(existingColumn.id);
        return true;
      });

      return { board: { ...state.board, columns } };
    }),
  removeColumn: (columnId) =>
    set((state) => {
      if (!state.board) {
        return state;
      }

      const columns = state.board.columns.filter((column) => column.id !== columnId);
      return { board: { ...state.board, columns } };
    }),
  clearBoardCards: () =>
    set((state) => {
      if (!state.board) {
        return state;
      }

      const columns = state.board.columns.map((column) => ({ ...column, cards: [] }));
      return { board: { ...state.board, columns } };
    }),
  addCard: (card) =>
    set((state) => {
      if (!state.board) {
        return state;
      }

      const existingColumnId = state.board.columns.find((column) =>
        column.cards.some((existingCard) => existingCard.id === card.id)
      )?.id;

      const columns = state.board.columns.map((column) => {
        if (column.id === existingColumnId && column.id !== card.columnId) {
          return { ...column, cards: column.cards.filter((existingCard) => existingCard.id !== card.id) };
        }

        if (column.id !== card.columnId) {
          return column;
        }

        const withoutExisting = column.cards.filter((existingCard) => existingCard.id !== card.id);
        return { ...column, cards: sortCards([...withoutExisting, card]) };
      });

      return { board: { ...state.board, columns } };
    }),
  removeCard: (cardId) =>
    set((state) => {
      if (!state.board) {
        return state;
      }

      const columns = state.board.columns.map((column) => ({
        ...column,
        cards: column.cards.filter((card) => card.id !== cardId)
      }));

      return { board: { ...state.board, columns } };
    }),
  replaceCard: (tempCardId, card) =>
    set((state) => {
      if (!state.board) {
        return state;
      }

      let removed = false;
      const columnsWithoutTemp = state.board.columns.map((column) => {
        const hasTemp = column.cards.some((existingCard) => existingCard.id === tempCardId);
        if (!hasTemp) {
          return column;
        }

        removed = true;
        return { ...column, cards: column.cards.filter((existingCard) => existingCard.id !== tempCardId) };
      });

      const existingColumnId = columnsWithoutTemp.find((column) =>
        column.cards.some((existingCard) => existingCard.id === card.id)
      )?.id;

      const columns = columnsWithoutTemp.map((column) => {
        if (column.id === existingColumnId && column.id !== card.columnId) {
          return { ...column, cards: column.cards.filter((existingCard) => existingCard.id !== card.id) };
        }

        if (column.id !== card.columnId) {
          return column;
        }

        const withoutExisting = column.cards.filter((existingCard) => existingCard.id !== card.id);
        return { ...column, cards: sortCards([...withoutExisting, card]) };
      });

      if (!removed && !existingColumnId) {
        return state;
      }

      return { board: { ...state.board, columns } };
    }),
  moveCard: (cardId, newColumnId, newPosition) =>
    set((state) => {
      if (!state.board) {
        return state;
      }

      let movingCard: Card | null = null;

      const columns = state.board.columns.map((column) => {
        const exists = column.cards.find((card) => card.id === cardId);
        if (!exists) {
          return column;
        }

        movingCard = { ...exists, columnId: newColumnId, position: newPosition };
        return { ...column, cards: column.cards.filter((card) => card.id !== cardId) };
      });

      if (!movingCard) {
        return state;
      }

      const nextColumns = columns.map((column) =>
        column.id === newColumnId
          ? { ...column, cards: sortCards([...column.cards, movingCard as Card]) }
          : column
      );

      return { board: { ...state.board, columns: nextColumns } };
    }),
  updateCard: (cardId, patch) =>
    set((state) => {
      if (!state.board) {
        return state;
      }

      const columns = state.board.columns.map((column) => ({
        ...column,
        cards: column.cards.map((card) => (card.id === cardId ? { ...card, ...patch } : card))
      }));

      return { board: { ...state.board, columns } };
    })
}));
