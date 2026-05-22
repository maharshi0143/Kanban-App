export type Card = {
  id: number;
  title: string;
  description: string | null;
  position: number;
  columnId: number;
};

export type Column = {
  id: number;
  name: string;
  boardId: number;
  cards: Card[];
};

export type Board = {
  id: number;
  name: string;
  columns: Column[];
};
