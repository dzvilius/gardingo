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

  // Load the star image asset
  const starTexture = await Assets.load(require('./assets/img/star.svg'));

  // Load all garden images
  const gardenTextures = await Promise.all(
    GARDEN_ITEMS.map((item) => Assets.load(require(`./assets/img/${item}.png`)))
  );

  let currentTicket = [];
  let drawnImages = [];
  let drawCount = 0;

  const gameImage = document.getElementById('game-image');
  const promoText = document.getElementById('game-promo');
  const ticketsDisplay = document.getElementById('game-tickets');
  const drawsDisplay = document.getElementById('game-draws');
  const button = document.querySelector('.GameFooter__action .button');

  // Local storage management
  const loadTickets = () => {
    let tickets = parseInt(localStorage.getItem('bingo-tickets'), 10);
    if (isNaN(tickets) || tickets < 1) {
      tickets = 10;
      localStorage.setItem('bingo-tickets', tickets);
    }
    return tickets;
  };

  let tickets = loadTickets();
  ticketsDisplay.innerText = `Your Tickets: ${tickets}`;

  const saveTickets = (newTickets) => {
    localStorage.setItem('bingo-tickets', newTickets);
    ticketsDisplay.innerText = `Your Tickets: ${newTickets}`;
  };

  const loadDraws = () => {
    drawCount = parseInt(localStorage.getItem('bingo-draws'), 10) || 0;
    drawsDisplay.innerText = `Draws: ${drawCount} of 41`;
  };

  const saveDraws = () => {
    localStorage.setItem('bingo-draws', drawCount);
    drawsDisplay.innerText = `Draws: ${drawCount} of 41`;
  };

  loadDraws();

  // Timer reset for daily tickets
  const resetTicketsTimer = () => {
    const lastReset = localStorage.getItem('bingo-last-reset');
    const now = Date.now();
    if (!lastReset || now - lastReset >= 86400000) {
      localStorage.setItem('bingo-tickets', '10');
      localStorage.setItem('bingo-last-reset', now);
      tickets = 10;
      ticketsDisplay.innerText = `Your Tickets: ${tickets}`;
      button.disabled = false;
      button.innerText = 'Deal';
    }
  };

  resetTicketsTimer();

  // Create empty ticket grid
  const createEmptyTicketGrid = () => {
    const ticketContainer = new Container();
    ticketContainer.label = 'ticketContainer'; // Ensure the name is correctly set

    for (let i = 0; i < 25; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;

      const texture = i === 12 ? starTexture : Texture.WHITE;

      const sprite = new Sprite(texture);
      sprite.width = 70;
      sprite.height = 70;
      sprite.x = col * 80 + 5;
      sprite.y = row * 80 + 5;
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
    if (!ticketContainer) {
      console.error('Ticket container not found.');
      return;
    }

    ticket.forEach((item, index) => {
      const texture =
        item === 'free-star'
          ? starTexture
          : gardenTextures[GARDEN_ITEMS.indexOf(item)];
      const sprite = ticketContainer.getChildAt(index);
      sprite.texture = texture;
    });
  };

  // Function to reset the state for a new game
  const resetGameState = () => {
    drawnImages = []; // Clear the list of drawn images
    currentTicket = []; // Clear the current ticket
    drawCount = 0; // Reset draw count
    saveDraws(); // Update local storage
    drawsDisplay.innerText = `Draws: ${drawCount} of 41`; // Update display
  };

  // Draw a random image
  const drawImage = () => {
    drawCount++;
    saveDraws();

    if (!gameImage) {
      console.error('Element with id "game-image" not found.');
      return;
    }

    const remainingItems = GARDEN_ITEMS.filter(
      (item) => !drawnImages.includes(item)
    );

    if (remainingItems.length === 0) {
      console.warn('No more images to draw.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * remainingItems.length);
    const drawnItem = remainingItems[randomIndex];
    drawnImages.push(drawnItem);

    try {
      gameImage.src = `./assets/img/${drawnItem}.png`;
    } catch (error) {
      console.error('Error setting image source:', error);
    }

    const ticketIndex = currentTicket.indexOf(drawnItem);
    if (ticketIndex !== -1) {
      markTicket(ticketIndex);
    }

    checkWinConditions();

    if (drawCount >= 41) {
      alert('41 draws completed. Start a new game by dealing a new ticket.');
      resetTicket(); // Reset the ticket to the default state
      resetGameState(); // Reset game state for a new game
      button.innerText = 'Deal';
    }

    drawsDisplay.innerText = `Draws: ${drawCount} of 41`;
  };

  // Mark a matching item on the bingo ticket
  const markTicket = (index) => {
    const ticketContainer =
      bingoGameApp.stage.getChildByName('ticketContainer');
    if (!ticketContainer) {
      console.error('Ticket container not found.');
      return;
    }

    const sprite = ticketContainer.getChildAt(index);
    sprite.texture = starTexture;
    sprite.tint = 0xff0000; // Change tint to red when marked
  };

  // Check for win conditions
  const checkWinConditions = () => {
    const ticketContainer =
      bingoGameApp.stage.getChildByName('ticketContainer');
    const markedIndices = ticketContainer.children
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
    let winningIndices = new Set();

    lines.forEach((line) => {
      if (line.every((index) => markedIndices.includes(index))) {
        wonLines++;
        line.forEach((index) => {
          winningIndices.add(index);
        });
        if (wonLines === 1) {
          document
            .getElementById('one-line')
            .classList.add('Leaderboard__item--won');
          promoText.innerText = 'Congratulations! You Won $5 Credit!';
        } else if (wonLines === 2) {
          document
            .getElementById('two-lines')
            .classList.add('Leaderboard__item--won');
          promoText.innerText = 'Congratulations! You Won $15 Credit!';
        }
      }
    });

    // Highlight the winning lines
    ticketContainer.children.forEach((sprite, index) => {
      if (winningIndices.has(index)) {
        sprite.tint = 0xff0000; // Highlight the winning line
      } else if (sprite.texture === starTexture) {
        sprite.tint = 0xffffff; // Reset tint for non-winning stars
      }
    });

    if (wonLines === 2 && markedIndices.length === 25 && drawCount <= 31) {
      document
        .getElementById('jackpot')
        .classList.add('Leaderboard__item--won');
      promoText.innerText = 'Congratulations! You Won $100 Credit!';
      resetGame();
    } else if (wonLines === 2 && markedIndices.length === 25) {
      document
        .getElementById('full-house')
        .classList.add('Leaderboard__item--won');
      promoText.innerText = 'Congratulations! You Won $25 Credit!';
      resetGame();
    } else if (drawCount === 41 && tickets === 0 && wonLines < 1) {
      promoText.innerText = 'Better Luck Next Time!';
      resetGame();
    }
  };

  // Reset game after win or loss
  const resetGame = () => {
    // Clear "Leaderboard__item--won" class from all leaderboard items
    const leaderboardItems = document.querySelectorAll('.Leaderboard__item');
    leaderboardItems.forEach((item) => {
      item.classList.remove('Leaderboard__item--won');
    });

    resetTicket(); // Reset the ticket grid
    tickets = 0;
    saveTickets(0);
    drawCount = 0;
    saveDraws();
    button.disabled = true;

    setTimeout(() => {
      resetTicketsTimer();
      location.reload(); // Force page refresh to ensure all UI elements are reset
    }, 500); // Short delay before refreshing
  };

  // Reset the ticket to the default empty state
  const resetTicket = () => {
    const ticketContainer =
      bingoGameApp.stage.getChildByName('ticketContainer');
    if (!ticketContainer) {
      console.error('Ticket container not found.');
      return;
    }

    ticketContainer.children.forEach((sprite, index) => {
      sprite.texture = index === 12 ? starTexture : Texture.WHITE;
      sprite.tint = index !== 12 ? 0xcccccc : 0xffffff;
    });
  };

  // Button click event
  button.addEventListener('click', () => {
    if (button.innerText === 'Deal') {
      if (tickets > 0) {
        currentTicket = generateTicket();
        renderTicket(currentTicket);
        resetGameState(); // Reset game state when dealing a new ticket
        saveTickets(--tickets);
        button.innerText = 'Play';
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
};
