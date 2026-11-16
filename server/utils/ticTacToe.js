const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function hasWinner(board) {
  return winningLines.some(([first, second, third]) => (
    board[first] !== '.' &&
    board[first] === board[second] &&
    board[first] === board[third]
  ));
}

function presentBoard(board) {
  return board.split('').map(mark => mark === '.' ? '' : mark);
}

function applyMove(game, userId, cell) {
  const board = game.board.split('');
  const moveHistory = JSON.parse(game.moveHistory);
  const isX = userId === game.playerXId;
  const mark = isX ? 'X' : 'O';
  const playerMoves = moveHistory.filter(move => move.userId === userId);

  if (playerMoves.length === 4) {
    const oldestMove = playerMoves[0];
    board[oldestMove.cell] = '.';
    moveHistory.splice(moveHistory.findIndex(move => move === oldestMove), 1);
  }

  board[cell] = mark;
  moveHistory.push({ userId, cell });
  const winnerId = hasWinner(board) ? userId : null;

  return {
    board: board.join(''),
    moveHistory: JSON.stringify(moveHistory),
    status: winnerId ? 'won' : 'active',
    turnUserId: winnerId ? null : (isX ? game.playerOId : game.playerXId),
    winnerId,
  };
}

module.exports = { applyMove, hasWinner, presentBoard };
