<?php

namespace App\Http\Controllers;

use App\Models\Workspace;
use Illuminate\Http\Request;

class WorkspaceController extends Controller
{
    // GET /api/workspaces
    public function index()
    {
        return Workspace::all();
    }

    // POST /api/workspaces
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $workspace = Workspace::create($data);

        return response()->json($workspace, 201);
    }
}