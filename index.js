let gameStates = {
    PAUSED : 0,
    REDTURN : 1,
    BLUETURN : -1,
}

let Symbols = {
    RED : 1,
    BLUE : -1,
    EMPTY : 0,
}

let boardStates = {
    WIN : 1,
    NOWIN : -2,
    DRAW : -1,
    CONTINUE : 0,
}

class Connect4move {
    location;
    value;
    constructor(location, value) {
        this.location = location;
        this.value = value;
    }
}

class player { 
    symbol;
    enemy;
    board;

    constructor(symbol, board) {
        this.symbol = symbol;
        this.enemy = symbol * -1;
        this.board = board;
    }

    get_move() {
        let x = 4;
        let move = new Connect4move(x, this.symbol);
        return move;
    }
}

class humanPlayer extends player {
    constructor(symbol, board) {
        super(symbol, board);
    }
    get_selected() {
        let x;
        for (let y in this.board.board) {
            let row = this.board.board[y];
            for (x in row) {
                let htmlTile = this.board.htmlNode.rows[y].cells[x];
                if (htmlTile.classList.contains('selected')) return x;
            }
        }
        return null;
        
    }
      
    take_turn() {
        let x = this.get_selected();
        if (x == null) return false;
        let move = new Connect4move(x, this.symbol);
        this.board.apply_move(move);
        return true;
    }
}

class AIplayer extends player {
    constructor(symbol, board) {
        super(symbol, board);
    }

    get_move() {
        for(let x = 0; x < this.board.width; x++) {
            if(this.board.check_open(x) && this.board.check_win(x,this.symbol)) {
                return x;
            }
        }

        const totalMoves = (this.board.width * this.board.height);
        let max = -totalMoves;
        let best_move = 0;
        for (let x of [3,4,2,5,1,6,0]) {
            const move = new Connect4move(x, this.symbol)
            if(!this.board.validate_move(move)) continue;
            
            this.board.apply_move(move);
            const score = -this.negamax(this.symbol*-1,7);
            this.board.undo();
            
            if (score > max) {
                max = score;
                best_move = x;
            }       
        }
        return best_move;
    }

    take_turn() {
        let best_move = this.get_move();
        
        let move = new Connect4move(best_move, this.symbol);
        this.board.apply_move(move);
        return true;
    }

    eval_position() {
        let evaluation = 0;
        let heatMap = [
            [0,   0,   0,   0.4, 0,   0,   0  ],
            [0,   0.1, 0.2, 0.6, 0.2, 0.1, 0  ],
            [0,   0.1, 0.4, 0.8, 0.4, 0.1, 0  ],
            [0,   0.2, 0.8, 1,   0.8, 0.2, 0  ],
            [0.1, 0.4, 1,   1,   1,   0.4, 0.1],
            [0.2, 0.6, 1,   1,   1,   0.6, 0.2],
        ]
        for (let x in this.board.board[0]) {
            for (let y in this.board.board) {
                if (this.board.board[y][x] == this.symbol) evaluation+=heatMap[y][x];
                if (this.board.board[y][x] == this.enemy) evaluation-=heatMap[y][x];
            }
        }

        return evaluation;
        
    }
    
