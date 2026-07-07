import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, delay, retryWhen, take } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

interface CountriesDevCountry {
  name: string;
  alpha2Code: string;
  region: string;
}

interface CountryListItem {
  name: string;
  code: string;
  continent: string;
}

@Injectable()
export class CountryService implements OnModuleInit {
  private readonly logger = new Logger(CountryService.name);

  constructor(private readonly httpService: HttpService) {}

  async getCountries(): Promise<CountryListItem[]> {
    const url =
      'https://countries.dev/countries?fields=name,alpha2Code,region&sort=name&order=asc';

    try {
      const response = await firstValueFrom(
        this.httpService
          .get(url, {
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          })
          .pipe(retryWhen((errors) => errors.pipe(delay(1000), take(3)))),
      );

      const countries = response.data as CountriesDevCountry[];

      if (!Array.isArray(countries)) {
        throw new Error('Unexpected response format from countries.dev');
      }

      return countries
        .filter((country) => country?.name && country?.alpha2Code)
        .map((country) => ({
          name: country.name,
          code: country.alpha2Code, //Country code
          continent: country.region, //Country continent
        }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Error fetching countries from countries.dev:',
        errorMessage,
      );
      throw new Error('Failed to fetch countries');
    }
  }

  // Save the countries to a file
  async saveCountriesToFile(): Promise<void> {
    try {
      const countries = await this.getCountries(); // Get the countries
      const filePath = path.join(__dirname, 'countries.json'); // Define the file path
      fs.writeFileSync(filePath, JSON.stringify(countries, null, 2)); // Write the countries to the file
      this.logger.debug(`Countries saved to file: ${filePath}`);
    } catch (error) {
      this.logger.error('Error saving countries to file:', error.message);
      this.logger.error('Error details:', error);
    }
  }

  async onModuleInit() {
    await this.saveCountriesToFile();
  }
}
