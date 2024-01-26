import { Test, TestingModule } from '@nestjs/testing';
import { CardController } from './card.controller';
import { DeckService } from '../deck/deck.service';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { CardService } from './card.service';
import { OwnDeckOrAdminRequest } from '../util/request/own-deck-or-admin.request';
import { CreateCardDto } from './dto/create-card.dto';
import { CardDocument } from './card.schema';
import { ConflictException } from '@nestjs/common';
import { UpdateConfidenceDto } from './dto/update-confidence.dto';
import { Confidence } from './confidence.enum';

describe('CardController', () => {
  let controller: CardController;
  let deckService: DeepMocked<DeckService>;
  let cardService: DeepMocked<CardService>;

  const request = createMock<OwnDeckOrAdminRequest>();
  request.deck.id = 'deckId';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardController],
      providers: [
        {
          provide: DeckService,
          useValue: createMock<DeckService>(),
        },
        {
          provide: CardService,
          useValue: createMock<CardService>(),
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    controller = module.get(CardController);
    deckService = module.get(DeckService);
    cardService = module.get(CardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call cardService and return the id', async () => {
      const createCardDto = createMock<CreateCardDto>();

      cardService.create.mockResolvedValue({ id: '1' } as CardDocument);

      await expect(
        controller.create(request, 'deckId', createCardDto),
      ).resolves.toEqual({ id: '1' });
      expect(cardService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findCardsToLearn', () => {
    it('should return a Array of cards', async () => {
      cardService.findCardsToLearn.mockResolvedValue([
        {
          id: '1',
          word: 'word',
          translation: 'translation',
          phonetic: 'phonetic',
          audioLink: 'audioLink',
          definitions: ['definition'],
          examples: ['example'],
          synonyms: ['synonym'],
          antonyms: ['antonym'],
        } as CardDocument,
      ]);

      const response = await controller.findCardsToLearn(request, 'deckId');

      response.forEach((card) => {
        expect(card).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            word: expect.any(String),
            translation: expect.any(String),
            phonetic: expect.anything(),
            audioLink: expect.anything(),
            definitions: expect.any(Array),
            examples: expect.any(Array),
            synonyms: expect.any(Array),
            antonyms: expect.any(Array),
          }),
        );
      });
      expect(cardService.findCardsToLearn).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should throw exception if card does not belong to deck', async () => {
      cardService.findOne.mockResolvedValue({
        deck: {
          toString: jest.fn().mockReturnValue('otherDeckId'),
        },
      } as unknown as CardDocument);

      const responsePromise = controller.remove(request, 'cardId');
      await expect(responsePromise).rejects.toThrow(ConflictException);
      await expect(responsePromise).rejects.toThrow(
        'Card does not belong to Deck',
      );
      expect(cardService.remove).toHaveBeenCalledTimes(0);
    });

    it('should call remove from cardService', async () => {
      cardService.findOne.mockResolvedValue({
        deck: {
          toString: jest.fn().mockReturnValue('deckId'),
        },
      } as unknown as CardDocument);

      await expect(controller.remove(request, 'cardId')).resolves.not.toThrow();
      expect(cardService.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateConfidence', () => {
    it('should throw exception if card does not belong to deck', async () => {
      const updateConfidenceDto = createMock<UpdateConfidenceDto>();

      cardService.findOne.mockResolvedValue({
        deck: {
          toString: jest.fn().mockReturnValue('otherDeckId'),
        },
      } as unknown as CardDocument);

      const responsePromise = controller.updateConfidence(
        request,
        'deckId',
        'cardId',
        updateConfidenceDto,
      );
      await expect(responsePromise).rejects.toThrow(ConflictException);
      await expect(responsePromise).rejects.toThrow(
        'Card does not belong to Deck',
      );
      expect(cardService.updateCardHard).toHaveBeenCalledTimes(0);
      expect(cardService.updateCardGood).toHaveBeenCalledTimes(0);
      expect(cardService.updateCardEasy).toHaveBeenCalledTimes(0);
      expect(deckService.incrementTodayLearnedCards).toHaveBeenCalledTimes(0);
    });

    it('should call updateCardHard if confidence is hard', async () => {
      const updateConfidenceDto = {
        confidence: Confidence.hard,
      };

      cardService.findOne.mockResolvedValue({
        deck: {
          toString: jest.fn().mockReturnValue('deckId'),
        },
      } as unknown as CardDocument);

      const responsePromise = controller.updateConfidence(
        request,
        'deckId',
        'cardId',
        updateConfidenceDto,
      );

      await expect(responsePromise).resolves.not.toThrow();
      expect(cardService.updateCardHard).toHaveBeenCalledTimes(1);
      expect(cardService.updateCardGood).toHaveBeenCalledTimes(0);
      expect(cardService.updateCardEasy).toHaveBeenCalledTimes(0);
      expect(deckService.incrementTodayLearnedCards).toHaveBeenCalledTimes(1);
    });

    it('should call updateCardGood if confidence is good', async () => {
      const updateConfidenceDto = {
        confidence: Confidence.good,
      };

      cardService.findOne.mockResolvedValue({
        deck: {
          toString: jest.fn().mockReturnValue('deckId'),
        },
      } as unknown as CardDocument);

      const responsePromise = controller.updateConfidence(
        request,
        'deckId',
        'cardId',
        updateConfidenceDto,
      );

      await expect(responsePromise).resolves.not.toThrow();
      expect(cardService.updateCardHard).toHaveBeenCalledTimes(0);
      expect(cardService.updateCardGood).toHaveBeenCalledTimes(1);
      expect(cardService.updateCardEasy).toHaveBeenCalledTimes(0);
      expect(deckService.incrementTodayLearnedCards).toHaveBeenCalledTimes(1);
    });

    it('should call updateCardEasy if confidence is easy', async () => {
      const updateConfidenceDto = {
        confidence: Confidence.easy,
      };

      cardService.findOne.mockResolvedValue({
        deck: {
          toString: jest.fn().mockReturnValue('deckId'),
        },
      } as unknown as CardDocument);

      const responsePromise = controller.updateConfidence(
        request,
        'deckId',
        'cardId',
        updateConfidenceDto,
      );

      await expect(responsePromise).resolves.not.toThrow();
      expect(cardService.updateCardHard).toHaveBeenCalledTimes(0);
      expect(cardService.updateCardGood).toHaveBeenCalledTimes(0);
      expect(cardService.updateCardEasy).toHaveBeenCalledTimes(1);
      expect(deckService.incrementTodayLearnedCards).toHaveBeenCalledTimes(1);
    });
  });
});
