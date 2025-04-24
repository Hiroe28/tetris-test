// DOM要素の取得
const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const finalScoreElement = document.getElementById('final-score');
const nextPieceElement = document.getElementById('next-piece');
const gameOverElement = document.getElementById('game-over');
const restartButton = document.getElementById('restart-button');

// モバイルコントロール
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const downBtn = document.getElementById('down-btn');
const rotateBtn = document.getElementById('rotate-btn');
const dropBtn = document.getElementById('drop-btn');

// ゲームの設定
const COLS = 10;
const ROWS = 20;
const EMPTY = 'empty';
const INITIAL_SPEED = 500; // ミリ秒
const SPEED_DECREASE = 50; // レベルアップごとの速度増加
const MIN_SPEED = 100; // 最速スピード

// テトリミノの定義（中心を考慮した配置）
const SHAPES = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    O: [
        [1, 1],
        [1, 1]
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
};

// ゲームの状態
let board = [];
let currentPiece = null;
let nextPiece = null;
let currentPosition = { x: 0, y: 0 };
let score = 0;
let level = 1;
let linesCleared = 0;
let gameOver = false;
let gameInterval = null;
let gameSpeed = INITIAL_SPEED;
let lastMoveTime = 0;
let isPaused = false;
let isMobile = window.innerWidth <= 768;

// アニメーションフレーム
let animationFrameId = null;

// ゲームの初期化
function initGame() {
    // ゲームボードの初期化
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
    
    // ゲームボードのセルを作成
    gameBoard.innerHTML = '';
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            gameBoard.appendChild(cell);
        }
    }
    
    // 次のピース表示エリアの初期化
    nextPieceElement.innerHTML = '';
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const cell = document.createElement('div');
            cell.className = 'next-cell';
            nextPieceElement.appendChild(cell);
        }
    }
    
    // スコアとレベルのリセット
    score = 0;
    level = 1;
    linesCleared = 0;
    gameSpeed = INITIAL_SPEED;
    
    scoreElement.textContent = score;
    levelElement.textContent = level;
    
    // ゲームオーバー表示を隠す
    gameOverElement.classList.add('hidden');
    
    // 最初のピースを生成
    nextPiece = generateRandomPiece();
    createNewPiece();
    
    // キーボードイベントを設定
    document.addEventListener('keydown', handleKeyPress);
    
    // モバイル操作のイベントリスナー設定
    setupMobileControls();
    
    // ゲームループ開始
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    gameInterval = setInterval(gameLoop, gameSpeed);
    
    // アニメーションフレームをリセット
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    lastMoveTime = performance.now();
    gameLoop();
    
    gameOver = false;
    isPaused = false;
}

// ゲームループ関数
function gameLoop(timestamp) {
    if (!timestamp) timestamp = performance.now();
    const deltaTime = timestamp - lastMoveTime;
    
    if (!isPaused && !gameOver) {
        // 自動落下
        if (deltaTime >= gameSpeed) {
            moveDown();
            lastMoveTime = timestamp;
        }
        
        // 画面描画
        drawBoard();
    }
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

// ランダムなテトリミノの生成
function generateRandomPiece() {
    const shapes = Object.keys(SHAPES);
    const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
    return {
        shape: JSON.parse(JSON.stringify(SHAPES[randomShape])), // ディープコピー
        type: randomShape
    };
}

// 新しいピースの作成
function createNewPiece() {
    currentPiece = nextPiece;
    nextPiece = generateRandomPiece();
    
    // 初期位置の設定（画面中央、最上部）
    currentPosition = {
        x: Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2),
        y: 0
    };
    
    // 次のピースの表示
    drawNextPiece();
    
    // 衝突チェック（ゲームオーバー判定）
    if (hasCollision()) {
        gameOver = true;
        clearInterval(gameInterval);
        finalScoreElement.textContent = score;
        gameOverElement.classList.remove('hidden');
    }
}