    negamax(playerSymbol, depth, alpha=-9999, beta=9999, ) {
        if (depth == 0) return this.eval_position();

        let boardState = this.board.eval_state();
        if (boardState == boardStates.DRAW) return 0;
        
        const totalMoves = (this.board.width * this.board.height);
      
        for(let x = 0; x < this.board.width; x++) {// check if current player can win next move
            if(this.board.check_open(x) && this.board.check_win(x,playerSymbol)) {
                return (totalMoves - (this.board.history.length+1)) / 2;
            }
        }
            
        
        let max = (totalMoves - (this.board.history.length+1)) / 2; // init the best possible score with a lower bound of score.

        if(beta > max) {
          beta = max;                     // there is no need to keep beta above our max possible score.
          if(alpha >= beta) return beta;  // prune the exploration if the [alpha;beta] window is empty.
        }

        for (let x of [3,4,2,5,1,6,0]) { // compute the score of all possible next move and keep the best one
            const move = new Connect4move(x, playerSymbol)
            if(!this.board.validate_move(move)) continue;
            
            this.board.apply_move(move);
            
            const score = -this.negamax(playerSymbol*-1,depth-1, -beta, -alpha); // If current player plays col x, his score will be the opposite of opponent's score after playing col x

            this.board.undo();
            

            if(score >= beta) return score;  // prune the exploration if we find a possible move better than what we were looking for.
            if(score > alpha) alpha = score; // reduce the [alpha;beta] window for next exploration, as we only 
            // need to search for a position that is better than the best so far.
            
        }
        return alpha;
    }
}

class GameBoard {
    width;
    height;
    board;
    tileset;
    htmlNode;

    constructor(width, height, htmlNode) {
        this.htmlNode = htmlNode;

        this.width = width;
        this.height = height;
        this.board = [];
        for (let _=0;_<this.height;_++) {
            let row = []
            for (let __=0;__<this.width;__++) {
                row.push(0);
            }
            this.board.push(row);
        }
    }

    display() {
        for (let y in this.board) {
            let row = this.board[y];
            for (let x in row) {
                let dispStr = this.tileset[this.board[y][x]];
                let htmlTile = this.htmlNode.rows[y].cells[x];

                htmlTile.innerHTML = dispStr;
            }
        }
    }
}

class Connect4Board extends GameBoard { 
    tileset = {
        '0' : " ",
        '1' : "🔴",
        '-1' : "🔵",
    }
    history = [];
    win_length = 4;

    constructor() {
        super(7, 6, document.querySelector('.ConnectFourGame'));
    }


    validate_move(move) {
        if (move.location < 0) return false;
        if (move.location >= this.width) return false;
        if (!this.tileset.hasOwnProperty(move.value)) return false;
        const x = move.location;
        if (this.board[0][x] != Symbols.EMPTY) return false;
        return true;
    }

    undo() {
        let lastMove = this.history.pop();
        let x = lastMove.location;
        let y;
        for (y in this.board) {
            if (this.board[y][x] != Symbols.EMPTY) break;
        }
        
        this.board[y][x] = Symbols.EMPTY;
    }

    apply_move(move) {
        if (move.location < 0) throw new Error(`Move location=${move.location} out of range`);
        if (move.location >= this.width) throw new Error(`Move location=${move.location} out of range`);
        if (!this.tileset.hasOwnProperty(move.value)) throw new Error(`Move value=${move.value} not in tileset`);

        let x = move.location;

        if (this.board[0][x] != Symbols.EMPTY) throw new Error(`Column ${x} is full`);

        let y;
        for (y=this.height-1;y>=0;y--) {
            if (this.board[y][x] == Symbols.EMPTY) break;
        }
        
        this.board[y][x] = move.value;

        this.history.push(move);
    }

    check_win(x, symbol) {
        let y;
        for (y=this.height-1;y>=0;y--) {
            if (this.board[y][x] == Symbols.EMPTY) break;
        }

        this.board[y][x] = symbol;
        let boardState = this.eval_point(x, y);
        this.board[y][x] = Symbols.EMPTY;
        if (boardState == boardStates.WIN) return true;
        return false;

    }
    check_open(xPos) {
        return this.board[0][xPos] == Symbols.EMPTY;
    }
    
