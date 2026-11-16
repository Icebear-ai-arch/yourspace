const test = require('node:test');
const assert = require('node:assert/strict');
const { applyMove, hasWinner, presentBoard } = require('./ticTacToe');

test('empty board cells are presented as blank playable squares', () => {
  assert.deepEqual(presentBoard('.........'), ['', '', '', '', '', '', '', '', '']);
  assert.deepEqual(presentBoard('X.O......'), ['X', '', 'O', '', '', '', '', '', '']);
});

test('a player’s oldest mark rotates off the board after their third mark', () => {
  const game = {
    board: 'XOXOX..O.',
    moveHistory: JSON.stringify([
      { userId: 1, cell: 0 },
      { userId: 2, cell: 1 },
      { userId: 1, cell: 2 },
      { userId: 2, cell: 3 },
      { userId: 1, cell: 4 },
      { userId: 2, cell: 7 },
    ]),
    playerXId: 1,
    playerOId: 2,
  };

  const move = applyMove(game, 1, 5);

  assert.equal(move.board[0], '.');
  assert.equal(move.board[5], 'X');
  assert.equal(JSON.parse(move.moveHistory).filter(item => item.userId === 1).length, 3);
  assert.equal(move.status, 'active');
});

test('a winning line finishes the game and clears the next turn', () => {
  const game = {
    board: 'XX.OO....',
    moveHistory: JSON.stringify([
      { userId: 1, cell: 0 },
      { userId: 2, cell: 3 },
      { userId: 1, cell: 1 },
      { userId: 2, cell: 4 },
    ]),
    playerXId: 1,
    playerOId: 2,
  };

  const move = applyMove(game, 1, 2);

  assert.equal(move.status, 'won');
  assert.equal(move.winnerId, 1);
  assert.equal(move.turnUserId, null);
});

test('a board without three matching marks never has a winner', () => {
  assert.equal(hasWinner('XOXXOOOX.'), false);
});
