import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map } from 'rxjs';
import { Language } from '../deck/languages.enum';
import LibreTranslateResponse from './response/libre-translate-response';
import ApiResponse from './response/api-response';

@Injectable()
export class TranslatorService {
  private libreTranslateUrl: string;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
  ) {
    this.libreTranslateUrl = configService.get('LIBRE_TRANSLATE_URL');
  }

  async translate(word: string, fromLang: Language, toLang: Language) {
    const url = `${this.libreTranslateUrl}/translate`;
    const data = `q=${word}&source=${fromLang}&target=${toLang}`;
    const response = await lastValueFrom(
      this.httpService.post<LibreTranslateResponse>(url, data).pipe(
        map((res) => new ApiResponse<LibreTranslateResponse>(false, res.data)),
        catchError((error) => {
          Logger.error(`External Request to ${url}?${data} failed`, error);
          return [new ApiResponse<LibreTranslateResponse>(true)];
        }),
      ),
    );

    return response;
  }
}