// 次のピースの描画
function drawNextPiece() {
    const nextCells = nextPieceElement.querySelectorAll('.next-cell');
    
    // すべてのセルをクリア
    nextCells.forEach(cell => {
        cell.className = 'next-cell';
    });
    
    // 次のピースのセンタリング計算
    const pieceWidth = nextPiece.shape[0].length;
    const pieceHeight = nextPiece.shape.length;
    const offsetX = Math.floor((4 - pieceWidth) / 2);
    const offsetY = Math.floor((4 - pieceHeight) / 2);
    
    // 次のピースを描画
    for (let row = 0; row < pieceHeight; row++) {
        for (let col = 0; col < pieceWidth; col++) {
            if (nextPiece.shape[row][col]) {
                const cellIndex = (offsetY + row) * 4 + (offsetX + col);
                if (cellIndex >= 0 && cellIndex < nextCells.length) {
                    nextCells[cellIndex].classList.add(nextPiece.type);
                }
            }
        }
    }
}

// ボードの描画
function drawBoard() {
    const cells = gameBoard.querySelectorAll('.cell');
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // セルをリセット
        cell.className = 'cell';
        
        // 固定されたブロックを描画
        if (board[row][col] !== EMPTY) {
            cell.classList.add(board[row][col]);
        }
    });
    
    // 現在のピースを描画
    if (currentPiece) {
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[0].length; col++) {
                if (currentPiece.shape[row][col]) {
                    const boardRow = currentPosition.y + row;
                    const boardCol = currentPosition.x + col;
                    
                    if (boardRow >= 0 && boardRow < ROWS && boardCol >= 0 && boardCol < COLS) {
                        const cellIndex = boardRow * COLS + boardCol;
                        if (cellIndex >= 0 && cellIndex < cells.length) {
                            cells[cellIndex].classList.add(currentPiece.type);
                        }
                    }
                }
            }
        }
        
        // ゴースト（着地位置）の描画
        const ghostPosition = findDropPosition();
        if (ghostPosition.y > currentPosition.y) {
            for (let row = 0; row < currentPiece.shape.length; row++) {
                for (let col = 0; col < currentPiece.shape[0].length; col++) {
                    if (currentPiece.shape[row][col]) {
                        const boardRow = ghostPosition.y + row;
                        const boardCol = ghostPosition.x + col;
                        
                        if (boardRow >= 0 && boardRow < ROWS && boardCol >= 0 && boardCol < COLS) {
                            const cellIndex = boardRow * COLS + boardCol;
                            if (cellIndex >= 0 && cellIndex < cells.length && 
                                !(boardRow === currentPosition.y + row && boardCol === currentPosition.x + col)) {
                                cells[cellIndex].classList.add('ghost');
                            }
                        }
                    }
                }
            }
        }
    }
}

// 着地位置を見つける
function findDropPosition() {
    const ghost = {
        x: currentPosition.x,
        y: currentPosition.y
    };
    
    while (!checkCollision(ghost.x, ghost.y + 1)) {
        ghost.y++;
    }
    
    return ghost;
}

// ハードドロップ（即着地）
function hardDrop() {
    const dropPosition = findDropPosition();
    currentPosition.y = dropPosition.y;
    fixPiece();
    drawBoard();
}

// 衝突の確認（座標指定版）
function checkCollision(x, y) {
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[0].length; col++) {
            if (currentPiece.shape[row][col]) {
                const boardRow = y + row;
                const boardCol = x + col;
                
                // 境界外または他のブロックと衝突
                if (
                    boardCol < 0 || 
                    boardCol >= COLS || 
                    boardRow >= ROWS || 
                    (boardRow >= 0 && board[boardRow][boardCol] !== EMPTY)
                ) {
                    return true;
                }
            }
        }
    }
    return false;
}

// 衝突の確認（現在位置版）
function hasCollision() {
    return checkCollision(currentPosition.x, currentPosition.y);
}

