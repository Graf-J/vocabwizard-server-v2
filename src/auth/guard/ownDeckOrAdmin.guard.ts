import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { DeckService } from '../../deck/deck.service';
import { Role } from '../../user/roles.enum';

@Injectable()
export class OwnDeckOrAdminGuard implements CanActivate {
  constructor(private readonly deckService: DeckService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;
    const userRole = request.user.role;
    const deckId = request.params.deckId;

    if (!isValidObjectId(deckId)) {
      throw new BadRequestException(`Invalid ObjectId: ${deckId}`);
    }

    const deck = await this.deckService.findOne(deckId);
    request.deck = deck;

    if (
      !(deck.creator.toString() === userId || userRole === Role.administrator)
    ) {
      throw new ForbiddenException("You don't have access to this deck");
    }

    return true;
  }
}
