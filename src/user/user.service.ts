import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { sensor_data } from 'src/arduino/arduino.entity';
import { Repository } from 'typeorm';
import { readFile, writeFile } from 'fs/promises';
import { arduinoConfig } from 'src/arduino/arduinoType';

type History = {
  date: number;
  value: number;
};

type SensorData = {
  currentCapasity: number;
  priceEstimation: number;
  priceEstimationProgresif: number;
  // Past 6 months
  monthly: {
    mean: number;
    min: number;
    max: number;
    historyPrice: Array<History>;
    historyLiter: Array<History>;
  };

  // Past 7 days or a week
  daily: {
    mean: number;
    min: number;
    max: number;
    historyPrice: Array<History>;
    historyLiter: Array<History>;
  };

  system: {
    totalUpTime: number;
    internalTime: Date;
    chipTemp: number;
    availableMem: number;
    wifiSignal: number;
  };
};

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(sensor_data)
    private arduinoRepository: Repository<sensor_data>,
  ) {}

  async getConfigData(): Promise<arduinoConfig> {
    const file = await readFile('src/arduino/arduinoConfig.json', 'utf8');
    const config = JSON.parse(file) as arduinoConfig;

    return config;
  }

  async updateConfigData(config: arduinoConfig): Promise<object> {
    const configString = JSON.stringify(config);
    try {
      await writeFile('src/arduino/arduinoConfig.json', configString);
    } catch (e) {
      throw new HttpException(
        {
          message: 'error while writing config',
          // eslint-ignore-next-line
          system: e as Error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const message = {
      message: 'success',
    };

    return message;
  }

  async getSensorData(): Promise<SensorData> {
    const data: SensorData = {};

    // eslint-ignore-next-line
    const rawData = await this.arduinoRepository.query(
      // eslint-ignore-next-line
      "WITH hitung_all AS (SELECT id,        date,        distance,        CASE             WHEN distance > LAG(distance) OVER (ORDER BY date, id)             THEN distance - LAG(distance) OVER (ORDER BY date, id)            ELSE NULL         END AS delta    FROM sensor_data)SELECT * FROM hitung_allWHERE date >= '2026-03-01 00:00:00' AND date <= '2026-06-06 23:59:59'ORDER BY date",
    );

    return data;
  }
}
