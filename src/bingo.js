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

const FREE_TICKETS = 10;
const MAX_DRAWS = 46;
const TICKET_SIZE = 25;
const FREE_STAR_INDEX = 12;
const TICKET_RESET_TIME = 86400000; // 24 hours in milliseconds
const JACKPOT_THRESHOLD = 40;

// Main function to setup the Bingo game
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

  const assets = await loadAssets();
  const gameState = initialiseGameState();
  const domElements = getDomElements();

  updateDomElements(domElements, gameState);
  createEmptyTicketGrid(bingoGameApp, assets.starTexture);
  setupButtonHandler(bingoGameApp, assets, gameState, domElements);

  // Only start the reset timer if tickets are exhausted
  if (gameState.tickets === 0) {
    startResetTimer(gameState, domElements);
  }
};

// Load game assets (sounds and images)
const loadAssets = async () => {
  const dealSound = new Audio(require('./assets/sounds/deal.mp3'));
  const playSound = new Audio(require('./assets/sounds/play.mp3'));
  const checkSound = new Audio(require('./assets/sounds/check.mp3'));
  const winSound = new Audio(require('./assets/sounds/win.mp3'));
  const starTexture = await Assets.load(require('./assets/img/star.svg'));
  const gardenTextures = await Promise.all(
    GARDEN_ITEMS.map((item) => Assets.load(require(`./assets/img/${item}.png`)))
  );

  return {
    dealSound,
    playSound,
    checkSound,
    winSound,
    starTexture,
    gardenTextures,
  };
};

// Initialise the game state
const initialiseGameState = () => ({
  currentTicket: [],
  drawnImages: [],
  drawCount: 0,
  tickets: loadTickets(),
  oneLineWon: false,
  twoLinesWon: false,
  fullHouseWon: false,
  jackpotDrawsLeft: JACKPOT_THRESHOLD,
});

// Get DOM elements for the game
const getDomElements = () => ({
  gameImage: document.getElementById('game-image'),
  promoText: document.getElementById('game-promo'),
  ticketsDisplay: document.getElementById('game-tickets'),
  drawsDisplay: document.getElementById('game-draws'),
  button: document.querySelector('.GameFooter__action .button'),
  jackpotCounter: document.querySelector('#jackpot .Leaderboard__item-count'),
});

// Update DOM elements with the current game state
const updateDomElements = (domElements, gameState) => {
  domElements.promoText.innerText = '10 Free Tickets Daily!';
  domElements.ticketsDisplay.innerText = `Your Tickets: ${gameState.tickets}`;
  domElements.jackpotCounter.innerText = gameState.jackpotDrawsLeft;
  loadDraws(domElements, gameState);
};

