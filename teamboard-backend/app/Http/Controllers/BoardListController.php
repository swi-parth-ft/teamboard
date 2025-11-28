<?php

namespace App\Http\Controllers;

use App\Models\Board;
use Illuminate\Http\Request;

class BoardListController extends Controller
{
    // GET /api/boards/{board}/lists
    public function index(Board $board)
    {
        return $board->lists()->orderBy('id')->get();
    }

    // POST /api/boards/{board}/lists
    public function store(Request $request, Board $board)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $list = $board->lists()->create([
            'name' => $data['name'],
            // later: 'position' => ...
        ]);

        return response()->json($list, 201);
    }
}