import { authE2E } from './auth-e2e';
import { userE2E } from './user-e2e';
import { deckE2E } from './deck-e2e';

// Tests will execute subsequently
describe('AuthController (e2e)', authE2E);
describe('UserController (e2e)', userE2E);
describe('DeckController (e2e)', deckE2E);