    eval_point(xPos, yPos) {
        xPos = Number(xPos);
        yPos = Number(yPos)
        let winStr = "";
        
        let xMin = Math.max(xPos-(this.win_length-1),0);
        let xMax = Math.min(xPos+(this.win_length-1),this.width-1);

        for (let x=xMin; x <= xMax; x++) {
            winStr += this.tileset[this.board[yPos][x]];
        }
            
        winStr += "|";

        let yMin = Math.max(yPos-(this.win_length-1),0);
        let yMax = Math.min(yPos+(this.win_length-1),this.height-1);

        for (let y=yMin; y <= yMax; y++) {
            winStr += this.tileset[this.board[y][xPos]];
        }
        winStr += "|";

        for (let i=-(this.win_length-1); i <= (this.win_length-1); i ++) {
            if (yPos+i < 0 | yPos+i >= this.height) continue;
            if (xPos+i < 0 | xPos+i >= this.width) continue;
            winStr += this.tileset[this.board[yPos+i][xPos+i]];
        }
        winStr += "|";
        
        for (let i=-(this.win_length-1); i <= (this.win_length-1); i ++) {
            if (yPos+i < 0 | yPos+i >= this.height) continue;
            if (xPos-i < 0 | xPos-i >= this.width) continue;
            winStr += this.tileset[this.board[yPos+i][xPos-i]];
        }
        let winRow = String(this.tileset[this.board[yPos][xPos]]).repeat(this.win_length);
        if (winStr.includes(winRow)) return boardStates.WIN;
        return boardStates.NOWIN;
    }

    eval_state() {
        let x = Number(this.history[this.history.length - 1].location);
        let y;
        for (y in this.board) {
            if (this.board[y][x] != Symbols.EMPTY) break;
        }
        
        if (this.eval_point(x,y) == boardStates.WIN) return boardStates.WIN;

        for (let row of this.board) {
            if (row.includes(Symbols.EMPTY)) return boardStates.CONTINUE;
        }
        return boardStates.DRAW;
    }             
        
}



let htmlTiles = document.querySelectorAll('td');

function select() {
    if (gameState == gameStates.PAUSED) return;
    this.classList.add('selected')
}
htmlTiles.forEach(tile => tile.addEventListener('mouseover',select))

function deSelect() {
    this.classList.remove('selected')
}
htmlTiles.forEach(tile => tile.addEventListener('mouseleave',deSelect))


function playerToggle() {
    if (this.innerHTML == "Human") this.innerHTML = "Robot";
    else if (this.innerHTML == "Robot") this.innerHTML = "Human";
}

let playerButtons = document.querySelectorAll('.playerButton')

playerButtons.forEach(button => button.addEventListener('click',playerToggle))

function take_turn() {
    if (gameState == gameStates.PAUSED) return;
    let moveMade = false;
    if (gameState == player1.symbol) moveMade = player1.take_turn();
    if (gameState == player2.symbol) moveMade = player2.take_turn();
    if (moveMade == false) return;

    const boardState = board.eval_state();
    if (boardState != boardStates.CONTINUE) {
        let disp;
        if (boardState == boardStates.DRAW) disp = "It's a draw.";
        else if (gameState == gameStates.BLUETURN) disp = "Blue Wins!";
        else if (gameState == gameStates.REDTURN) disp = "Red Wins!";
        document.querySelector(".gamestate").innerHTML = disp;
        gameState = gameStates.PAUSED;
    }
    gameState *= -1;
    board.display();
    
    if (gameState == player1.symbol && player1 instanceof AIplayer) take_turn();
    else if (gameState == player2.symbol && player2 instanceof AIplayer) take_turn();
    
}

document.body.onclick = take_turn;

let gameState = gameStates.PAUSED;
let player1, player2, board;


function start() {
    board = new Connect4Board();
    gameState = gameStates.REDTURN
    
    document.querySelector(".gamestate").innerHTML = "";

    if (playerButtons[1].innerHTML == "Human") player2 = new humanPlayer(-1, board);
    else player2 = new AIplayer(-1, board)

    if (playerButtons[0].innerHTML == "Human") player1 = new humanPlayer(1, board);
    else {
        player1 = new AIplayer(1, board);
        take_turn();
    }

    board.display()

    
}

document.querySelector(".playButton").addEventListener('click',start)