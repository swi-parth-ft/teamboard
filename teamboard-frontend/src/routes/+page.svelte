<script lang="ts">
  import type { Workspace, Board, BoardList, Card } from '$lib/api';
  import {
    fetchWorkspaceBoards,
    fetchBoard,
    createList,
    createCard,
    deleteCard
  } from '$lib/api';

  // Data from +page.ts
  export let data: {
    workspaces: Workspace[];
    initialWorkspaceId: number | null;
    boards: Board[];
    board: Board | null;
  };

  let workspaces: Workspace[] = data.workspaces ?? [];
  let boards: Board[] = data.boards ?? [];

  let selectedWorkspaceId: number | null = data.initialWorkspaceId;
  let selectedBoardId: number | null =
    data.board?.id ?? (boards.length > 0 ? boards[0].id : null);

  let activeBoard: Board | null = data.board ?? null;

  let loadingBoard = false;
  let loadingBoards = false;
  let error: string | null = null;

  // NEW: create list
  let newListName = '';
  let creatingList = false;

  // NEW: create card per list
  let newCardTitle: Record<number, string> = {};
  let newCardDescription: Record<number, string> = {};
  let creatingCardFor: number | null = null;

  // NEW: delete card
  let deletingCardId: number | null = null;

  // NEW: drag & drop
  type DragState = {
    cardId: number;
    fromListId: number;
  } | null;

  let dragState: DragState = null;

  // Helpers
  function ensureBoardLists(board: Board | null): BoardList[] {
    if (!board?.lists) return [];
    return board.lists.map((l) => ({ ...l, cards: l.cards ?? [] }));
  }

  async function selectWorkspace(id: number) {
    if (id === selectedWorkspaceId) return;

    selectedWorkspaceId = id;
    selectedBoardId = null;
    activeBoard = null;
    error = null;
    loadingBoards = true;

    try {
      // Load boards for this workspace
      boards = await fetchWorkspaceBoards(id);

      if (boards.length > 0) {
        selectedBoardId = boards[0].id;
        loadingBoard = true;
        activeBoard = await fetchBoard(boards[0].id);
      } else {
        selectedBoardId = null;
        activeBoard = null;
      }
    } catch (e) {
      console.error(e);
      error = (e as Error).message;
    } finally {
      loadingBoards = false;
      loadingBoard = false;
    }
  }

  async function selectBoard(id: number) {
    if (id === selectedBoardId) return;
    if (!selectedWorkspaceId) return;

    selectedBoardId = id;
    loadingBoard = true;
    error = null;

    try {
      activeBoard = await fetchBoard(id);
    } catch (e) {
      console.error(e);
      error = (e as Error).message;
    } finally {
      loadingBoard = false;
    }
  }

  // ---- Create list ----
  async function handleCreateList() {
    if (!selectedBoardId) return;
    const name = newListName.trim();
    if (!name) return;

    creatingList = true;
    error = null;

    try {
      const list = await createList(selectedBoardId, name);

      if (activeBoard && activeBoard.id === selectedBoardId) {
        const lists = ensureBoardLists(activeBoard);
        activeBoard = {
          ...activeBoard,
          lists: [...lists, { ...list, cards: list.cards ?? [] }]
        };
      }

      newListName = '';
    } catch (e) {
      console.error(e);
      error = (e as Error).message;
    } finally {
      creatingList = false;
    }
  }

  // ---- Create card ----
  async function handleCreateCard(listId: number) {
    const title = (newCardTitle[listId] ?? '').trim();
    const desc = (newCardDescription[listId] ?? '').trim();

    if (!title) return;

    creatingCardFor = listId;
    error = null;

    try {
      const card = await createCard(listId, title, desc || null);

      if (activeBoard?.lists) {
        const lists = activeBoard.lists.map((list) => {
          if (list.id !== listId) return list;
          const cards = [...(list.cards ?? []), card];
          return { ...list, cards };
        });

        activeBoard = { ...activeBoard, lists };
      }

      newCardTitle[listId] = '';
      newCardDescription[listId] = '';
    } catch (e) {
      console.error(e);
      error = (e as Error).message;
    } finally {
      creatingCardFor = null;
    }
  }

  // ---- Delete card ----
  async function handleDeleteCard(cardId: number, listId: number) {
    if (!confirm('Delete this card?')) return;

    deletingCardId = cardId;
    error = null;

    try {
      await deleteCard(cardId);

      if (activeBoard?.lists) {
        const lists = activeBoard.lists.map((list) => {
          if (list.id !== listId) return list;
          const cards = (list.cards ?? []).filter((c) => c.id !== cardId);
          return { ...list, cards };
        });

        activeBoard = { ...activeBoard, lists };
      }
    } catch (e) {
      console.error(e);
      error = (e as Error).message;
    } finally {
      deletingCardId = null;
    }
  }

  // ---- Drag & drop ----
  function handleDragStart(cardId: number, fromListId: number) {
    dragState = { cardId, fromListId };
  }

  function handleDragOverList(event: DragEvent) {
    event.preventDefault();
  }

  function handleDropOnList(targetListId: number) {
    if (!dragState || !activeBoard?.lists) return;

    const { cardId, fromListId } = dragState;
    if (fromListId === targetListId) {
      dragState = null;
      return;
    }

    // find card
    let movedCard: Card | undefined;
    const listsWithoutCard = activeBoard.lists.map((list) => {
      if (list.id !== fromListId) return list;
      const remaining = (list.cards ?? []).filter((c) => {
        if (c.id === cardId) {
          movedCard = c;
          return false;
        }
        return true;
      });
      return { ...list, cards: remaining };
    });

    if (!movedCard) {
      dragState = null;
      return;
    }

    const lists = listsWithoutCard.map((list) => {
      if (list.id !== targetListId) return list;
      const cards = [...(list.cards ?? []), movedCard!];
      return { ...list, cards };
    });

    activeBoard = { ...activeBoard, lists };
    dragState = null;

    // NOTE: right now this is front-end only (no API call to persist order).
  }
