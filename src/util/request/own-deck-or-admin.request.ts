import { DeckDocument } from '../../deck/deck.schema';
import { AuthGuardRequest } from './auth-guard.request';

export interface OwnDeckOrAdminRequest extends AuthGuardRequest {
  deck: DeckDocument;
}
