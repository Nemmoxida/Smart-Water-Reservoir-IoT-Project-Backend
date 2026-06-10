/* eslint-disable */

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
    const file = await readFile('src/arduino/arduinoSystem.json', 'utf8');
    const config = JSON.parse(file);

    const data: SensorData = {};

    // eslint-ignore-next-line
    const rawData = await this.arduinoRepository.query(
      // eslint-ignore-next-line
      "WITH hitung_all AS (SELECT id,        date,        distance,        CASE             WHEN distance > LAG(distance) OVER (ORDER BY date, id)             THEN distance - LAG(distance) OVER (ORDER BY date, id)            ELSE NULL         END AS delta    FROM sensor_data)SELECT * FROM hitung_allWHERE date >= '2026-03-01 00:00:00' AND date <= NOW() ORDER BY date DESC",
    );

    data.currentCapasity = rawData[0].distance;

    // Daily capacity
    data.daily.mean =
      rawData.reduce((accumulator, currentValue) => {
        return (accumulator += currentValue);
      }) / rawData.length;
    data.daily.min = rawData.reduce((prev, current) => {
      return prev.distance < current.distance
        ? current.distance
        : prev.distance;
    });
    data.daily.max = rawData.reduce((prev, current) => {
      return prev.distance > current.distance
        ? current.distance
        : prev.distance;
    });
    data.daily.historyLiter = rawData;

    data.priceEstimationProgresif = rawData.filter();

    // Not fixed
    // data.priceEstimation =

    // System Info
    data.system = config;

    return data;
  }
}