</script>

<svelte:head>
  <title>Teamboard</title>
</svelte:head>

<div class="app">
  <!-- Sidebar: workspaces -->
  <aside class="sidebar">
    <h1 class="app-title">Teamboard</h1>
    <h2 class="section-title">Workspaces</h2>

    {#if workspaces.length === 0}
      <p class="empty">No workspaces yet.</p>
    {:else}
      <ul class="workspace-list">
        {#each workspaces as ws}
          <li
            class="workspace-item"
            class:selected={ws.id === selectedWorkspaceId}
            on:click={() => selectWorkspace(ws.id)}
          >
            <div class="workspace-dot" />
            <span>{ws.name}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </aside>

  <!-- Middle: boards for selected workspace -->
  <section class="boards-panel">
    <h2 class="section-title">Boards</h2>

    {#if !selectedWorkspaceId}
      <p class="empty">Select a workspace to see its boards.</p>
    {:else if loadingBoards}
      <p class="empty">Loading boards…</p>
    {:else if boards.length === 0}
      <p class="empty">No boards in this workspace.</p>
    {:else}
      <ul class="board-list">
        {#each boards as b}
          <li
            class="board-item"
            class:selected={b.id === selectedBoardId}
            on:click={() => selectBoard(b.id)}
          >
            {b.name}
          </li>
        {/each}
      </ul>

      <form
        class="new-list-form"
        on:submit|preventDefault={handleCreateList}
      >
        <input
          placeholder="New list name"
          bind:value={newListName}
        />
        <button
          type="submit"
          disabled={!newListName.trim() || creatingList || !selectedBoardId}
        >
          {creatingList ? 'Adding…' : 'Add list'}
        </button>
      </form>
    {/if}
  </section>

  <!-- Main: active board -->
  <main class="board-area">
    {#if error}
      <p class="empty">Error: {error}</p>
    {:else if loadingBoard}
      <p class="empty">Loading board…</p>
    {:else if !activeBoard}
      <p class="empty">No board selected.</p>
    {:else}
      <header class="board-header">
        <h2 class="board-name">{activeBoard.name}</h2>
        <p class="board-subtitle">
          Workspace #{activeBoard.workspace_id} · Board #{activeBoard.id}
        </p>
      </header>

      {#if activeBoard.lists && activeBoard.lists.length > 0}
        <section class="lists">
          {#each activeBoard.lists as list}
            <article
              class="list-column"
              on:dragover|preventDefault={handleDragOverList}
              on:drop={() => handleDropOnList(list.id)}
            >
              <header class="list-header">
                <h3>{list.name}</h3>
                <span class="list-meta">
                  {list.cards?.length ?? 0} cards
                </span>
              </header>

              <div class="cards">
                {#if list.cards && list.cards.length > 0}
                  {#each list.cards as card}
                    <div
                      class="card"
                      draggable="true"
                      on:dragstart={() => handleDragStart(card.id, list.id)}
                    >
                      <div class="card-title">{card.title}</div>
                      {#if card.description}
                        <div class="card-description">{card.description}</div>
                      {/if}
                      <div class="card-footer">
                        <span class="card-meta">Card #{card.id}</span>

                        <button
                          class="card-delete"
                          on:click|stopPropagation={() =>
                            handleDeleteCard(card.id, list.id)}
                          disabled={deletingCardId === card.id}
                        >
                          {deletingCardId === card.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  {/each}
                {:else}
                  <p class="empty">No cards yet.</p>
                {/if}
              </div>

              <form
                class="new-card-form"
                on:submit|preventDefault={() => handleCreateCard(list.id)}
              >
                <input
                  placeholder="Card title"
                  bind:value={newCardTitle[list.id]}
                />
                <textarea
                  placeholder="Description (optional)"
                  rows="2"
                  bind:value={newCardDescription[list.id]}
                />
                <button
                  type="submit"
                  disabled={
                    !newCardTitle[list.id]?.trim() ||
                    creatingCardFor === list.id
                  }
                >
                  {creatingCardFor === list.id ? 'Adding…' : 'Add card'}
                </button>
              </form>
            </article>
          {/each}
        </section>
      {:else}
        <p class="empty">This board has no lists yet.</p>
      {/if}
    {/if}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
      sans-serif;
    background: #020617;
    color: #e5e7eb;
  }

  .app {
    display: grid;
    grid-template-columns: 240px 220px 1fr;
    height: 100vh;
  }

  .sidebar {
    background: radial-gradient(circle at top left, #1d2438, #020617);
    border-right: 1px solid rgba(148, 163, 184, 0.2);
    padding: 1.25rem 1rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .app-title {
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  .section-title {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #9ca3af;
    margin: 0.5rem 0 0.4rem;
  }

  .workspace-list {
    list-style: none;
    padding: 0;
    margin: 0.25rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .workspace-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.5rem;
    border-radius: 0.45rem;
    font-size: 0.9rem;
    color: #e5e7eb;
    cursor: pointer;
    background: rgba(15, 23, 42, 0.2);
    border: 1px solid transparent;
    transition: all 0.12s ease;
  }

  .workspace-item:hover {
    background: rgba(15, 23, 42, 0.6);
  }

  .workspace-item.selected {
    background: rgba(37, 99, 235, 0.25);
    border-color: rgba(59, 130, 246, 0.7);
  }

  .workspace-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #22c55e;
  }

  .boards-panel {
    border-right: 1px solid rgba(148, 163, 184, 0.2);
    padding: 1.25rem 1rem 1.5rem;
  }

  .board-list {
    list-style: none;
    padding: 0;
    margin: 0.25rem 0 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .board-item {
    padding: 0.4rem 0.5rem;
    border-radius: 0.45rem;
    font-size: 0.9rem;
    cursor: pointer;
    background: rgba(15, 23, 42, 0.25);
    border: 1px solid transparent;
    transition: all 0.12s ease;
  }

  .board-item:hover {
    background: rgba(15, 23, 42, 0.7);
  }

  .board-item.selected {
    background: rgba(8, 47, 73, 0.9);
    border-color: rgba(56, 189, 248, 0.8);
  }

  .new-list-form {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .new-list-form input {
    padding: 0.4rem 0.5rem;
    border-radius: 0.45rem;
    border: 1px solid rgba(148, 163, 184, 0.6);
    background: rgba(15, 23, 42, 0.9);
    color: #e5e7eb;
    font-size: 0.85rem;
  }

  .new-list-form button {
    align-self: flex-start;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    border: none;
    font-size: 0.8rem;
    background: rgba(59, 130, 246, 0.9);
    color: white;
    cursor: pointer;
  }

  .new-list-form button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .board-area {
    padding: 1.5rem 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    overflow: hidden;
  }

  .board-header {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .board-name {
    font-size: 1.6rem;
    font-weight: 600;
  }

  .board-subtitle {
    font-size: 0.85rem;
    color: #9ca3af;
  }

  .lists {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    align-items: flex-start;
    overflow-x: auto;
    padding-bottom: 1rem;
  }

  .list-column {
    min-width: 260px;
    max-width: 280px;
    background: rgba(15, 23, 42, 0.9);
    border-radius: 0.8rem;
    padding: 0.75rem;
    border: 1px solid rgba(148, 163, 184, 0.4);
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.7);
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.5rem;
  }

  .list-header h3 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .list-meta {
    font-size: 0.7rem;
    color: #9ca3af;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: calc(100vh - 220px);
    overflow-y: auto;
  }

  .card {
    background: linear-gradient(145deg, #020617, #020617);
    border-radius: 0.7rem;
    padding: 0.6rem 0.7rem;
    border: 1px solid rgba(148, 163, 184, 0.4);
  }

  .card-title {
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .card-description {
    font-size: 0.8rem;
    color: #cbd5f5;
    margin-bottom: 0.35rem;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
    color: #9ca3af;
    gap: 0.5rem;
  }

  .card-delete {
    border: none;
    background: rgba(239, 68, 68, 0.12);
    color: #fecaca;
    border-radius: 999px;
    padding: 0.15rem 0.5rem;
    font-size: 0.7rem;
    cursor: pointer;
  }

  .card-delete:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .new-card-form {
    margin-top: 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .new-card-form input,
  .new-card-form textarea {
    padding: 0.35rem 0.5rem;
    border-radius: 0.45rem;
    border: 1px solid rgba(148, 163, 184, 0.6);
    background: rgba(15, 23, 42, 0.9);
    color: #e5e7eb;
    font-size: 0.8rem;
  }

  .new-card-form textarea {
    resize: vertical;
  }

  .new-card-form button {
    align-self: flex-start;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    border: none;
    font-size: 0.8rem;
    background: rgba(34, 197, 94, 0.9);
    color: white;
    cursor: pointer;
  }

  .new-card-form button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .empty {
    font-size: 0.8rem;
    color: #9ca3af;
    margin-top: 0.4rem;
  }
  
</style>