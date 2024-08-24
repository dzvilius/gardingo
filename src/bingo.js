import { Application, Sprite, Assets, Container } from 'pixi.js';

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
    // resizeTo: gameContainer,
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

  // Function to generate a new bingo ticket
  function generateTicket() {
    const items = [...GARDEN_ITEMS];
    const ticket = [];

    // Shuffle items and pick the first 24 for the card
    while (ticket.length < 24) {
      const randomIndex = Math.floor(Math.random() * items.length);
      ticket.push(items.splice(randomIndex, 1)[0]);
    }

    // Insert "Free Star" in the center
    ticket.splice(12, 0, 'free-star');

    return ticket;
  }

  // Function to draw a random image
  function drawImage() {
    drawCount++;

    const remainingItems = GARDEN_ITEMS.filter(
      (item) => !drawnImages.includes(item)
    );
    const randomIndex = Math.floor(Math.random() * remainingItems.length);
    const drawnItem = remainingItems[randomIndex];
    drawnImages.push(drawnItem);

    // Update the displayed image
    gameImage.src = `./assets/img/${drawnItem}.png`;

    // Check if the item matches any on the current ticket
    const ticketIndex = currentTicket.indexOf(drawnItem);
    if (ticketIndex !== -1) {
      markTicket(ticketIndex);
    }

    // Check win conditions
    checkWinConditions();
  }

  // Function to mark a matching item on the bingo ticket
  function markTicket(index) {
    // Logic to place a star on the matched item
    const ticketContainer =
      bingoGameApp.stage.getChildByName('ticketContainer');
    const sprite = ticketContainer.getChildAt(index);
    sprite.texture = starTexture;
  }

  // Function to check for win conditions
  function checkWinConditions() {
    // Logic to check if the player has "one line", "two lines", "full house", or "jackpot"
    // This will depend on how the grid is set up and checking if the rows, columns, or diagonals are marked
  }

  // Set up event listener for "Draw" and "Play" button
  const button = document.querySelector('.GameFooter__action .button');
  button.addEventListener('click', () => {
    if (button.innerText === 'Deal') {
      currentTicket = generateTicket();
      button.innerText = 'Play';
      // Render the new ticket on the screen
      renderTicket(currentTicket);
    } else if (button.innerText === 'Play') {
      if (drawCount < 41) {
        drawImage();
      } else {
        alert('Maximum 41 draws reached. Start a new game.');
      }
    }
  });

  // Function to render the ticket on the screen
  function renderTicket(ticket) {
    const ticketContainer = new Container();
    ticketContainer.name = 'ticketContainer';

    ticket.forEach((item, index) => {
      const row = Math.floor(index / 5);
      const col = index % 5;

      const texture =
        item === 'free-star'
          ? starTexture
          : gardenTextures[GARDEN_ITEMS.indexOf(item)];
      const sprite = new Sprite(texture);

      // Set the sprite's size to 70x70
      sprite.width = 70;
      sprite.height = 70;

      // Calculate the position with a 5px margin on each side
      sprite.x = col * 80 + 5; // (70px + 10px gap) centered
      sprite.y = row * 80 + 5; // (70px + 10px gap) centered

      ticketContainer.addChild(sprite);
    });

    bingoGameApp.stage.addChild(ticketContainer);
  }
};
