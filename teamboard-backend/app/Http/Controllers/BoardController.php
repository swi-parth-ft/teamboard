<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Workspace;
use Illuminate\Http\Request;

class BoardController extends Controller
{
    // GET /api/workspaces/{workspace}/boards
    public function index(Workspace $workspace)
    {
        return $workspace->boards()->orderBy('id')->get();
    }

    // POST /api/workspaces/{workspace}/boards
    public function store(Request $request, Workspace $workspace)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $board = $workspace->boards()->create([
            'name' => $data['name'],
        ]);

        return response()->json($board, 201);
    }

    public function show(\App\Models\Board $board)
    {
        $board->load([
            'lists' => function ($q) {
                $q->orderBy('position')->orderBy('id');
            },
            'lists.cards' => function ($q) {
                $q->orderBy('position')->orderBy('id');
            },
        ]);

        return $board;
    }
}