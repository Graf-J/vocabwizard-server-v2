import { Test, TestingModule } from '@nestjs/testing';
import { LexicalInfoService } from './lexical-info.service';
import { createMock } from '@golevelup/ts-jest';
import { Meaning } from './response/api-dictionary-response';

describe('LexicalInfoService', () => {
  let service: LexicalInfoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LexicalInfoService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get(LexicalInfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('removeDuplicates', () => {
    it('should remove duplicate synonyms and antonyms and aggregate in first lists', () => {
      const meanings: Meaning[] = [
        {
          partOfSpeech: 'noun',
          definitions: [
            {
              definition: 'a representative form or pattern',
              synonyms: ['model', 'prototype', 'exemplar'],
              antonyms: ['counterexample', 'nonexample'],
              example: 'This is an example of a well-written definition.',
            },
          ],
          synonyms: ['instance', 'illustration', 'sample'],
          antonyms: ['noninstance', 'counterexample'],
        },
        {
          partOfSpeech: 'verb',
          definitions: [
            {
              definition: 'to serve as an example of',
              synonyms: ['model', 'illustrate', 'demonstrate', 'exemplify'],
              antonyms: ['contradict', 'disprove'],
            },
          ],
          synonyms: ['model', 'demonstrate', 'show', 'illustrate'],
          antonyms: ['contradict', 'disprove'],
        },
      ];

      service.removeDuplicates(meanings);

      expect(meanings[0].synonyms).toEqual([
        'instance',
        'illustration',
        'sample',
        'model',
        'demonstrate',
        'show',
        'illustrate',
      ]);
      expect(meanings[0].antonyms).toEqual([
        'noninstance',
        'counterexample',
        'contradict',
        'disprove',
      ]);
    });
  });
});