// Create an empty ticket grid
const createEmptyTicketGrid = (bingoGameApp, starTexture) => {
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

// Setup button click handler
const setupButtonHandler = (bingoGameApp, assets, gameState, domElements) => {
  domElements.button.addEventListener(
    'click',
    debounce(() => {
      if (domElements.button.innerText === 'New Game') {
        startNewGame(bingoGameApp, assets, gameState, domElements);
      } else if (domElements.button.innerText === 'Play') {
        playGame(bingoGameApp, assets, gameState, domElements);
      }
    }, 300)
  );
};

// Start a new game
const startNewGame = (bingoGameApp, assets, gameState, domElements) => {
  resetGameState(gameState);
  domElements.promoText.classList.remove('GamePromo__text--win');

  if (gameState.tickets > 0) {
    resetLeaderboard();
    gameState.currentTicket = generateTicket();
    gameState.drawCount = 0;
    gameState.drawnImages = [];
    saveDraws(gameState);
    saveTickets(--gameState.tickets, domElements);
    domElements.button.innerText = 'Play';
    domElements.drawsDisplay.innerText = `Draws: ${gameState.drawCount} of ${MAX_DRAWS}`;
    domElements.promoText.innerText = `${FREE_TICKETS} Free Tickets Daily!`;
    assets.dealSound.play();

    const ticketContainer =
      bingoGameApp.stage.getChildByName('ticketContainer');
    shuffleTicketGrid(
      ticketContainer,
      assets.gardenTextures,
      gameState.currentTicket,
      assets.starTexture
    );
  } else {
    domElements.button.disabled = true;
    if (!localStorage.getItem('bingo-last-reset')) {
      localStorage.setItem('bingo-last-reset', Date.now());
    }
    startResetTimer(gameState, domElements);
  }
};

// Play the game
const playGame = (bingoGameApp, assets, gameState, domElements) => {
  if (gameState.drawCount < MAX_DRAWS) {
    domElements.button.disabled = true;
    shuffleGameImage(domElements.gameImage, assets.gardenTextures);
    setTimeout(() => {
      drawImage(bingoGameApp, assets, gameState, domElements);
      domElements.button.disabled = false;
    }, 500);
    assets.playSound.play();

    // Decrement jackpotDrawsLeft and update the DOM, ensuring it doesn't go below 0
    if (gameState.jackpotDrawsLeft > 0) {
      gameState.jackpotDrawsLeft--;
    }
    domElements.jackpotCounter.innerText = gameState.jackpotDrawsLeft;
  }
};

// Draw an image and update the game state
const drawImage = (bingoGameApp, assets, gameState, domElements) => {
  gameState.drawCount++;
  saveDraws(gameState);

  const remainingItems = GARDEN_ITEMS.filter(
    (item) => !gameState.drawnImages.includes(item)
  );
  const drawnItem =
    remainingItems[Math.floor(Math.random() * remainingItems.length)];
  gameState.drawnImages.push(drawnItem);

  domElements.gameImage.src = `./assets/img/${drawnItem}.png`;

  const ticketIndex = gameState.currentTicket.indexOf(drawnItem);
  if (ticketIndex !== -1) markTicket(bingoGameApp, assets, ticketIndex);

  checkWinConditions(bingoGameApp, assets, gameState, domElements);

  domElements.drawsDisplay.innerText = `Draws: ${gameState.drawCount} of ${MAX_DRAWS}`;
  updateJackpotCounter(gameState, domElements);

  if (gameState.drawCount >= MAX_DRAWS) {
    domElements.button.innerText = 'New Game';
  }
};

// Mark a ticket as drawn
const markTicket = (bingoGameApp, assets, index) => {
  assets.checkSound.play();
  const ticketContainer = bingoGameApp.stage.getChildByName('ticketContainer');
  const sprite = ticketContainer.getChildAt(index);
  sprite.texture = assets.starTexture;
  sprite.tint = 0x00ff00;
};

// Check win conditions
const checkWinConditions = (bingoGameApp, assets, gameState, domElements) => {
  const ticketContainer = bingoGameApp.stage.getChildByName('ticketContainer');
  const markedIndices = Array.from(ticketContainer.children)
    .map((sprite, index) =>
      sprite.texture === assets.starTexture ? index : -1
    )
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
  handleWin(
    bingoGameApp,
    assets,
    gameState,
    domElements,
    wonLines,
    markedIndices
  );
};

// Handle win conditions
const handleWin = (
  bingoGameApp,
  assets,
  gameState,
  domElements,
  wonLines,
  markedIndices
) => {
  let winMessage = '';

  if (wonLines >= 1 && !gameState.oneLineWon) {
    document.getElementById('one-line').classList.add('Leaderboard__item--won');
    winMessage = 'Congratulations! You Won $5 Credit!';
    updatePromoText(domElements.promoText, winMessage, assets.winSound);
    gameState.oneLineWon = true;
  }

  if (wonLines >= 2 && !gameState.twoLinesWon) {
    document
      .getElementById('two-lines')
      .classList.add('Leaderboard__item--won');
    winMessage = 'Congratulations! You Won $15 Credit!';
    updatePromoText(domElements.promoText, winMessage, assets.winSound);
    gameState.twoLinesWon = true;
  }

  if (markedIndices.length === TICKET_SIZE && gameState.drawCount <= 35) {
    handleFullHouse(assets, gameState, domElements);
    handleJackpot(assets, gameState, domElements);
  } else if (markedIndices.length === TICKET_SIZE && !gameState.fullHouseWon) {
    handleFullHouse(assets, gameState, domElements);
  }

  if (
    gameState.drawCount === MAX_DRAWS &&
    gameState.tickets === 0 &&
    wonLines < 1
  ) {
    domElements.promoText.innerText = 'Better Luck Next Time!';
    resetGame(gameState, domElements, bingoGameApp);
  }
};

// Update promo text with win message
const updatePromoText = (promoText, message, winSound) => {
  promoText.innerText = message;
  promoText.classList.remove('GamePromo__text--win');
  void promoText.offsetWidth;
  promoText.classList.add('GamePromo__text--win');
  winSound.play();
};

// Highlight winning lines on the ticket
const highlightWinningLines = (ticketContainer, winningIndices) => {
  ticketContainer.children.forEach((sprite, index) => {
    sprite.tint = winningIndices.has(index) ? 0x00ff00 : 0xffffff;
  });
};

// Handle jackpot win
const handleJackpot = (assets, gameState, domElements) => {
  document.getElementById('jackpot').classList.add('Leaderboard__item--won');
  updatePromoText(
    domElements.promoText,
    'Congratulations! You Won $100 Credit!',
    assets.winSound
  );
  gameState.fullHouseWon = true;
};

// Handle full house win
const handleFullHouse = (assets, gameState, domElements) => {
  if (!gameState.fullHouseWon) {
    document
      .getElementById('full-house')
      .classList.add('Leaderboard__item--won');
    updatePromoText(
      domElements.promoText,
      'Congratulations! You Won $25 Credit!',
      assets.winSound
    );
    gameState.fullHouseWon = true;
  }
};

// Reset the game
const resetGame = (gameState, domElements, bingoGameApp) => {
  setTimeout(() => {
    resetLeaderboard();
    resetTicket(bingoGameApp, gameState, domElements);
    gameState.tickets = 0;
    saveTickets(0, domElements);
    gameState.drawCount = 0;
    saveDraws(gameState);
    domElements.button.disabled = true;
    gameState.oneLineWon = false;
    gameState.twoLinesWon = false;
    gameState.fullHouseWon = false;
    location.reload();
  }, 60000);
};

// Reset the leaderboard
const resetLeaderboard = () => {
  document.querySelectorAll('.Leaderboard__item').forEach((item) => {
    item.classList.remove('Leaderboard__item--won');
  });
};

// Reset the ticket grid
const resetTicket = (bingoGameApp, gameState, domElements) => {
  const ticketContainer = bingoGameApp.stage.getChildByName('ticketContainer');
  ticketContainer.children.forEach((sprite, index) => {
    sprite.texture =
      index === FREE_STAR_INDEX ? domElements.starTexture : Texture.WHITE;
    sprite.tint = index !== FREE_STAR_INDEX ? 0xcccccc : 0xffffff;
  });
};

// Reset the game state
const resetGameState = (gameState) => {
  gameState.currentTicket = [];
  gameState.drawnImages = [];
  gameState.drawCount = 0;
  gameState.oneLineWon = false;
  gameState.twoLinesWon = false;
  gameState.fullHouseWon = false;
  gameState.jackpotDrawsLeft = JACKPOT_THRESHOLD;
};

// Debounce function to limit the rate of function execution
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Shuffle the ticket grid
const shuffleTicketGrid = (
  ticketContainer,
  gardenTextures,
  currentTicket,
  starTexture,
  duration = 500
) => {
  const interval = 50;
  const endTime = Date.now() + duration;

  const shuffle = () => {
    if (Date.now() >= endTime) {
      clearInterval(shuffleInterval);
      renderTicket(ticketContainer, currentTicket, gardenTextures, starTexture);
      return;
    }

    ticketContainer.children.forEach((sprite) => {
      const randomTexture =
        gardenTextures[Math.floor(Math.random() * gardenTextures.length)];
      sprite.texture = randomTexture;
      sprite.tint = 0xffffff;
    });
  };

  const shuffleInterval = setInterval(shuffle, interval);
};

// Shuffle the game image
const shuffleGameImage = (gameImage, gardenTextures, duration = 500) => {
  const interval = 50;
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

// Load tickets from local storage
const loadTickets = () => {
  const now = Date.now();
  const lastReset = parseInt(localStorage.getItem('bingo-last-reset'), 10);
  let tickets = parseInt(localStorage.getItem('bingo-tickets'), 10);

  if (!lastReset || now - lastReset >= TICKET_RESET_TIME) {
    tickets = FREE_TICKETS;
    localStorage.setItem('bingo-last-reset', now);
    localStorage.setItem('bingo-tickets', tickets);
  }

  if (isNaN(tickets)) {
    tickets = FREE_TICKETS;
    localStorage.setItem('bingo-tickets', tickets);
  }

  return tickets;
};

// Save tickets to local storage
const saveTickets = (newTickets, domElements) => {
  localStorage.setItem('bingo-tickets', newTickets);
  domElements.ticketsDisplay.innerText = `Your Tickets: ${newTickets}`;
};

// Load draws from local storage
const loadDraws = (domElements, gameState) => {
  gameState.drawCount = parseInt(localStorage.getItem('bingo-draws'), 10) || 0;
  domElements.drawsDisplay.innerText = `Draws: ${gameState.drawCount} of ${MAX_DRAWS}`;
};

// Save draws to local storage
const saveDraws = (gameState) => {
  localStorage.setItem('bingo-draws', gameState.drawCount);
};

// Start the reset timer for tickets
const startResetTimer = (gameState, domElements) => {
  const now = Date.now();
  const lastReset = parseInt(localStorage.getItem('bingo-last-reset'), 10);

  const timeLeft = lastReset
    ? Math.max(0, TICKET_RESET_TIME - (now - lastReset))
    : TICKET_RESET_TIME;

  if (timeLeft === 0) {
    resetTickets(gameState, domElements);
  } else {
    updateCountdownDisplay(timeLeft, domElements);
    const countdownInterval = setInterval(() => {
      const newTimeLeft = Math.max(0, timeLeft - (Date.now() - now));
      updateCountdownDisplay(newTimeLeft, domElements);
      if (newTimeLeft <= 0) {
        clearInterval(countdownInterval);
        resetTickets(gameState, domElements);
      }
    }, 1000);
  }
};

// Update the countdown display
const updateCountdownDisplay = (timeLeft, domElements) => {
  const hours = Math.floor(timeLeft / 3600000);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  domElements.button.disabled = true;
  domElements.button.innerText = `Wait: ${hours
    .toString()
    .padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

// Reset tickets
const resetTickets = (gameState, domElements) => {
  localStorage.setItem('bingo-tickets', FREE_TICKETS);
  localStorage.setItem('bingo-last-reset', Date.now());
  gameState.tickets = FREE_TICKETS;
  domElements.ticketsDisplay.innerText = `Your Tickets: ${gameState.tickets}`;
  domElements.button.disabled = false;
  domElements.button.innerText = 'New Game';
};

// Generate a new ticket
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

// Render the ticket grid
const renderTicket = (ticketContainer, ticket, gardenTextures, starTexture) => {
  ticket.forEach((item, index) => {
    const texture =
      item === 'free-star'
        ? starTexture
        : gardenTextures[GARDEN_ITEMS.indexOf(item)];
    const sprite = ticketContainer.getChildAt(index);
    sprite.texture = texture;
    sprite.tint = 0xffffff;
  });
};

// Update the jackpot counter
const updateJackpotCounter = (gameState, domElements) => {
  domElements.jackpotCounter.innerText = gameState.jackpotDrawsLeft;
};