// ピースを固定
function fixPiece() {
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[0].length; col++) {
            if (currentPiece.shape[row][col]) {
                const boardRow = currentPosition.y + row;
                const boardCol = currentPosition.x + col;
                
                if (boardRow >= 0 && boardRow < ROWS && boardCol >= 0 && boardCol < COLS) {
                    board[boardRow][boardCol] = currentPiece.type;
                }
            }
        }
    }
    
    // サウンドエフェクト再生
    playSound('fix');
    
    // ライン消去チェック
    clearLines();
    
    // 新しいピースを作成
    createNewPiece();
}

// ライン消去
function clearLines() {
    let linesCount = 0;
    let rowsToAnimate = [];
    
    for (let row = ROWS - 1; row >= 0; row--) {
        // 行が全て埋まっているか確認
        const isRowFull = board[row].every(cell => cell !== EMPTY);
        
        if (isRowFull) {
            rowsToAnimate.push(row);
            linesCount++;
        }
    }
    
    if (linesCount > 0) {
        // アニメーション表示（点滅など）
        animateLinesClear(rowsToAnimate, () => {
            // アニメーション終了後の処理
            for (let row of rowsToAnimate) {
                // 行を消去し、上の行を下に移動
                for (let r = row; r > 0; r--) {
                    board[r] = [...board[r - 1]];
                }
                
                // 一番上の行をクリア
                board[0] = Array(COLS).fill(EMPTY);
            }
            
            // サウンドエフェクト再生
            playSound('clear');
            
            // スコア更新
            updateScore(linesCount);
            
            // ボード再描画
            drawBoard();
        });
    }
}

// ライン消去アニメーション
function animateLinesClear(rows, callback) {
    const cells = gameBoard.querySelectorAll('.cell');
    let flashCount = 0;
    
    function flash() {
        // 該当行のセルを点滅
        rows.forEach(row => {
            for (let col = 0; col < COLS; col++) {
                const cellIndex = row * COLS + col;
                if (flashCount % 2 === 0) {
                    cells[cellIndex].classList.add('flash');
                } else {
                    cells[cellIndex].classList.remove('flash');
                }
            }
        });
        
        flashCount++;
        
        if (flashCount < 6) { // 3回点滅
            setTimeout(flash, 100);
        } else {
            // 点滅が終わったらコールバック実行
            callback();
        }
    }
    
    // 点滅開始
    flash();
}

// スコア更新
function updateScore(linesCount) {
    // ライン数に応じてスコアを加算
    const points = [0, 100, 300, 500, 800];
    const lineScore = points[Math.min(linesCount, 4)] * level;
    score += lineScore;
    linesCleared += linesCount;
    
    // レベルアップチェック
    const newLevel = Math.floor(linesCleared / 10) + 1;
    if (newLevel > level) {
        level = newLevel;
        levelUp();
    }
    
    scoreElement.textContent = score;
    levelElement.textContent = level;
}

// レベルアップ
function levelUp() {
    // ゲームスピードアップ
    gameSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - (level - 1) * SPEED_DECREASE);
    
    // タイマー再設定
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, gameSpeed);
    
    // サウンドエフェクト再生
    playSound('levelup');
    
    // レベルアップ表示
    showLevelUpEffect();
}

// レベルアップエフェクト
function showLevelUpEffect() {
    const levelElement = document.getElementById('level');
    levelElement.classList.add('level-up');
    
    setTimeout(() => {
        levelElement.classList.remove('level-up');
    }, 1000);
}

// サウンドエフェクト再生
function playSound(type) {
    // サウンド実装は省略（必要に応じて実装可能）
}

// ピースの移動
function movePiece(dx, dy) {
    // 一時的に移動
    const newX = currentPosition.x + dx;
    const newY = currentPosition.y + dy;
    
    // 衝突チェック
    if (!checkCollision(newX, newY)) {
        currentPosition.x = newX;
        currentPosition.y = newY;
        drawBoard();
        return true;
    } else {
        // 下方向の移動で衝突した場合、ピースを固定
        if (dy > 0) {
            fixPiece();
        }
        return false;
    }
}

