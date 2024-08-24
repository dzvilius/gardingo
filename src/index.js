import { setupBingo } from './bingo';

import './styles/main.scss';

// Initialise the application
(async function start() {
  await setupBingo();
})();