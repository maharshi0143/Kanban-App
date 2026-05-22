CREATE TABLE IF NOT EXISTS boards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(256) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS columns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(256) NOT NULL,
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  title VARCHAR(256) NOT NULL,
  description TEXT,
  position REAL NOT NULL,
  column_id INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS columns_board_id_idx ON columns(board_id);
CREATE INDEX IF NOT EXISTS cards_column_id_idx ON cards(column_id);
CREATE INDEX IF NOT EXISTS cards_column_position_idx ON cards(column_id, position);

INSERT INTO boards (id, name)
VALUES (1, 'Pheonix Board')
ON CONFLICT (id) DO NOTHING;

INSERT INTO columns (id, name, board_id)
VALUES
  (1, 'To Do', 1),
  (2, 'In Progress', 1),
  (3, 'Done', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO cards (id, title, description, position, column_id)
VALUES
  (1, 'Setup project repository', 'Initialize git, create README', 1.0, 1),
  (2, 'Define database schema', NULL, 2.0, 1),
  (3, 'Implement websocket transport', 'Create board room support and event fanout', 1.0, 2),
  (4, 'Ship first milestone', 'Validate all acceptance criteria', 1.0, 3)
ON CONFLICT (id) DO NOTHING;

SELECT setval('boards_id_seq', COALESCE((SELECT MAX(id) FROM boards), 1), true);
SELECT setval('columns_id_seq', COALESCE((SELECT MAX(id) FROM columns), 1), true);
SELECT setval('cards_id_seq', COALESCE((SELECT MAX(id) FROM cards), 1), true);
