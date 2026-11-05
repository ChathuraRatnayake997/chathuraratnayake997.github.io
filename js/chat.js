/* ============================================
    Contact chat — iMessage-style message flow
    ============================================ */

(function () {
    const log = document.getElementById('chat-log');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const sendButton = form ? form.querySelector('.chat-send') : null;
    if (!log || !form || !input || !sendButton) return;

    const EMAILJS_PUBLIC_KEY = 'p94Rp8u13mlCDpmEg';
    const EMAILJS_TEMPLATE_ID = 'template_ew205tf';
    const EMAILJS_SERVICE_ID = 'service_tc1b52j';
    const DIRECT_EMAIL = 'armcdilsh@gmail.com';

    if (window.emailjs) {
        emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    }

    const state = {
        step: 'menu',
        name: '',
        email: '',
        message: ''
    };

    const GUIDANCE = "I'm a simple chat bot, not a live agent. You can play a game — xox, memory, mole or 2048 — or type contact to send me a direct message.";
    const GAME_COMMANDS = ['xox', 'memory', 'mole', 'whack', '2048'];

    let typingBubble = null;
    let activeGameStop = null;
    let pendingRematch = null;

    function scrollToBottom() {
        log.scrollTop = log.scrollHeight;
    }

    function createFace() {
        const face = document.createElement('span');
        face.className = 'chat-face';
        face.setAttribute('aria-hidden', 'true');
        return face;
    }

    function addBubble(text, from) {
        const row = document.createElement('div');
        row.className = 'chat-row is-' + from;

        if (from === 'bot') {
            const stack = document.createElement('div');
            stack.className = 'chat-stack';

            const name = document.createElement('span');
            name.className = 'chat-name';
            name.textContent = 'Chathura';

            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble';
            bubble.textContent = text;

            stack.append(name, bubble);
            row.append(createFace(), stack);
        } else {
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble';
            bubble.textContent = text;
            row.appendChild(bubble);
        }

        log.appendChild(row);
        scrollToBottom();
        return row;
    }

    function showTyping() {
        if (typingBubble) return typingBubble;

        typingBubble = document.createElement('div');
        typingBubble.className = 'chat-row is-bot';
        typingBubble.setAttribute('aria-hidden', 'true');

        const stack = document.createElement('div');
        stack.className = 'chat-stack';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';

        const dots = document.createElement('span');
        dots.className = 'chat-typing';
        for (let i = 0; i < 3; i += 1) {
            dots.appendChild(document.createElement('span'));
        }

        bubble.appendChild(dots);
        stack.appendChild(bubble);
        typingBubble.append(createFace(), stack);
        log.appendChild(typingBubble);
        scrollToBottom();
        return typingBubble;
    }

    function hideTyping() {
        if (typingBubble) {
            typingBubble.remove();
            typingBubble = null;
        }
    }

    function botSay(text, delay) {
        return new Promise((resolve) => {
            showTyping();
            window.setTimeout(() => {
                hideTyping();
                addBubble(text, 'bot');
                resolve();
            }, delay || 750);
        });
    }

    function setBusy(busy) {
        input.disabled = busy;
        sendButton.disabled = busy;
    }

    input.addEventListener('input', () => {
        form.classList.toggle('has-text', input.value.trim() !== '');
        resizeInput();
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (!input.disabled) form.requestSubmit();
        }
    });

    function resizeInput() {
        input.style.height = 'auto';
        const height = Math.min(input.scrollHeight, 132);
        input.style.height = height + 'px';
        input.style.overflowY = input.scrollHeight > 132 ? 'auto' : 'hidden';
    }

    function greet(delay) {
        botSay("Hey! I'm Chathura.", delay || 500)
            .then(() => botSay("This isn't an agent-connected chat — it works as a different kind of contact form.", 800))
            .then(() => botSay('You can either send me a message or play a simple game.', 800))
            .then(() => botSay('What would you like to do — send a message, or play a game?', 800));
    }

    // ── Tic-tac-toe easter egg ──
    const WIN_LINES = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    function getWinner(board) {
        for (const [a, b, c] of WIN_LINES) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        return board.every(Boolean) ? 'draw' : null;
    }

    function minimax(board, turn, depth) {
        const result = getWinner(board);
        if (result === 'O') return 10 - depth;
        if (result === 'X') return depth - 10;
        if (result === 'draw') return 0;

        const open = board.map((value, index) => value ? -1 : index).filter((index) => index !== -1);
        const maximizing = turn === 'O';
        let best = maximizing ? -Infinity : Infinity;

        for (const index of open) {
            board[index] = turn;
            const score = minimax(board, turn === 'O' ? 'X' : 'O', depth + 1);
            board[index] = '';
            best = maximizing ? Math.max(best, score) : Math.min(best, score);
        }

        return best;
    }

    function chooseMove(board) {
        const open = board.map((value, index) => value ? -1 : index).filter((index) => index !== -1);
        if (!open.length) return null;
        if (Math.random() < 0.25) {
            return open[Math.floor(Math.random() * open.length)];
        }

        let bestScore = -Infinity;
        let bestMove = open[0];
        for (const index of open) {
            board[index] = 'O';
            const score = minimax(board, 'X', 0);
            board[index] = '';
            if (score > bestScore) {
                bestScore = score;
                bestMove = index;
            }
        }
        return bestMove;
    }

    function removeGames() {
        if (activeGameStop) {
            activeGameStop();
            activeGameStop = null;
        }

        document.querySelectorAll('.chat-game').forEach((game) => {
            const row = game.closest('.chat-row');
            if (row) row.remove();
        });
    }

    function createGameShell(extraClass) {
        const row = document.createElement('div');
        row.className = 'chat-row is-bot is-game';

        const stack = document.createElement('div');
        stack.className = 'chat-stack';

        const name = document.createElement('span');
        name.className = 'chat-name';
        name.textContent = 'Chathura';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble chat-game' + (extraClass ? ' ' + extraClass : '');

        const status = document.createElement('div');
        status.className = 'game-status';
        status.setAttribute('aria-live', 'polite');

        const restart = document.createElement('button');
        restart.type = 'button';
        restart.className = 'ttt-restart';
        restart.textContent = 'Play again';
        restart.hidden = true;

        bubble.append(status, restart);
        stack.append(name, bubble);
        row.append(createFace(), stack);
        log.appendChild(row);
        scrollToBottom();

        return { row, bubble, status, restart };
    }

    function addGame() {
        removeGames();

        const board = Array(9).fill('');
        let finished = false;
        let thinking = false;

        const row = document.createElement('div');
        row.className = 'chat-row is-bot is-game';

        const stack = document.createElement('div');
        stack.className = 'chat-stack';

        const name = document.createElement('span');
        name.className = 'chat-name';
        name.textContent = 'Chathura';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble chat-game';

        const status = document.createElement('div');
        status.className = 'ttt-status';
        status.setAttribute('aria-live', 'polite');

        const grid = document.createElement('div');
        grid.className = 'ttt-board';
        grid.setAttribute('role', 'grid');
        grid.setAttribute('aria-label', 'Tic tac toe board');

        const cells = [];
        for (let index = 0; index < 9; index += 1) {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'ttt-cell';
            cell.setAttribute('aria-label', 'Square ' + (index + 1));
            cell.addEventListener('click', () => play(index));
            grid.appendChild(cell);
            cells.push(cell);
        }

        bubble.append(status, grid);
        stack.append(name, bubble);
        row.append(createFace(), stack);
        log.appendChild(row);
        scrollToBottom();

        updateStatus("Your move — you're X");

        function updateStatus(text) {
            status.textContent = text;
        }

        function mark(index, symbol) {
            board[index] = symbol;
            const cell = cells[index];
            cell.textContent = symbol;
            cell.classList.add(symbol === 'X' ? 'is-x' : 'is-o');
            cell.disabled = true;
        }

        function finish(result) {
            finished = true;
            cells.forEach((cell) => { cell.disabled = true; });

            let message;

            if (result === 'X') {
                message = 'You won! Want a rematch? Say yes or no.';
                window.setTimeout(celebrate, 250);
            } else if (result === 'O') {
                message = "I won this time (I'm O). Want a rematch? Say yes or no.";
            } else {
                message = "It's a draw. Want a rematch? Say yes or no.";
            }

            row.remove();
            pendingRematch = 'xox';
            botSay(message, 500);
        }

        function play(index) {
            if (finished || thinking || board[index]) return;

            mark(index, 'X');
            const result = getWinner(board);
            if (result) {
                finish(result);
                return;
            }

            thinking = true;
            updateStatus('Chathura is thinking…');
            cells.forEach((cell) => { cell.disabled = true; });

            window.setTimeout(() => {
                const move = chooseMove(board);
                if (move === null) return;

                mark(move, 'O');
                thinking = false;

                const outcome = getWinner(board);
                if (outcome) {
                    finish(outcome);
                    return;
                }

                cells.forEach((cell, i) => { cell.disabled = Boolean(board[i]); });
                updateStatus('Your move');
                scrollToBottom();
            }, 480);
        }
    }

    function startGame(rematch) {
        botSay(
            rematch
                ? "Rematch! You're X — your move. Type contact to quit and send me a message."
                : "You found the easter egg! Let's play tic-tac-toe — you're X. Type contact to quit and send me a message.",
            500
        ).then(addGame);
    }

    // ── Memory match ──
    function startMemory() {
        botSay('Memory match! Find all six pairs. Type contact to quit and send me a message.', 450).then(addMemoryGame);
    }

    function addMemoryGame() {
        removeGames();

        const pairs = ['bear', 'fox', 'panda', 'lion', 'owl', 'frog'];
        const shell = createGameShell('mem-game');
        const { bubble, status, restart } = shell;

        const board = document.createElement('div');
        board.className = 'mem-board';
        board.setAttribute('role', 'grid');
        board.setAttribute('aria-label', 'Memory match board');

        const cards = [];
        for (let index = 0; index < pairs.length * 2; index += 1) {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'mem-card';
            card.setAttribute('aria-label', 'Card ' + (index + 1));

            const img = document.createElement('img');
            img.alt = '';
            img.decoding = 'async';
            card.appendChild(img);

            card.addEventListener('click', () => flip(index));
            board.appendChild(card);
            cards.push(card);
        }

        bubble.insertBefore(board, restart);

        let deck = [];
        let flipped = [];
        let matched = 0;
        let moves = 0;
        let locked = false;

        function shuffle(list) {
            for (let i = list.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [list[i], list[j]] = [list[j], list[i]];
            }
            return list;
        }

        function buildDeck() {
            deck = shuffle(pairs.concat(pairs));
            cards.forEach((card, index) => {
                card.className = 'mem-card';
                card.disabled = false;
                card.querySelector('img').src = 'assets/icons/game/' + deck[index] + '.svg';
            });
            flipped = [];
            matched = 0;
            moves = 0;
            locked = false;
            restart.hidden = true;
            status.textContent = 'Find the pairs · 0/' + pairs.length;
        }

        function flip(index) {
            const card = cards[index];
            if (locked || card.classList.contains('is-flipped') || card.classList.contains('is-matched')) {
                return;
            }

            card.classList.add('is-flipped');
            flipped.push(index);

            if (flipped.length < 2) return;

            moves += 1;
            const [first, second] = flipped;

            if (deck[first] === deck[second]) {
                cards[first].classList.add('is-matched');
                cards[second].classList.add('is-matched');
                cards[first].disabled = true;
                cards[second].disabled = true;
                matched += 1;
                flipped = [];

                if (matched === pairs.length) {
                    shell.row.remove();
                    pendingRematch = 'memory';
                    botSay('All pairs found in ' + moves + ' moves! Want to play again? Say yes or no.', 500);
                    celebrate();
                } else {
                    status.textContent = 'Find the pairs · ' + matched + '/' + pairs.length;
                }
                return;
            }

            locked = true;
            status.textContent = 'Not a match…';

            window.setTimeout(() => {
                cards[first].classList.remove('is-flipped');
                cards[second].classList.remove('is-flipped');
                flipped = [];
                locked = false;
                status.textContent = 'Find the pairs · ' + matched + '/' + pairs.length;
            }, 700);
        }

        restart.addEventListener('click', buildDeck);
        buildDeck();
    }

    // ── Whack-a-mole ──
    function startMole() {
        botSay('Whack-a-mole! Tap the animals for 20 seconds. Type contact to quit and send me a message.', 450).then(addMoleGame);
    }

    function addMoleGame() {
        removeGames();

        const animals = ['bear', 'fox', 'panda', 'lion', 'owl', 'frog', 'koala', 'tiger-face'];
        const shell = createGameShell('mole-game');
        const { bubble, status, restart } = shell;

        const board = document.createElement('div');
        board.className = 'mole-board';
        board.setAttribute('role', 'grid');
        board.setAttribute('aria-label', 'Whack-a-mole board');

        const holes = [];
        for (let index = 0; index < 9; index += 1) {
            const hole = document.createElement('button');
            hole.type = 'button';
            hole.className = 'mole-hole';
            hole.setAttribute('aria-label', 'Hole ' + (index + 1));

            const img = document.createElement('img');
            img.alt = '';
            img.decoding = 'async';
            hole.appendChild(img);

            hole.addEventListener('click', () => whack(hole));
            board.appendChild(hole);
            holes.push(hole);
        }

        bubble.insertBefore(board, restart);

        let score = 0;
        let timeLeft = 20;
        let playing = false;
        let tickId = null;
        let popId = null;
        const hideTimers = new Set();

        function updateStatus() {
            status.textContent = 'Score ' + score + ' · ' + timeLeft + 's left';
        }

        function schedulePop() {
            popId = window.setTimeout(() => {
                if (!playing) return;

                const free = holes.filter((hole) => !hole.classList.contains('is-up'));
                if (free.length) {
                    const hole = free[Math.floor(Math.random() * free.length)];
                    hole.querySelector('img').src =
                        'assets/icons/game/' + animals[Math.floor(Math.random() * animals.length)] + '.svg';
                    hole.classList.add('is-up');

                    const timer = window.setTimeout(() => {
                        hole.classList.remove('is-up');
                    }, 900);
                    hideTimers.add(timer);
                }

                schedulePop();
            }, 450 + Math.random() * 350);
        }

        function whack(hole) {
            if (!playing || !hole.classList.contains('is-up')) return;
            hole.classList.remove('is-up');
            score += 1;
            updateStatus();
        }

        function clearTimers() {
            window.clearInterval(tickId);
            window.clearTimeout(popId);
            hideTimers.forEach((timer) => window.clearTimeout(timer));
            hideTimers.clear();
        }

        function endGame() {
            playing = false;
            clearTimers();
            holes.forEach((hole) => hole.classList.remove('is-up'));

            shell.row.remove();
            pendingRematch = 'mole';
            botSay('Time! You scored ' + score + '. Want a rematch? Say yes or no.', 500);

            if (score >= 8) celebrate();
        }

        function start() {
            clearTimers();
            score = 0;
            timeLeft = 20;
            playing = true;
            restart.hidden = true;
            holes.forEach((hole) => hole.classList.remove('is-up'));
            updateStatus();

            tickId = window.setInterval(() => {
                timeLeft -= 1;
                if (timeLeft <= 0) {
                    endGame();
                } else {
                    updateStatus();
                }
            }, 1000);

            schedulePop();
        }

        restart.addEventListener('click', start);
        activeGameStop = () => {
            playing = false;
            clearTimers();
        };

        start();
    }

    // ── 2048 ──
    function start2048(rematch) {
        botSay(
            rematch
                ? 'New board! Swipe it or use your arrow keys. Type contact to quit and send me a message.'
                : '2048! Swipe the board or use your arrow keys to join the tiles. Type contact to quit and send me a message.',
            450
        ).then(add2048Game);
    }

    function add2048Game() {
        removeGames();

        const shell = createGameShell('g2048-game');
        const { bubble, status, restart } = shell;

        const board = document.createElement('div');
        board.className = 'g2048-board';
        board.setAttribute('role', 'grid');
        board.setAttribute('aria-label', '2048 board');

        const cells = [];
        for (let index = 0; index < 16; index += 1) {
            const cell = document.createElement('div');
            cell.className = 'g2048-cell';
            board.appendChild(cell);
            cells.push(cell);
        }

        bubble.insertBefore(board, restart);

        let grid = Array(16).fill(0);
        let score = 0;
        let over = false;
        let won = false;

        function spawn() {
            const empty = grid.map((value, index) => value ? -1 : index).filter((index) => index !== -1);
            if (!empty.length) return;
            const index = empty[Math.floor(Math.random() * empty.length)];
            grid[index] = Math.random() < 0.9 ? 2 : 4;
        }

        function render() {
            grid.forEach((value, index) => {
                const cell = cells[index];
                cell.textContent = value ? String(value) : '';
                cell.className = 'g2048-cell' + (value ? (value > 2048 ? ' v-super' : ' v' + value) : '');
            });
            status.textContent = 'Score ' + score;
        }

        function readLine(dir, index) {
            const line = [];
            for (let i = 0; i < 4; i += 1) {
                if (dir === 'left') line.push(grid[index * 4 + i]);
                if (dir === 'right') line.push(grid[index * 4 + (3 - i)]);
                if (dir === 'up') line.push(grid[i * 4 + index]);
                if (dir === 'down') line.push(grid[(3 - i) * 4 + index]);
            }
            return line;
        }

        function writeLine(dir, index, line) {
            for (let i = 0; i < 4; i += 1) {
                if (dir === 'left') grid[index * 4 + i] = line[i];
                if (dir === 'right') grid[index * 4 + (3 - i)] = line[i];
                if (dir === 'up') grid[i * 4 + index] = line[i];
                if (dir === 'down') grid[(3 - i) * 4 + index] = line[i];
            }
        }

        function collapse(line) {
            const numbers = line.filter(Boolean);
            const result = [];
            let gained = 0;

            for (let i = 0; i < numbers.length; i += 1) {
                if (numbers[i] === numbers[i + 1]) {
                    const merged = numbers[i] * 2;
                    result.push(merged);
                    gained += merged;
                    i += 1;
                } else {
                    result.push(numbers[i]);
                }
            }

            while (result.length < 4) result.push(0);
            return { line: result, gained };
        }

        function canMove() {
            if (grid.some((value) => !value)) return true;
            for (let row = 0; row < 4; row += 1) {
                for (let col = 0; col < 4; col += 1) {
                    const value = grid[row * 4 + col];
                    if (col < 3 && grid[row * 4 + col + 1] === value) return true;
                    if (row < 3 && grid[(row + 1) * 4 + col] === value) return true;
                }
            }
            return false;
        }

        function move(dir) {
            if (over) return;

            let moved = false;
            let gained = 0;

            for (let index = 0; index < 4; index += 1) {
                const line = readLine(dir, index);
                const result = collapse(line);
                if (result.line.some((value, i) => value !== line[i])) moved = true;
                writeLine(dir, index, result.line);
                gained += result.gained;
            }

            if (!moved) return;

            score += gained;
            spawn();
            render();

            if (!won && grid.includes(2048)) {
                won = true;
                shell.row.remove();
                pendingRematch = '2048';
                botSay('You made 2048! Score ' + score + '. Want to play again? Say yes or no.', 500);
                celebrate();
                return;
            }

            if (!canMove()) {
                over = true;
                shell.row.remove();
                pendingRematch = '2048';
                botSay('Game over — ' + score + ' points. Want to play again? Say yes or no.', 500);
            }
        }

        function reset() {
            grid = Array(16).fill(0);
            score = 0;
            over = false;
            won = false;
            spawn();
            spawn();
            render();
        }

        function onKey(event) {
            if (!board.isConnected) return;

            const tag = document.activeElement ? document.activeElement.tagName : '';
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            const rect = board.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;

            const keys = {
                ArrowUp: 'up',
                ArrowDown: 'down',
                ArrowLeft: 'left',
                ArrowRight: 'right'
            };

            if (keys[event.key]) {
                event.preventDefault();
                move(keys[event.key]);
            }
        }

        let touchStart = null;

        function onTouchStart(event) {
            const touch = event.changedTouches[0];
            touchStart = { x: touch.clientX, y: touch.clientY };
        }

        function onTouchEnd(event) {
            if (!touchStart) return;

            const touch = event.changedTouches[0];
            const dx = touch.clientX - touchStart.x;
            const dy = touch.clientY - touchStart.y;
            touchStart = null;

            if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;

            if (Math.abs(dx) > Math.abs(dy)) {
                move(dx > 0 ? 'right' : 'left');
            } else {
                move(dy > 0 ? 'down' : 'up');
            }
        }

        document.addEventListener('keydown', onKey);
        board.addEventListener('touchstart', onTouchStart, { passive: true });
        board.addEventListener('touchend', onTouchEnd, { passive: true });

        activeGameStop = () => {
            document.removeEventListener('keydown', onKey);
            board.removeEventListener('touchstart', onTouchStart);
            board.removeEventListener('touchend', onTouchEnd);
        };

        reset();
    }

    function celebrate() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const card = document.querySelector('.chat-card');
        if (!card) return;

        const rain = document.createElement('div');
        rain.className = 'trophy-rain';
        rain.setAttribute('aria-hidden', 'true');

        const fall = card.clientHeight + 80;
        const count = 18;

        for (let index = 0; index < count; index += 1) {
            const trophy = document.createElement('img');
            trophy.src = 'assets/icons/game/trophy.svg';
            trophy.alt = '';
            trophy.style.left = (Math.random() * 100).toFixed(2) + '%';
            trophy.style.width = Math.round(20 + Math.random() * 18) + 'px';
            trophy.style.setProperty('--fall', fall + 'px');
            trophy.style.setProperty('--spin', Math.round(Math.random() * 720 - 360) + 'deg');
            trophy.style.animationDuration = (1.5 + Math.random() * 1.1).toFixed(2) + 's';
            trophy.style.animationDelay = (Math.random() * 0.9).toFixed(2) + 's';
            rain.appendChild(trophy);
        }

        card.appendChild(rain);
        window.setTimeout(() => rain.remove(), 4200);
    }

    function sendEmail() {
        setBusy(true);

        botSay('Sending your message…', 600).then(() => {
            const params = {
                from_name: state.name,
                from_email: state.email,
                subject: 'Website chat — ' + state.name,
                message: state.message
            };

            if (!window.emailjs) {
                failed();
                return;
            }

            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params, {
                publicKey: EMAILJS_PUBLIC_KEY
            }).then(() => {
                botSay(
                    'Sent! Thanks, ' + state.name + ". I'll get back to you at " + state.email +
                        ' soon. Want to send another message? Say yes or no.',
                    650
                ).then(() => {
                    state.step = 'sent';
                    pendingRematch = 'contact';
                    setBusy(false);
                });
            }).catch(failed);
        });
    }

    function failed() {
        botSay(
            "Hmm, that message didn't go through. You can email me directly at " + DIRECT_EMAIL +
                '. Want to try again? Say yes or no.',
            650
        ).then(() => {
            state.step = 'sent';
            pendingRematch = 'contact-failed';
            setBusy(false);
        });
    }

    function startContactFlow() {
        removeGames();
        pendingRematch = null;
        state.step = 'name';
        state.name = '';
        state.email = '';
        state.message = '';
        setBusy(false);
        botSay("Sure — let's get your message to me. What's your name?", 500);
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const value = input.value.trim();
        if (!value || state.step === 'sending' || state.step === 'done') return;

        addBubble(value, 'user');
        input.value = '';
        form.classList.remove('has-text');
        resizeInput();

        const reply = value.toLowerCase();
        const isCommand = GAME_COMMANDS.indexOf(reply) !== -1;

        if (reply === 'contact') {
            startContactFlow();
            return;
        }

        if (pendingRematch) {
            const wantsRematch = /^(y|yes|yeah|yep|sure|ok|okay|go|play)$/.test(reply);
            const declines = /^(n|no|nope|nah|not now)$/.test(reply);
            const game = pendingRematch;

            if (wantsRematch) {
                pendingRematch = null;

                if (game === 'contact' || game === 'contact-failed') {
                    startContactFlow();
                } else if (game === 'mole') {
                    startMole();
                } else if (game === 'xox') {
                    startGame(true);
                } else if (game === '2048') {
                    start2048(true);
                } else if (game === 'memory') {
                    startMemory();
                }
                return;
            }

            if (declines) {
                pendingRematch = null;

                if (game === 'contact') {
                    botSay('It was a pleasure meeting you — take care!', 500);
                    state.step = 'done';
                    setBusy(true);
                    return;
                }

                if (game === 'contact-failed') {
                    botSay('No worries — you can email me directly at ' + DIRECT_EMAIL + '. Take care!', 500);
                    state.step = 'done';
                    setBusy(true);
                    return;
                }

                botSay('No worries! You can type contact to send me a direct message, or play another game — xox, memory, mole or 2048.', 500);
                return;
            }

            pendingRematch = null;

            if (game === 'contact' || game === 'contact-failed') {
                botSay('Just say yes to send another message, or no to wrap up.', 500);
                pendingRematch = game;
                return;
            }

            if (!isCommand) {
                botSay(GUIDANCE, 500);
                return;
            }
        }

        if (isCommand) {
            if (reply === 'xox') {
                startGame();
            } else if (reply === 'memory') {
                startMemory();
            } else if (reply === 'mole' || reply === 'whack') {
                startMole();
            } else if (reply === '2048') {
                start2048();
            }
            return;
        }

        if (document.querySelector('.chat-game')) {
            botSay(GUIDANCE, 500);
            return;
        }

        if (state.step === 'menu') {
            const wantsGame = /\b(play|game|games)\b/.test(reply);
            const wantsMessage = /\b(send|message|messages)\b/.test(reply);

            if (wantsGame && !wantsMessage) {
                state.step = 'choose-game';
                botSay('Great! Type xox, memory, mole or 2048 to start a game.', 600);
                return;
            }

            if (wantsMessage && !wantsGame) {
                state.step = 'name';
                botSay("Great! What's your name?", 600);
                return;
            }

            if (wantsGame && wantsMessage) {
                botSay('Which one would you like — send a message, or play a game?', 600);
                return;
            }

            botSay('If you’d like, you can type “message” to send me a message, or “game” to play a game.', 600);
            return;
        }

        if (state.step === 'choose-game') {
            if (/\b(send|message|messages)\b/.test(reply)) {
                state.step = 'name';
                botSay("Great! What's your name?", 600);
                return;
            }

            botSay('Type xox, memory, mole or 2048 to start a game — or say message to send me a message.', 600);
            return;
        }

        if (state.step === 'name') {
            if (value.length < 2) {
                botSay('Mind sharing your name? Even just a first name works.', 650);
                return;
            }
            state.name = value;
            state.step = 'email';
            botSay('Nice to meet you, ' + value + '! What’s your email address?', 800);
            return;
        }

        if (state.step === 'email') {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
                botSay("That email doesn't look quite right — could you check it and type it again?", 650);
                return;
            }
            state.email = value;
            state.step = 'message';
            botSay('Got it. What would you like to tell me?', 800);
            return;
        }

        if (state.step === 'message') {
            state.message = value;
            state.step = 'sending';
            sendEmail();
        }
    });

    let hasGreeted = false;

    function startGreeting(delay) {
        if (hasGreeted) return;
        hasGreeted = true;
        greet(delay);
    }

    const contactSection = document.getElementById('contact');

    if (contactSection && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                startGreeting(2000);
                observer.disconnect();
            }
        }, { threshold: 0.2 });

        observer.observe(contactSection);
    } else {
        startGreeting(2000);
    }
})();
