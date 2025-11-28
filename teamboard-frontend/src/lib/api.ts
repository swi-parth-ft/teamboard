// src/lib/api.ts

const API_BASE = 'http://127.0.0.1:8001/api';

// ---- Types that match your Laravel API ----

export type Workspace = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Card = {
  id: number;
  board_list_id: number;
  title: string;
  description: string | null;
  position: number;
  due_date: string | null;
  assignee_email: string | null;
  created_at: string;
  updated_at: string;
};

export type BoardList = {
  id: number;
  board_id: number;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
  // always treat as array in the UI
  cards: Card[];
};

export type Board = {
  id: number;
  workspace_id: number;
  name: string;
  created_at: string;
  updated_at: string;
  // present when we call /boards/:id
  lists?: BoardList[];
};

// ---- Simple HTTP helper ----

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('API error', res.status, text);
    throw new Error(`GET ${path} failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// Small helper for write operations
async function send<T>(
  path: string,
  options: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('API error', res.status, text);
    throw new Error(`${options.method ?? 'POST'} ${path} failed: ${res.status}`);
  }

  if (res.status === 204) {
    // no content
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ---- READ API ----

// GET /api/workspaces
export function fetchWorkspaces(): Promise<Workspace[]> {
  return get<Workspace[]>('/workspaces');
}

// GET /api/workspaces/:workspace/boards
export function fetchWorkspaceBoards(workspaceId: number): Promise<Board[]> {
  return get<Board[]>(`/workspaces/${workspaceId}/boards`);
}

// GET /api/boards/:board  (with lists + cards)
export function fetchBoard(boardId: number): Promise<Board> {
  return get<Board>(`/boards/${boardId}`);
}

// ---- WRITE API ----

// POST /api/boards/:board/lists
export async function createList(
  boardId: number,
  name: string
): Promise<BoardList> {
  const list = await send<BoardList>(`/boards/${boardId}/lists`, {
    method: 'POST',
    body: JSON.stringify({ name })
  });

  // backend doesn't include cards, ensure it's an array
  return { ...list, cards: list.cards ?? [] };
}

// POST /api/lists/:list/cards
export function createCard(
  listId: number,
  title: string,
  description: string | null
): Promise<Card> {
  return send<Card>(`/lists/${listId}/cards`, {
    method: 'POST',
    body: JSON.stringify({ title, description })
  });
}

// DELETE /api/cards/:card
export async function deleteCard(cardId: number): Promise<void> {
  await send<undefined>(`/cards/${cardId}`, {
    method: 'DELETE'
  });
}