// ピースの回転
function rotatePiece() {
    const originalShape = JSON.parse(JSON.stringify(currentPiece.shape)); // ディープコピー
    const size = originalShape.length;
    
    // 新しい形状を作成（90度時計回り）
    const newShape = Array.from({ length: size }, () => Array(size).fill(0));
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            newShape[col][size - 1 - row] = originalShape[row][col];
        }
    }
    
    // 回転後の形状を一時的に設定
    currentPiece.shape = newShape;
    
    // 衝突チェック
    if (hasCollision()) {
        // 衝突する場合は壁キック試行
        const kicks = tryWallKick();
        
        if (!kicks) {
            // 壁キック失敗の場合は元に戻す
            currentPiece.shape = originalShape;
            return false;
        }
    }
    
    // サウンドエフェクト再生
    playSound('rotate');
    
    drawBoard();
    return true;
}

// 壁キック試行
function tryWallKick() {
    const kicks = [
        {x: 1, y: 0},   // 右にずらす
        {x: -1, y: 0},  // 左にずらす
        {x: 0, y: -1},  // 上にずらす
        {x: 2, y: 0},   // 右に2マス
        {x: -2, y: 0},  // 左に2マス
    ];
    
    for (const kick of kicks) {
        const newX = currentPosition.x + kick.x;
        const newY = currentPosition.y + kick.y;
        
        if (!checkCollision(newX, newY)) {
            currentPosition.x = newX;
            currentPosition.y = newY;
            return true;
        }
    }
    
    return false;
}

// 下に移動
function moveDown() {
    if (!gameOver && !isPaused) {
        movePiece(0, 1);
    }
}

// キー入力の処理
function handleKeyPress(event) {
    if (gameOver || isPaused) return;
    
    switch (event.code) {
        case 'ArrowLeft':
            movePiece(-1, 0);
            event.preventDefault();
            break;
        case 'ArrowRight':
            movePiece(1, 0);
            event.preventDefault();
            break;
        case 'ArrowDown':
            movePiece(0, 1);
            event.preventDefault();
            break;
        case 'ArrowUp':
            rotatePiece();
            event.preventDefault();
            break;
        case 'Space':
            hardDrop();
            event.preventDefault();
            break;
        case 'KeyP':
            togglePause();
            event.preventDefault();
            break;
    }
}

// ポーズ切り替え
function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        // ポーズ表示
    } else {
        // ポーズ解除
        lastMoveTime = performance.now();
    }
}

// モバイル操作の設定
function setupMobileControls() {
    // タッチイベントのリスナー設定
    leftBtn.addEventListener('click', () => movePiece(-1, 0));
    rightBtn.addEventListener('click', () => movePiece(1, 0));
    downBtn.addEventListener('click', () => movePiece(0, 1));
    rotateBtn.addEventListener('click', rotatePiece);
    dropBtn.addEventListener('click', hardDrop);
    
    // タッチ長押し対応
    setupLongPress(leftBtn, () => movePiece(-1, 0));
    setupLongPress(rightBtn, () => movePiece(1, 0));
    setupLongPress(downBtn, () => movePiece(0, 1));
}

// 長押し対応
function setupLongPress(element, callback) {
    let intervalId = null;
    let initialDelay = true;
    
    element.addEventListener('touchstart', function(e) {
        e.preventDefault();
        
        if (intervalId !== null) return;
        
        // 最初のアクションを即実行
        callback();
        
        // 長押し処理
        initialDelay = true;
        intervalId = setInterval(() => {
            if (initialDelay) {
                // 長押し開始後の遅延
                initialDelay = false;
                setTimeout(() => {
                    callback();
                }, 300);
            } else {
                callback();
            }
        }, 100);
    });
    
    const stopAction = function() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    };
    
    element.addEventListener('touchend', stopAction);
    element.addEventListener('touchcancel', stopAction);
}

// リスタートボタンのイベント
restartButton.addEventListener('click', () => {
    clearInterval(gameInterval);
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    initGame();
});

// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
    isMobile = window.innerWidth <= 768;
});

// ゲーム開始
initGame();