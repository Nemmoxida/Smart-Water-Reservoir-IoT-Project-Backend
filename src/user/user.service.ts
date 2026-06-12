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
  priceEstimation?: number;
  priceEstimationProgresif: number;
  // Past 6 months
  monthly?: {
    mean: number;
    min?: number;
    max?: number;
    historyPrice: Array<History>;
    historyLiter: Array<History>;
  };

  // Past 7 days or a week
  daily: {
    mean: number;
    min?: number;
    max?: number;
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

    const data: any = {};

    // getting data from DB
    const rawData = await this.arduinoRepository.query(
      "WITH hitung_all AS (SELECT id, date, distance, CASE WHEN distance > LAG(distance) OVER (ORDER BY date, id) THEN distance - LAG(distance) OVER (ORDER BY date, id) ELSE NULL END AS delta FROM sensor_data) SELECT * FROM hitung_all WHERE date >= '2026-01-01 00:00:00' AND date <= NOW() ORDER BY date DESC",
    );

    data.currentCapasity = rawData[0].distance;
    data.daily = await this.userDaily(rawData);
    // data.monthly = await this.userMonthly(rawData);

    data.priceEstimationProgresif = await this.priceEstimation(rawData);

    // System Info
    data.system = config;

    return data;
  }

  private async userDaily(rawData) {
    const dailyData: any = {
      daily: {},
    };

    const filteredDataDaily = rawData.filter((data) => {
      return new Date(data.date).getDay() + 1 == new Date().getDay() + 1;
    });

    // console.log(filteredDataDaily);

    // Daily capacity
    dailyData.daily.mean =
      filteredDataDaily.reduce((accumulator, currentValue) => {
        // console.log(accumulator);
        // console.log(currentValue.delta);
        return (accumulator += currentValue.delta / 10);
      }, 0) / filteredDataDaily.length;

    // console.log(
    //   filteredDataDaily.reduce((accumulator, currentValue) => {
    //     return (accumulator += currentValue.delta / 10);
    //   }),
    // );

    // dailyData.daily.min = filteredDataDaily.reduce((prev, current) => {
    //   // console.log('current: ' + current);
    //   // console.log(prev > current.distance);
    //   return prev > current.distance ? (prev = current.distance) : prev;
    // }, 100);
    // dailyData.daily.max = filteredDataDaily.reduce((prev, current) => {
    //   return prev > current.distance ? current.distance : prev;
    // });
    dailyData.daily.historyLiter = filteredDataDaily.map((item) => {
      // console.log(filteredDataDaily.date);
      // console.log((Math.PI * 96 * filteredDataDaily.distance) / 10)
      const history: any = [
        {
          date: new Date(new Date().setHours(0, 0, 0, 0)),
          liter: 0,
        },
      ];
      let firstHour = 0;
      const hourData = new Date(item.date).getHours();
      if (hourData != firstHour) {
        firstHour = hourData;
      }

      history.some((item) => item.date.getHours() == hourData);

      if (!history) {
        const object = {
          date: new Date(new Date().setHours(firstHour, 0, 0, 0)),
          liter: 0,
        };

        history.push(object);
      }

      history[firstHour].liter +=
        (Math.PI * Math.pow(48, 2) * item.distance) / 10;

      if (hourData) return history;
    });
    dailyData.daily.historyPrice = filteredDataDaily.map(() => {
      return {
        date: filteredDataDaily.date,
        price: ((Math.PI * 96 * filteredDataDaily.distance) / 10) * 0.1,
      };
    });

    return dailyData;
  }

  private async userMonthly(rawData) {
    const monthlyData: any = {
      monthly: {},
    };

    const filteredDataMonthly = rawData.filter((data) => {
      return new Date(data.date).getMonth() + 1 == new Date().getMonth() + 1;
    });

    // monthly capacity
    monthlyData.monthly.mean =
      filteredDataMonthly.reduce((accumulator, currentValue) => {
        return (accumulator += currentValue);
      }) / filteredDataMonthly.length;
    // monthlyData.monthly.min = filteredDataMonthly.reduce((prev, current) => {
    //   return prev < current.distance ? current.distance : prev;
    // });
    // monthlyData.monthly.max = filteredDataMonthly.reduce((prev, current) => {
    //   return prev > current.distance ? current.distance : prev;
    // });
    monthlyData.monthly.historyLiter = filteredDataMonthly.map(() => {
      return {
        date: filteredDataMonthly.date,
        liter: (Math.PI * 96 * filteredDataMonthly.distance) / 10,
      };
    });
    monthlyData.monthly.historyPrice = filteredDataMonthly.map(() => {
      return {
        date: filteredDataMonthly.date,
        liter: ((Math.PI * 96 * filteredDataMonthly.distance) / 10) * 0.1,
      };
    });

    return monthlyData;
  }

  private async priceEstimation(rawData) {
    const priceData: any = {};
    const filteredData = rawData.filter((data) => {
      return new Date(data.date).getMonth() + 1 == new Date().getMonth() + 1;
    });

    priceData.progressif = filteredData.reduce((total, delta) => {
      return (total += delta);
    });

    return priceData.progressif;
  }
}
