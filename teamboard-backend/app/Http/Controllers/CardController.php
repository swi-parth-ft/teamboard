<?php

namespace App\Http\Controllers;

use App\Models\BoardList;
use Illuminate\Http\Request;

class CardController extends Controller
{
    // GET /api/lists/{list}/cards
    public function index(BoardList $list)
    {
        return $list->cards()->orderBy('id')->get();
    }

    // POST /api/lists/{list}/cards
    public function store(Request $request, BoardList $list)
    {
        $data = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $card = $list->cards()->create([
            'title'       => $data['title'],
            'description' => $data['description'] ?? null,
            // 'position' => ..., // later if we do ordering
        ]);

        return response()->json($card, 201);
    }
}