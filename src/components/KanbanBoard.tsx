'use client';

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { type ReactElement, useEffect, useState } from 'react';
import { Board } from '@/components/Board';
import { getSocket } from '@/lib/socket-client';
import { calculatePosition, sortCards } from '@/lib/card-order';
import type { Board as BoardType, Card } from '@/lib/types';
import type { Column } from '@/lib/types';
import { useBoardStore } from '@/store/board-store';
import { CardModal } from '@/components/CardModal';

type KanbanBoardProps = {
  boardId: number;
};

type DragCardData = {
  cardId: number;
  columnId: number;
};

export function KanbanBoard({ boardId }: KanbanBoardProps): ReactElement {
  const {
    board,
    setBoard,
    addColumn,
    replaceColumn,
    removeColumn,
    clearBoardCards,
    addCard,
    removeCard,
    replaceCard,
    moveCard,
    updateCard,
    toast,
    setToast,
    clearToast
  } = useBoardStore();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    let mounted = true;

    async function loadBoard(): Promise<void> {
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) {
        setLoadError('Unable to load this board right now.');
        setToast('Failed to load board.');
        return;
      }

      const data: BoardType = await response.json();
      if (mounted) {
        setLoadError(null);
        setBoard(data);
      }
    }

    loadBoard().catch(() => {
      setLoadError('Unable to load this board right now.');
      setToast('Failed to load board.');
    });

    return () => {
      mounted = false;
    };
  }, [boardId, setBoard, setToast]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_board', boardId);

    const onCreated = (card: Card): void => addCard(card);
    const onDeleted = (payload: { id: number }): void => removeCard(payload.id);
    const onColumnCreated = (column: Column): void => addColumn(column);
    const onColumnDeleted = (payload: { id: number }): void => removeColumn(payload.id);
    const onBoardCleared = (payload: { boardId: number }): void => {
      if (payload.boardId === boardId) {
        clearBoardCards();
        setSelectedCard(null);
      }
    };
    const onMoved = (payload: { id: number; newColumnId: number; newPosition: number }): void =>
      moveCard(payload.id, payload.newColumnId, payload.newPosition);
    const onUpdated = (payload: { id: number; title?: string; description?: string | null }): void =>
      updateCard(payload.id, payload);

    socket.on('card:created', onCreated);
    socket.on('card:deleted', onDeleted);
    socket.on('column:created', onColumnCreated);
    socket.on('column:deleted', onColumnDeleted);
    socket.on('board:cleared', onBoardCleared);
    socket.on('card:moved', onMoved);
    socket.on('card:updated', onUpdated);

    return () => {
      socket.emit('leave_board', boardId);
      socket.off('card:created', onCreated);
      socket.off('card:deleted', onDeleted);
      socket.off('column:created', onColumnCreated);
      socket.off('column:deleted', onColumnDeleted);
      socket.off('board:cleared', onBoardCleared);
      socket.off('card:moved', onMoved);
      socket.off('card:updated', onUpdated);
    };
  }, [addCard, addColumn, boardId, clearBoardCards, moveCard, removeCard, removeColumn, updateCard]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => clearToast(), 3000);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  async function onDragEnd(event: DragEndEvent): Promise<void> {
    if (!board) {
      return;
    }

    const activeData = event.active.data.current as DragCardData | undefined;
    if (!activeData) {
      return;
    }

    let targetColumnId = activeData.columnId;
    let targetIndex = Number.MAX_SAFE_INTEGER;

    if (typeof event.over?.id === 'string' && event.over.id.startsWith('column-')) {
      targetColumnId = Number(event.over.id.replace('column-', ''));
      const targetColumn = board.columns.find((column) => column.id === targetColumnId);
      targetIndex = targetColumn ? targetColumn.cards.length : 0;
    } else if (typeof event.over?.id === 'string' && event.over.id.startsWith('card-')) {
      const overCardId = Number(event.over.id.replace('card-', ''));
      const overColumn = board.columns.find((column) => column.cards.some((card) => card.id === overCardId));
      if (overColumn) {
        targetColumnId = overColumn.id;
        targetIndex = sortCards(overColumn.cards).findIndex((card) => card.id === overCardId);
      }
    }

    const destinationColumn = board.columns.find((column) => column.id === targetColumnId);
    if (!destinationColumn) {
      return;
    }

    const movingCardId = activeData.cardId;
    const sourceColumn = board.columns.find((column) => column.id === activeData.columnId);
    if (!sourceColumn) {
      return;
    }

    if (sourceColumn.id === destinationColumn.id && typeof event.over?.id === 'string' && event.over.id === event.active.id) {
      return;
    }

    const destinationCards = sortCards(destinationColumn.cards).filter((card) => card.id !== movingCardId);
    const newPosition = calculatePosition(destinationCards, targetIndex);
    const snapshot = JSON.parse(JSON.stringify(board)) as BoardType;

    moveCard(movingCardId, targetColumnId, newPosition);

    try {
      const response = await fetch(`/api/cards/${movingCardId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newColumnId: targetColumnId, newPosition })
      });

      if (!response.ok) {
        throw new Error('Move failed');
      }
    } catch (error) {
      console.error(error);
      setBoard(snapshot);
      setToast('Card move failed. Changes were rolled back.');
    }
  }

  async function handleCardUpdate(title: string, description: string | null): Promise<void> {
    if (!selectedCard) {
      return;
    }

    const previous = board ? (JSON.parse(JSON.stringify(board)) as BoardType) : null;
    updateCard(selectedCard.id, { title, description });

    try {
      const response = await fetch(`/api/cards/${selectedCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error(error);
      if (previous) {
        setBoard(previous);
      }
      setToast('Card update failed. Changes were rolled back.');
    }
  }

  async function handleCreateCard(columnId: number, title: string, description: string | null): Promise<void> {
    if (!board) {
      return;
    }

    const snapshot = JSON.parse(JSON.stringify(board)) as BoardType;
    const targetColumn = board.columns.find((column) => column.id === columnId);
    const sortedCards = targetColumn ? sortCards(targetColumn.cards) : [];
    const nextPosition = sortedCards.length === 0 ? 1 : sortedCards[sortedCards.length - 1].position + 1;
    const tempId = -Date.now();

    addCard({
      id: tempId,
      title,
      description,
      position: nextPosition,
      columnId
    });

    try {
      const response = await fetch(`/api/columns/${columnId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, position: nextPosition })
      });

      if (!response.ok) {
        throw new Error('Create failed');
      }

      const created: Card = await response.json();
      replaceCard(tempId, created);
    } catch (error) {
      console.error(error);
      removeCard(tempId);
      setBoard(snapshot);
      setToast('Card creation failed. Changes were rolled back.');
    }
  }

  async function handleDeleteCard(card: Card): Promise<void> {
    if (!board) {
      return;
    }

    const confirmed = window.confirm(`Delete card "${card.title}"?`);
    if (!confirmed) {
      return;
    }

    const snapshot = JSON.parse(JSON.stringify(board)) as BoardType;
    removeCard(card.id);
    if (selectedCard?.id === card.id) {
      setSelectedCard(null);
    }

    try {
      const response = await fetch(`/api/cards/${card.id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Delete card failed');
      }
    } catch (error) {
      console.error(error);
      setBoard(snapshot);
      setToast('Card deletion failed. Changes were rolled back.');
    }
  }

  async function handleDeleteColumn(column: Column): Promise<void> {
    if (!board) {
      return;
    }

    const confirmed = window.confirm(`Delete column "${column.name}" and all its cards?`);
    if (!confirmed) {
      return;
    }

    const snapshot = JSON.parse(JSON.stringify(board)) as BoardType;
    removeColumn(column.id);
    if (selectedCard && selectedCard.columnId === column.id) {
      setSelectedCard(null);
    }

    try {
      const response = await fetch(`/api/columns/${column.id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Delete column failed');
      }
    } catch (error) {
      console.error(error);
      setBoard(snapshot);
      setToast('Column deletion failed. Changes were rolled back.');
    }
  }

  async function handleAddColumn(): Promise<void> {
    if (!board) {
      return;
    }

    const name = window.prompt('Column name', 'New Column')?.trim();
    if (!name) {
      return;
    }

    const snapshot = JSON.parse(JSON.stringify(board)) as BoardType;
    const tempId = -Date.now();
    addColumn({ id: tempId, name, boardId: board.id, cards: [] });

    try {
      const response = await fetch(`/api/boards/${board.id}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        throw new Error('Create column failed');
      }

      const createdColumn: Column = await response.json();
      replaceColumn(tempId, createdColumn);
    } catch (error) {
      console.error(error);
      setBoard(snapshot);
      setToast('Column creation failed. Changes were rolled back.');
    }
  }

  async function handleClearBoard(): Promise<void> {
    if (!board) {
      return;
    }

    const confirmed = window.confirm('Clear all cards from this board?');
    if (!confirmed) {
      return;
    }

    const snapshot = JSON.parse(JSON.stringify(board)) as BoardType;
    clearBoardCards();
    setSelectedCard(null);

    try {
      const response = await fetch(`/api/boards/${board.id}/cards`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Clear board failed');
      }
    } catch (error) {
      console.error(error);
      setBoard(snapshot);
      setToast('Clear board failed. Changes were rolled back.');
    }
  }

  if (loadError) {
    return <p className="loading">{loadError}</p>;
  }

  if (!board) {
    return <p className="loading">Loading board...</p>;
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <Board
          name={board.name}
          columns={board.columns}
          selectedCardId={selectedCard?.id ?? null}
          onSelectCard={setSelectedCard}
          onEditCard={setSelectedCard}
          onDeleteCard={handleDeleteCard}
          onDeleteColumn={handleDeleteColumn}
          onCreateCard={handleCreateCard}
          onAddColumn={handleAddColumn}
          onClearBoard={handleClearBoard}
        />
      </DndContext>
      {toast ? <div className="toast">{toast}</div> : null}
      {selectedCard ? (
        <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} onSaved={handleCardUpdate} />
      ) : null}
    </>
  );
}
