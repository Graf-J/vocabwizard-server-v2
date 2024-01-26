import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map } from 'rxjs';
import ApiDictionaryResponse, {
  Meaning,
} from './response/api-dictionary-response';
import ApiResponse from './response/api-response';

@Injectable()
export class LexicalInfoService {
  private dictionaryApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
  ) {
    this.dictionaryApiUrl = configService.get('DICTIONARY_API_URL');
  }

  async getInfo(word: string) {
    const url = `${this.dictionaryApiUrl}/api/v2/entries/en/${word}`;
    const response = await lastValueFrom(
      this.httpService.get<ApiDictionaryResponse[]>(url).pipe(
        map((res) => new ApiResponse<ApiDictionaryResponse[]>(false, res.data)),
        catchError((error) => {
          Logger.error(`External Request to ${url} failed`, error);
          return [new ApiResponse<ApiDictionaryResponse[]>(true)];
        }),
      ),
    );

    // Remove duplicate Synonyms and Antonyms
    if (!response.error && response.data) {
      response.data.forEach((entry) => {
        this.removeDuplicates(entry.meanings);
      });
    }

    return response;
  }

  removeDuplicates(meanings: Meaning[]): void {
    const allSynonyms: string[] = [];
    const allAntonyms: string[] = [];

    // Collect all synonyms and antonyms from all meanings
    meanings.forEach((meaning) => {
      allSynonyms.push(...meaning.synonyms);
      allAntonyms.push(...meaning.antonyms);
    });

    // Remove duplicates from the collected arrays
    const uniqueSynonyms = [...new Set(allSynonyms)];
    const uniqueAntonyms = [...new Set(allAntonyms)];

    // Apply the unique arrays to first meaning and clear the other meanings
    let firstIteration = true;
    meanings.forEach((meaning) => {
      if (firstIteration) {
        meaning.synonyms = uniqueSynonyms;
        meaning.antonyms = uniqueAntonyms;
        firstIteration = false;
      } else {
        meaning.synonyms = [];
        meaning.antonyms = [];
      }
    });
  }
}
