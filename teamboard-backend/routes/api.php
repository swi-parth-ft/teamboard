<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WorkspaceController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\BoardListController;
use App\Http\Controllers\CardController;

// Workspaces
Route::get('/workspaces', [WorkspaceController::class, 'index']);
Route::post('/workspaces', [WorkspaceController::class, 'store']);

// Boards inside a workspace
Route::get('/workspaces/{workspace}/boards', [BoardController::class, 'index']);
Route::post('/workspaces/{workspace}/boards', [BoardController::class, 'store']);

// Lists inside a board
Route::get('/boards/{board}/lists', [BoardListController::class, 'index']);
Route::post('/boards/{board}/lists', [BoardListController::class, 'store']);

// Cards inside a list
Route::get('/lists/{list}/cards', [CardController::class, 'index']);
Route::post('/lists/{list}/cards', [CardController::class, 'store']);

// Full board view with lists + cards
Route::get('/boards/{board}', [BoardController::class, 'show']);

