import { Application, Sprite, Assets, Container, Texture } from 'pixi.js';

// Number of unique garden images
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

// Function to set up the game
export const setupBingo = async () => {
  const gameContainer = document.getElementById('bingo-game');

  // Create a PixiJS application
  const bingoGameApp = new Application();

  // Init and configure application
  await bingoGameApp.init({
    background: '#fff',
    height: 400,
    width: 400,
  });

  // Add canvas to the container
  gameContainer.appendChild(bingoGameApp.canvas);

  // Load sound assets
  const checkSound = new Audio(require('./assets/sounds/check.mp3'));
  const winSound = new Audio(require('./assets/sounds/win.mp3'));

  // Load the star image asset
  const starTexture = await Assets.load(require('./assets/img/star.svg'));

  // Load all garden images
  const gardenTextures = await Promise.all(
    GARDEN_ITEMS.map((item) => Assets.load(require(`./assets/img/${item}.png`)))
  );

  // Game state variables
  let currentTicket = [];
  let drawnImages = [];
  let drawCount = 0;
  let tickets = loadTickets();
  let hasWon = false;

  // DOM elements
  const gameImage = document.getElementById('game-image');
  const promoText = document.getElementById('game-promo');
  const ticketsDisplay = document.getElementById('game-tickets');
  const drawsDisplay = document.getElementById('game-draws');
  const button = document.querySelector('.GameFooter__action .button');

  ticketsDisplay.innerText = `Your Tickets: ${tickets}`;
  loadDraws();
  startResetTimer();

  // Create empty ticket grid
  const createEmptyTicketGrid = () => {
    const ticketContainer = new Container();
    ticketContainer.label = 'ticketContainer';

    for (let i = 0; i < 25; i++) {
      const texture = i === 12 ? starTexture : Texture.WHITE;
      const sprite = new Sprite(texture);
      sprite.width = sprite.height = 70;
      sprite.x = (i % 5) * 80 + 5;
      sprite.y = Math.floor(i / 5) * 80 + 5;
      sprite.tint = i !== 12 ? 0xcccccc : 0xffffff; // Grey color for empty spots
      ticketContainer.addChild(sprite);
    }

    bingoGameApp.stage.addChild(ticketContainer);
  };

  createEmptyTicketGrid();

  // Generate a new bingo ticket
  const generateTicket = () => {
    const items = [...GARDEN_ITEMS];
    const ticket = [];

    while (ticket.length < 24) {
      const randomIndex = Math.floor(Math.random() * items.length);
      ticket.push(items.splice(randomIndex, 1)[0]);
    }

    ticket.splice(12, 0, 'free-star');
    return ticket;
  };

  // Render ticket with images
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

  // Draw a random image
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

    if (drawCount >= 41) {
      alert('41 draws completed. Start a new game by dealing a new ticket.');
      resetTicket();
      button.innerText = 'Deal';
    }

    drawsDisplay.innerText = `Draws: ${drawCount} of 41`;
  };

  // Mark a matching item on the bingo ticket
  const markTicket = (index) => {
    checkSound.play();
    const ticketContainer =
      bingoGameApp.stage.getChildByName('ticketContainer');
    const sprite = ticketContainer.getChildAt(index);
    sprite.texture = starTexture;
    sprite.tint = 0xff0000; // Change tint to red when marked
  };

  // Check for win conditions
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

  // Handle winning lines
  const handleWin = (wonLines, markedIndices) => {
    let winMessage = '';

    // Check for one line win
    if (wonLines >= 1 && !hasWon) {
      document
        .getElementById('one-line')
        .classList.add('Leaderboard__item--won');
      winMessage = 'Congratulations! You Won $5 Credit!';
      promoText.innerText = winMessage;
      winSound.play();
      hasWon = true;
    }

    // Check for two lines win
    if (wonLines >= 2 && hasWon) {
      document
        .getElementById('two-lines')
        .classList.add('Leaderboard__item--won');
      winMessage = 'Congratulations! You Won $15 Credit!';
      promoText.innerText = winMessage;
      winSound.play();
      hasWon = true;
    }

    // Handle jackpot or full house
    if (wonLines === 2 && markedIndices.length === 25 && drawCount <= 31) {
      handleJackpot();
    } else if (wonLines === 2 && markedIndices.length === 25) {
      handleFullHouse();
    }

    // No winning lines, check if the game should end
    if (drawCount === 41 && tickets === 0 && wonLines < 1) {
      promoText.innerText = 'Better Luck Next Time!';
      resetGame();
    }
  };

  // Highlight winning lines
  const highlightWinningLines = (ticketContainer, winningIndices) => {
    ticketContainer.children.forEach((sprite, index) => {
      sprite.tint = winningIndices.has(index)
        ? 0xff0000
        : sprite.texture === starTexture
        ? 0xffffff
        : 0xcccccc;
    });
  };

  // Handle jackpot
  const handleJackpot = () => {
    if (!hasWon) {
      // Check if win sound has already been played
      document
        .getElementById('jackpot')
        .classList.add('Leaderboard__item--won');
      promoText.innerText = 'Congratulations! You Won $100 Credit!';
      winSound.play();
      hasWon = true;
    }
    resetGame();
  };

  // Handle full house
  const handleFullHouse = () => {
    if (!hasWon) {
      // Check if win sound has already been played
      document
        .getElementById('full-house')
        .classList.add('Leaderboard__item--won');
      promoText.innerText = 'Congratulations! You Won $25 Credit!';
      winSound.play();
      hasWon = true;
    }
    resetGame();
  };

  // Reset game after win or loss
  const resetGame = () => {
    resetLeaderboard();
    resetTicket();
    tickets = 0;
    saveTickets(0);
    drawCount = 0;
    saveDraws();
    button.disabled = true;
    hasWon = false;

    setTimeout(() => {
      startResetTimer();
      location.reload(); // Force page refresh to ensure all UI elements are reset
    }, 500); // Short delay before refreshing
  };

  // Function to reset the leaderboard
  const resetLeaderboard = () => {
    document.querySelectorAll('.Leaderboard__item').forEach((item) => {
      item.classList.remove('Leaderboard__item--won');
    });
  };

  // Reset the ticket to the default empty state
  const resetTicket = () => {
    const ticketContainer =
      bingoGameApp.stage.getChildByName('ticketContainer');
    ticketContainer.children.forEach((sprite, index) => {
      sprite.texture = index === 12 ? starTexture : Texture.WHITE;
      sprite.tint = index !== 12 ? 0xcccccc : 0xffffff;
    });
    hasWon = false; // Reset the win flag
  };

  // Button click event
  button.addEventListener('click', () => {
    if (button.innerText === 'Deal') {
      if (tickets > 0) {
        resetLeaderboard();
        currentTicket = generateTicket();
        renderTicket(currentTicket);
        drawCount = 0;
        drawnImages = [];
        saveDraws();
        saveTickets(--tickets);
        button.innerText = 'Play';
        drawsDisplay.innerText = `Draws: ${drawCount} of 41`;
        promoText.innerText = '10 Free Tickets Daily!';
      } else {
        button.disabled = true;
        button.innerText = 'Wait 24h';
      }
    } else if (button.innerText === 'Play') {
      if (drawCount < 41) {
        drawImage();
      } else {
        alert('Maximum 41 draws reached. Start a new game.');
        button.innerText = 'Deal';
      }
    }
  });

  // Load tickets from local storage
  function loadTickets() {
    const now = Date.now();
    const lastReset = parseInt(localStorage.getItem('bingo-last-reset'), 10);
    let tickets = parseInt(localStorage.getItem('bingo-tickets'), 10);

    if (!lastReset || now - lastReset >= 86400000) {
      // 24 hours have passed, reset tickets
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

  // Save tickets to local storage
  function saveTickets(newTickets) {
    localStorage.setItem('bingo-tickets', newTickets);
    ticketsDisplay.innerText = `Your Tickets: ${newTickets}`;
  }

  // Load draw count from local storage
  function loadDraws() {
    drawCount = parseInt(localStorage.getItem('bingo-draws'), 10) || 0;
    drawsDisplay.innerText = `Draws: ${drawCount} of 41`;
  }

  // Save draw count to local storage
  function saveDraws() {
    localStorage.setItem('bingo-draws', drawCount);
    drawsDisplay.innerText = `Draws: ${drawCount} of 41`;
  }

  // Timer reset for daily tickets
  function startResetTimer() {
    const now = Date.now();
    const lastReset = parseInt(localStorage.getItem('bingo-last-reset'), 10);

    const timeLeft = lastReset
      ? Math.max(0, 86400000 - (now - lastReset))
      : 86400000;

    if (timeLeft === 0) {
      resetTickets();
    } else {
      setTimeout(resetTickets, timeLeft);
    }
  }

  function resetTickets() {
    localStorage.setItem('bingo-tickets', '10');
    localStorage.setItem('bingo-last-reset', Date.now());
    tickets = 10;
    ticketsDisplay.innerText = `Your Tickets: ${tickets}`;
    button.disabled = false;
    button.innerText = 'Deal';
  }
};
