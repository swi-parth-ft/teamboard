// src/routes/+page.ts
import {
  fetchWorkspaces,
  fetchWorkspaceBoards,
  fetchBoard,
  type Workspace,
  type Board
} from '$lib/api';

export const load = async () => {
  // 1) Get all workspaces
  const workspaces: Workspace[] = await fetchWorkspaces();

  let initialWorkspaceId: number | null = null;
  let boards: Board[] = [];
  let board: Board | null = null;

  // 2) If we have at least one workspace, load its boards
  if (workspaces.length > 0) {
    initialWorkspaceId = workspaces[0].id;
    boards = await fetchWorkspaceBoards(initialWorkspaceId);

    // 3) If that workspace has at least one board, load that board's details
    if (boards.length > 0) {
      board = await fetchBoard(boards[0].id);
    }
  }

  return {
    workspaces,
    initialWorkspaceId,
    boards,
    board
  };
};