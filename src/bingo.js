import { Application, Sprite, Assets, Container, Texture } from 'pixi.js';

// List of garden items used in the game
const GARDEN_ITEMS = [
  'almond',
  'apple',
  'apricot',
  'avocado',
  'banana',
  'beans',
  'beetroot',
  'blueberry',
  'broccoli',
  'cabbage',
  'carrot',
  'cauliflower',
  'cherry',
  'chili',
  'coconut',
  'corn',
  'cucumber',
  'currant',
  'eggplant',
  'fig',
  'garlic',
  'grapefruit',
  'grapes',
  'hazelnut',
  'kiwi',
  'lemon',
  'lettuce',
  'lime',
  'mango',
  'melon',
  'olive',
  'onion',
  'orange',
  'peach',
  'peanut',
  'pear',
  'peas',
  'pepper',
  'pineapple',
  'pistachio',
  'plum',
  'pomegranate',
  'potato',
  'pumpkin',
  'radish',
  'raspberry',
  'strawberry',
  'tomato',
  'turnip',
  'walnut',
  'watermelon',
];

const MAX_DRAWS = 45;
const TICKET_SIZE = 25;
const FREE_STAR_INDEX = 12;
const TICKET_RESET_TIME = 86400000; // 24 hours in milliseconds

export const setupBingo = async () => {
  const gameContainer = document.getElementById('bingo-game');

  // Initialise the PIXI application
  const bingoGameApp = new Application();

  await bingoGameApp.init({
    background: '#fff',
    height: 400,
    width: 400,
  });

  gameContainer.appendChild(bingoGameApp.canvas);

  // Load assets
  const dealSound = new Audio(require('./assets/sounds/deal.mp3'));
  const playSound = new Audio(require('./assets/sounds/play.mp3'));
  const checkSound = new Audio(require('./assets/sounds/check.mp3'));
  const winSound = new Audio(require('./assets/sounds/win.mp3'));
  const starTexture = await Assets.load(require('./assets/img/star.svg'));
  const gardenTextures = await Promise.all(
    GARDEN_ITEMS.map((item) => Assets.load(require(`./assets/img/${item}.png`)))
  );

  // Game state variables
  let currentTicket = [];
  let drawnImages = [];
  let drawCount = 0;
  let tickets = loadTickets();
  let hasWon = false;
  let oneLineWon = false;
  let twoLinesWon = false;
  let fullHouseWon = false;

  // DOM elements
  const gameImage = document.getElementById('game-image');
  const promoText = document.getElementById('game-promo');
  const ticketsDisplay = document.getElementById('game-tickets');
  const drawsDisplay = document.getElementById('game-draws');
  const button = document.querySelector('.GameFooter__action .button');

  ticketsDisplay.innerText = `Your Tickets: ${tickets}`;
  loadDraws();
  startResetTimer();

  // Create an empty ticket grid
  const createEmptyTicketGrid = () => {
    const ticketContainer = new Container();
    ticketContainer.label = 'ticketContainer';

    for (let i = 0; i < TICKET_SIZE; i++) {
      const texture = i === FREE_STAR_INDEX ? starTexture : Texture.WHITE;
      const sprite = new Sprite(texture);
      sprite.width = sprite.height = 70;
      sprite.x = (i % 5) * 80 + 5;
      sprite.y = Math.floor(i / 5) * 80 + 5;
      sprite.tint = i !== FREE_STAR_INDEX ? 0xcccccc : 0xffffff;
      ticketContainer.addChild(sprite);
    }

    bingoGameApp.stage.addChild(ticketContainer);
  };

  createEmptyTicketGrid();

  // Generate a new ticket with random items
  const generateTicket = () => {
    const items = [...GARDEN_ITEMS];
    const ticket = [];

    while (ticket.length < TICKET_SIZE - 1) {
      const randomIndex = Math.floor(Math.random() * items.length);
      ticket.push(items.splice(randomIndex, 1)[0]);
    }

    ticket.splice(FREE_STAR_INDEX, 0, 'free-star');
    return ticket;
  };

  // Render the ticket on the grid
  const renderTicket = (ticket) => {
    const ticketContainer =
      bingoGameApp.stage.getChildByName('ticketContainer');

    ticket.forEach((item, index) => {
      const texture =
        item === 'free-star'
          ? starTexture
          : gardenTextures[GARDEN_ITEMS.indexOf(item)];
      const sprite = ticketContainer.getChildAt(index);
      sprite.texture = texture;
    });
  };

  // Draw a new image and update the game state
  const drawImage = () => {
    drawCount++;
    saveDraws();

    const remainingItems = GARDEN_ITEMS.filter(
      (item) => !drawnImages.includes(item)
    );
    const drawnItem =
      remainingItems[Math.floor(Math.random() * remainingItems.length)];
    drawnImages.push(drawnItem);

    gameImage.src = `./assets/img/${drawnItem}.png`;

    const ticketIndex = currentTicket.indexOf(drawnItem);
    if (ticketIndex !== -1) markTicket(ticketIndex);

    checkWinConditions();

    drawsDisplay.innerText = `Draws: ${drawCount} of ${MAX_DRAWS}`;
  };

  // Mark a ticket item as drawn
  const markTicket = (index) => {
    checkSound.play();
    const ticketContainer =
      bingoGameApp.stage.getChildByName('ticketContainer');
    const sprite = ticketContainer.getChildAt(index);
    sprite.texture = starTexture;
    sprite.tint = 0xff0000;
  };

  // Check if the player has won
  const checkWinConditions = () => {
    const ticketContainer =
      bingoGameApp.stage.getChildByName('ticketContainer');
    const markedIndices = Array.from(ticketContainer.children)
      .map((sprite, index) => (sprite.texture === starTexture ? index : -1))
      .filter((index) => index !== -1);

    const lines = [
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24],
      [0, 5, 10, 15, 20],
      [1, 6, 11, 16, 21],
      [2, 7, 12, 17, 22],
      [3, 8, 13, 18, 23],
      [4, 9, 14, 19, 24],
      [0, 6, 12, 18, 24],
      [4, 8, 12, 16, 20],
    ];

    let wonLines = 0;
    const winningIndices = new Set();

    lines.forEach((line) => {
      if (line.every((index) => markedIndices.includes(index))) {
        wonLines++;
        line.forEach((index) => winningIndices.add(index));
      }
    });

    highlightWinningLines(ticketContainer, winningIndices);
    handleWin(wonLines, markedIndices);
  };

  // Handle win conditions and update the UI
  const handleWin = (wonLines, markedIndices) => {
    let winMessage = '';

    if (wonLines >= 1 && !oneLineWon) {
      document
        .getElementById('one-line')
        .classList.add('Leaderboard__item--won');
      winMessage = 'Congratulations! You Won $5 Credit!';
      promoText.innerText = winMessage;
      winSound.play();
      oneLineWon = true;
      hasWon = true;
    }

    if (wonLines >= 2 && !twoLinesWon) {
      document
        .getElementById('two-lines')
        .classList.add('Leaderboard__item--won');
      winMessage = 'Congratulations! You Won $15 Credit!';
      promoText.innerText = winMessage;
      winSound.play();
      twoLinesWon = true;
      hasWon = true;
    }

    if (markedIndices.length === TICKET_SIZE && drawCount <= 35) {
      handleFullHouse();
      handleJackpot();
    } else if (markedIndices.length === TICKET_SIZE && !fullHouseWon) {
      handleFullHouse();
    }

    if (drawCount === MAX_DRAWS && tickets === 0 && wonLines < 1) {
      promoText.innerText = 'Better Luck Next Time!';
      resetGame();
    }
  };

  // Highlight the winning lines on the ticket
  const highlightWinningLines = (ticketContainer, winningIndices) => {
    ticketContainer.children.forEach((sprite, index) => {
      sprite.tint = winningIndices.has(index)
        ? 0xff0000
        : sprite.texture === starTexture
        ? 0xffffff
        : 0xcccccc;
    });
  };

  // Handle jackpot win
  const handleJackpot = () => {
    document.getElementById('jackpot').classList.add('Leaderboard__item--won');
    promoText.innerText = 'Congratulations! You Won $100 Credit!';
    winSound.play();
    fullHouseWon = true;
    hasWon = true;
  };

  // Handle full house win
  const handleFullHouse = () => {
    if (!fullHouseWon) {
      document
        .getElementById('full-house')
        .classList.add('Leaderboard__item--won');
      promoText.innerText = 'Congratulations! You Won $25 Credit!';
      winSound.play();
      fullHouseWon = true;
      hasWon = true;
    }
  };

  // Reset the game state
  const resetGame = () => {
    setTimeout(() => {
      resetLeaderboard();
      resetTicket();
      tickets = 0;
      saveTickets(0);
      drawCount = 0;
      saveDraws();
      button.disabled = true;
      oneLineWon = false;
      twoLinesWon = false;
      fullHouseWon = false;
      hasWon = false;
      location.reload();
    }, 500);
  };

  // Reset the leaderboard UI
  const resetLeaderboard = () => {
    document.querySelectorAll('.Leaderboard__item').forEach((item) => {
      item.classList.remove('Leaderboard__item--won');
    });
  };

  // Reset the ticket grid
  const resetTicket = () => {
    const ticketContainer =
      bingoGameApp.stage.getChildByName('ticketContainer');
    ticketContainer.children.forEach((sprite, index) => {
      sprite.texture = index === FREE_STAR_INDEX ? starTexture : Texture.WHITE;
      sprite.tint = index !== FREE_STAR_INDEX ? 0xcccccc : 0xffffff;
    });
    hasWon = false;
  };

  // Debounce function to limit the rate of function calls
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  // Shuffle animation for ticket grid items
  const shuffleTicketGrid = (ticketContainer, duration = 500) => {
    const interval = 50; // Interval between shuffles
    const endTime = Date.now() + duration;

    const shuffle = () => {
      if (Date.now() >= endTime) {
        clearInterval(shuffleInterval);
        renderTicket(currentTicket); // Render the final ticket
        return;
      }

      ticketContainer.children.forEach((sprite) => {
        const randomTexture =
          gardenTextures[Math.floor(Math.random() * gardenTextures.length)];
        sprite.texture = randomTexture;
      });
    };

    const shuffleInterval = setInterval(shuffle, interval);
  };

  // Shuffle animation for game image
  const shuffleGameImage = (duration = 500) => {
    const interval = 50; // Interval between shuffles
    const endTime = Date.now() + duration;

    const shuffle = () => {
      if (Date.now() >= endTime) {
        clearInterval(shuffleInterval);
        return;
      }

      const randomItem =
        GARDEN_ITEMS[Math.floor(Math.random() * GARDEN_ITEMS.length)];
      gameImage.src = `./assets/img/${randomItem}.png`;
    };

    const shuffleInterval = setInterval(shuffle, interval);
  };

  // Button click event handler
  button.addEventListener(
    'click',
    debounce(() => {
      if (button.innerText === 'New Ticket') {
        if (tickets > 0) {
          resetLeaderboard();
          currentTicket = generateTicket();
          drawCount = 0;
          drawnImages = [];
          saveDraws();
          saveTickets(--tickets);
          button.innerText = 'Play Game';
          drawsDisplay.innerText = `Draws: ${drawCount} of ${MAX_DRAWS}`;
          promoText.innerText = '10 Free Tickets Daily!';
          dealSound.play();

          const ticketContainer =
            bingoGameApp.stage.getChildByName('ticketContainer');
          shuffleTicketGrid(ticketContainer);
        } else {
          button.disabled = true;
          button.innerText = 'Wait 24h';
        }
      } else if (button.innerText === 'Play Game') {
        if (drawCount < MAX_DRAWS) {
          shuffleGameImage();
          setTimeout(drawImage, 500);
          playSound.play();
        } else {
          alert('45 draws completed. Start a new game by dealing a new ticket.');
          resetTicket();
          button.innerText = 'New Ticket';
        }
      }
    }, 300)
  );

  // Load the number of tickets from local storage
  function loadTickets() {
    const now = Date.now();
    const lastReset = parseInt(localStorage.getItem('bingo-last-reset'), 10);
    let tickets = parseInt(localStorage.getItem('bingo-tickets'), 10);

    if (!lastReset || now - lastReset >= TICKET_RESET_TIME) {
      tickets = 10;
      localStorage.setItem('bingo-last-reset', now);
      localStorage.setItem('bingo-tickets', tickets);
    }

    if (isNaN(tickets)) {
      tickets = 10;
      localStorage.setItem('bingo-tickets', tickets);
    }

    return tickets;
  }

  // Save the number of tickets to local storage
  function saveTickets(newTickets) {
    localStorage.setItem('bingo-tickets', newTickets);
    ticketsDisplay.innerText = `Your Tickets: ${newTickets}`;
  }

  // Load the number of draws from local storage
  function loadDraws() {
    drawCount = parseInt(localStorage.getItem('bingo-draws'), 10) || 0;
    drawsDisplay.innerText = `Draws: ${drawCount} of ${MAX_DRAWS}`;
  }

  // Save the number of draws to local storage
  function saveDraws() {
    localStorage.setItem('bingo-draws', drawCount);
    drawsDisplay.innerText = `Draws: ${drawCount} of ${MAX_DRAWS}`;
  }

  // Start the timer to reset tickets
  function startResetTimer() {
    const now = Date.now();
    const lastReset = parseInt(localStorage.getItem('bingo-last-reset'), 10);

    const timeLeft = lastReset
      ? Math.max(0, TICKET_RESET_TIME - (now - lastReset))
      : TICKET_RESET_TIME;

    if (timeLeft === 0) {
      resetTickets();
    } else {
      setTimeout(resetTickets, timeLeft);
      3;
    }
  }

  // Reset the number of tickets
  function resetTickets() {
    localStorage.setItem('bingo-tickets', '10');
    localStorage.setItem('bingo-last-reset', Date.now());
    tickets = 10;
    ticketsDisplay.innerText = `Your Tickets: ${tickets}`;
    button.disabled = false;
    button.innerText = 'New Ticket';
  }
};
