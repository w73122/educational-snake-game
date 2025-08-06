/*
 * script.js
 *
 * Implements the core logic for the Educational Snake Game. The game is
 * responsive, supporting keyboard controls for desktop and on‑screen
 * directional buttons for mobile devices. Players select a subject
 * (math or English) and a difficulty level before starting. During
 * gameplay, the snake must consume the food item that corresponds to
 * the correct answer of the current question. Eating the correct
 * answer increases the player's score and grows the snake; eating a
 * wrong answer triggers a penalty. The game ends if the snake hits
 * itself.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM references
  const menuDiv       = document.getElementById('menu');
  const gameContainer = document.getElementById('gameContainer');
  const startBtn      = document.getElementById('startBtn');
  const backBtn       = document.getElementById('backToMenuBtn');
  const categorySel   = document.getElementById('categorySelect');
  const difficultySel = document.getElementById('difficultySelect');
  const questionSpan  = document.getElementById('question');
  const scoreSpan     = document.getElementById('score');
  const canvas        = document.getElementById('gameCanvas');
  const ctx           = canvas.getContext('2d');

  // Control buttons
  const upBtn    = document.getElementById('upBtn');
  const downBtn  = document.getElementById('downBtn');
  const leftBtn  = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');

  // Game state variables
  // Adjusted grid size: fewer cells to make each cell larger, improving
  // readability of numbers and words on small screens. A 10×10 grid
  // yields noticeably bigger squares than the previous 20×20 board.
  const gridSize = 10;
  let cellSize;                  // computed pixel size of each cell
  let snake = [];                // array of {x,y} segments, head at index 0
  let direction = {x: 1, y: 0};  // current movement direction
  let nextDirection = {x: 1, y: 0}; // direction to turn at next tick
  let items = [];                // array of answer items on board
  let currentQuestion;           // current question object
  let score = 0;                 // player's score
  let gameInterval;              // interval handle for game loop

  // Colours derived from CSS variables. These values ensure canvas
  // drawings match the theme defined in the stylesheet. Fallbacks are
  // provided in case the variables are not defined.
  const computedStyles = getComputedStyle(document.documentElement);
  const accentColor = computedStyles.getPropertyValue('--accent').trim() || '#FF7043';
  const wrongColor  = computedStyles.getPropertyValue('--wrong').trim()  || '#039BE5';
  const headColor   = computedStyles.getPropertyValue('--dark').trim()   || '#2E7D32';
  const bodyColor   = computedStyles.getPropertyValue('--primary').trim()|| '#4CAF50';
  const gridColor   = '#C8E6C9';
  const bgColor     = '#F1F8E9';

  // Use a single colour for all answer items so children must think about the answer
  const answerColor = computedStyles.getPropertyValue('--secondary').trim() || '#66BB6A';

  /**
   * Adjust the canvas size based on the viewport, keeping a square aspect
   * ratio and ensuring the entire game board is visible on smaller screens.
   */
  function adjustCanvas() {
    // Use 90% of viewport width, but cap at 600px for desktop
    const maxWidth = Math.min(window.innerWidth * 0.9, 600);
    canvas.width  = maxWidth;
    canvas.height = maxWidth;
    cellSize = canvas.width / gridSize;
  }

  // Recalculate canvas size whenever the window resizes
  window.addEventListener('resize', adjustCanvas);

  /**
   * Initialise a new game. This resets the snake, direction, score,
   * generates the first question, and starts the game loop.
   */
  function startGame() {
    adjustCanvas();
    // Reset snake to starting position in middle of grid
    snake = [{ x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    updateScore();
    nextQuestion();
    // Clear any existing interval before starting a new one
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 150);
  }

  /**
   * Update the displayed score.
   */
  function updateScore() {
    scoreSpan.textContent = '分數: ' + score;
  }

  /**
   * Generate the next question and place the answer items on the board.
   */
  function nextQuestion() {
    const category   = categorySel.value;
    const difficulty = difficultySel.value;
    currentQuestion  = generateQuestion(category, difficulty);
    questionSpan.textContent = currentQuestion.question;
    placeItems(currentQuestion);
    draw();
  }

  /**
   * Place answer items on random empty positions on the board. Ensures that
   * items do not overlap the snake or one another.
   *
   * @param {Object} questionObj The current question with answers array
   */
  function placeItems(questionObj) {
    items = [];
    const answers = questionObj.answers;
    answers.forEach(ans => {
      let pos;
      // Find an unoccupied position
      do {
        pos = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
      } while (isOccupied(pos.x, pos.y) || items.some(item => item.x === pos.x && item.y === pos.y));
      items.push({ x: pos.x, y: pos.y, value: ans.value, correct: ans.correct });
    });
  }

  /**
   * Check whether a grid coordinate is occupied by the snake.
   *
   * @param {number} x The x‑coordinate
   * @param {number} y The y‑coordinate
   * @returns {boolean} True if occupied, false otherwise
   */
  function isOccupied(x, y) {
    return snake.some(seg => seg.x === x && seg.y === y);
  }

  /**
   * The main game loop. Moves the snake, checks for collisions,
   * handles eating items, and triggers drawing.
   */
  function gameLoop() {
    // Update direction to the nextDirection to avoid immediate reversal
    direction = nextDirection;
    // Compute new head position; hitting a wall ends the game (no wrap‑around)
    const nextX = snake[0].x + direction.x;
    const nextY = snake[0].y + direction.y;
    // If the snake hits the border, the game ends
    if (nextX < 0 || nextX >= gridSize || nextY < 0 || nextY >= gridSize) {
      endGame();
      return;
    }
    const newHead = { x: nextX, y: nextY };
    // Check collision with self
    if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      endGame();
      return;
    }
    // Check if food item is eaten
    let foundItemIndex = -1;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.x === newHead.x && item.y === newHead.y) {
        foundItemIndex = i;
        break;
      }
    }
    if (foundItemIndex >= 0) {
      const item = items[foundItemIndex];
      if (item.correct) {
        // Correct answer: grow snake and increase score
        snake.unshift(newHead);
        score++;
        updateScore();
        // Generate a new question
        nextQuestion();
        return;
      } else {
        // Wrong answer: end game immediately
        endGame();
        return;
      }
    }
    // If no item eaten, move snake: add new head and remove tail
    snake.unshift(newHead);
    snake.pop();
    draw();
  }

  /**
   * Draw the current game state: background, grid, snake and items.
   */
  function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw background fill
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw light grid lines to help players judge positions
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 1; i < gridSize; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }
    // Draw snake segments
    snake.forEach((segment, index) => {
      ctx.fillStyle = (index === 0) ? headColor : bodyColor;
      ctx.fillRect(segment.x * cellSize, segment.y * cellSize, cellSize, cellSize);
      // subtle border to differentiate segments
      ctx.strokeStyle = '#A5D6A7';
      ctx.strokeRect(segment.x * cellSize, segment.y * cellSize, cellSize, cellSize);
    });
    // Draw answer items
    items.forEach(item => {
      // All answer items share the same colour so that players must solve
      ctx.fillStyle = answerColor;
      ctx.beginPath();
      const cx = item.x * cellSize + cellSize / 2;
      const cy = item.y * cellSize + cellSize / 2;
      const radius = cellSize * 0.35;
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      // Draw answer text centred on the item. Adjust font size so that
      // longer words still fit within the circle. Estimate each
      // character consumes ~0.6 of the font size in width. If the word
      // would overflow the circle, reduce the font size accordingly.
      ctx.fillStyle = '#FFFFFF';
      const text = item.value.toString();
      const baseSize = cellSize * 0.4;
      const maxWidth = radius * 2 * 0.8; // 80% of diameter reserved for text
      const charWidthRatio = 0.6;
      const sizeForWord = maxWidth / (text.length * charWidthRatio);
      const fontSize = Math.min(baseSize, sizeForWord);
      ctx.font = `${fontSize.toFixed(2)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, cy);
    });
  }

  /**
   * Handle game over: stop the loop and alert the player.
   */
  function endGame() {
    clearInterval(gameInterval);
    // Provide a playful alert. This could be improved by a custom overlay
    alert('遊戲結束！您的得分是：' + score);
    // Return to menu automatically
    backBtn.click();
  }

  /**
   * Update the nextDirection variable, preventing the snake from
   * reversing directly back onto itself.
   *
   * @param {Object} newDir Object with x,y fields indicating direction
   */
  function setDirection(newDir) {
    // Do not allow 180‑degree reversal
    if (direction.x + newDir.x === 0 && direction.y + newDir.y === 0) return;
    nextDirection = newDir;
  }

  // Keyboard controls: listen for arrow keys
  document.addEventListener('keydown', (e) => {
    if (menuDiv.style.display !== 'none') return; // ignore when menu is visible
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        setDirection({ x: 0, y: -1 });
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        setDirection({ x: 0, y: 1 });
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        setDirection({ x: -1, y: 0 });
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        setDirection({ x: 1, y: 0 });
        break;
    }
  });

  // On‑screen button handlers: use pointer events for both click and touch
  upBtn.addEventListener('click',    () => setDirection({ x: 0, y: -1 }));
  downBtn.addEventListener('click',  () => setDirection({ x: 0, y: 1 }));
  leftBtn.addEventListener('click',  () => setDirection({ x: -1, y: 0 }));
  rightBtn.addEventListener('click', () => setDirection({ x: 1, y: 0 }));

  // Mobile touches: ensure touchstart also triggers directions for better responsiveness
  upBtn.addEventListener('touchstart',    (e) => { e.preventDefault(); setDirection({ x: 0, y: -1 }); });
  downBtn.addEventListener('touchstart',  (e) => { e.preventDefault(); setDirection({ x: 0, y: 1 });  });
  leftBtn.addEventListener('touchstart',  (e) => { e.preventDefault(); setDirection({ x: -1, y: 0 }); });
  rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); setDirection({ x: 1, y: 0 });  });

  // Start button: hide menu and start game
  startBtn.addEventListener('click', () => {
    menuDiv.style.display = 'none';
    gameContainer.style.display = 'flex';
    startGame();
  });

  // Back button: stop game and return to menu
  backBtn.addEventListener('click', () => {
    clearInterval(gameInterval);
    gameContainer.style.display = 'none';
    menuDiv.style.display = 'flex';
  });

  /**
   * Generate a question based on the selected category and difficulty.
   *
   * @param {string} category 'math' or 'english'
   * @param {string} difficulty 'easy', 'medium', or 'hard'
   * @returns {Object} An object containing a question string and an array of answer objects
   */
  function generateQuestion(category, difficulty) {
    if (category === 'math') {
      return generateMathQuestion(difficulty);
    } else {
      return generateEnglishQuestion(difficulty);
    }
  }

  /**
   * Generate a mathematics question appropriate for the given difficulty.
   * Each returned object includes a question string and an array of answer
   * objects containing the value and a flag indicating the correct answer.
   *
   * @param {string} difficulty
   * @returns {Object}
   */
  function generateMathQuestion(difficulty) {
    let question, answer;
    let wrongs = [];
    // Helper to generate wrong answers near the correct answer
    function getRandomWrong(correct) {
      let val;
      do {
        val = correct + Math.floor(Math.random() * 5) - 2; // ±2 range
      } while (val === correct || val < 0 || wrongs.includes(val));
      wrongs.push(val);
      return val;
    }
    if (difficulty === 'easy') {
      // Simple addition or subtraction with small numbers
      if (Math.random() < 0.5) {
        const a = randInt(1, 10);
        const b = randInt(1, 10);
        question = `${a} + ${b}`;
        answer = a + b;
      } else {
        const a = randInt(1, 10);
        const b = randInt(1, a);
        question = `${a} - ${b}`;
        answer = a - b;
      }
    } else if (difficulty === 'medium') {
      const opChoice = Math.random();
      if (opChoice < 0.33) {
        const a = randInt(1, 20);
        const b = randInt(1, 20);
        question = `${a} + ${b}`;
        answer = a + b;
      } else if (opChoice < 0.66) {
        const a = randInt(1, 20);
        const b = randInt(1, a);
        question = `${a} - ${b}`;
        answer = a - b;
      } else {
        const a = randInt(1, 10);
        const b = randInt(1, 10);
        question = `${a} × ${b}`;
        answer = a * b;
      }
    } else {
      // Hard: multiplication or division with larger numbers
      if (Math.random() < 0.5) {
        const a = randInt(2, 12);
        const b = randInt(2, 12);
        question = `${a} × ${b}`;
        answer = a * b;
      } else {
        const divisor   = randInt(2, 12);
        const multiplier = randInt(2, 12);
        const product   = divisor * multiplier;
        question = `${product} ÷ ${divisor}`;
        answer   = multiplier;
      }
    }
    wrongs = [];
    const wrong1 = getRandomWrong(answer);
    const wrong2 = getRandomWrong(answer);
    let answers = [
      { value: answer, correct: true },
      { value: wrong1, correct: false },
      { value: wrong2, correct: false }
    ];
    // Shuffle answers
    answers = answers.sort(() => Math.random() - 0.5);
    return { question, answers };
  }

  /**
   * Generate an English spelling question. The player must select the
   * correctly spelled word from three options. Wrong answers are
   * generated by mutating the correct word.
   *
   * @param {string} difficulty
   * @returns {Object}
   */
  function generateEnglishQuestion(difficulty) {
    const easyWords   = ['cat','dog','sun','book','tree','car','milk','ball','fish','baby'];
    const mediumWords = ['chair','plant','happy','green','school','water','music','phone','mouse','apple'];
    const hardWords   = ['pencil','yellow','friend','animal','flower','garden','family','spring','winter','cookie'];
    let wordList;
    if (difficulty === 'easy') {
      wordList = easyWords;
    } else if (difficulty === 'medium') {
      wordList = mediumWords;
    } else {
      wordList = hardWords;
    }
    const word = wordList[Math.floor(Math.random() * wordList.length)];
    // A dictionary mapping each word to its Chinese translation. This allows
    // us to show the meaning instead of the word itself, encouraging
    // players to recall the correct spelling from the translation.
    const translationDict = {
      cat: '貓', dog: '狗', sun: '太陽', book: '書', tree: '樹', car: '車', milk: '牛奶', ball: '球', fish: '魚', baby: '嬰兒',
      chair: '椅子', plant: '植物', happy: '快樂', green: '綠色', school: '學校', water: '水', music: '音樂', phone: '電話', mouse: '老鼠', apple: '蘋果',
      pencil: '鉛筆', yellow: '黃色', friend: '朋友', animal: '動物', flower: '花', garden: '花園', family: '家庭', spring: '春天', winter: '冬天', cookie: '餅乾'
    };
    const translation = translationDict[word] || '';
    const wrongSet = new Set();
    /**
     * Create a mutated version of the provided word by either removing,
     * replacing or swapping characters. Ensures the result differs
     * from the original word.
     *
     * @param {string} w The word to mutate
     * @returns {string} A new misspelled word
     */
    function mutateWord(w) {
      const arr = w.split('');
      const type = Math.floor(Math.random() * 3);
      if (type === 0) {
        // remove a random letter if length > 2
        if (arr.length > 2) {
          arr.splice(Math.floor(Math.random() * arr.length), 1);
        } else {
          // fallback: replace a letter
          const idx = Math.floor(Math.random() * arr.length);
          const letters = 'abcdefghijklmnopqrstuvwxyz';
          arr[idx] = letters.charAt(Math.floor(Math.random() * letters.length));
        }
      } else if (type === 1) {
        // replace a letter
        const idx = Math.floor(Math.random() * arr.length);
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        arr[idx] = letters.charAt(Math.floor(Math.random() * letters.length));
      } else {
        // swap two letters if length > 2, else replace
        if (arr.length > 2) {
          let i = Math.floor(Math.random() * arr.length);
          let j = Math.floor(Math.random() * arr.length);
          // ensure two distinct indices
          while (j === i) {
            j = Math.floor(Math.random() * arr.length);
          }
          const temp = arr[i];
          arr[i] = arr[j];
          arr[j] = temp;
        } else {
          const idx = Math.floor(Math.random() * arr.length);
          const letters = 'abcdefghijklmnopqrstuvwxyz';
          arr[idx] = letters.charAt(Math.floor(Math.random() * letters.length));
        }
      }
      return arr.join('');
    }
    // Create two unique wrong answers
    while (wrongSet.size < 2) {
      const mutated = mutateWord(word);
      if (mutated !== word && !wrongSet.has(mutated)) {
        wrongSet.add(mutated);
      }
    }
    const wrongs = Array.from(wrongSet);
    let answers = [
      { value: word, correct: true },
      { value: wrongs[0], correct: false },
      { value: wrongs[1], correct: false }
    ];
    answers = answers.sort(() => Math.random() - 0.5);
    // Present the Chinese meaning and ask for the corresponding English word
    return { question: `請選出與「${translation}」對應的英文單字`, answers };
  }

  /**
   * Generate a random integer between min and max inclusive.
   *
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
});