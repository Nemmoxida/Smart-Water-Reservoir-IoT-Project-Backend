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
  priceEstimationProgresif?: number;
  // Past 6 months
  monthly?: {
    mean: number;
    totalLiterUsed: number;
    min?: number;
    max?: number;
    historyLiter: Array<History>;
  };

  // Past 7 days or a week
  daily: {
    mean: number;
    totalLiterUsed: number;
    min?: number;
    max?: number;
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

  async updateConfigData(
    config: Partial<arduinoConfig['config']> | any,
  ): Promise<any> {
    const path = 'src/arduino/arduinoConfig.json';

    try {
      const file = await readFile(path, 'utf8');
      const json = JSON.parse(file) as any;

      // Replace config part and bump version/time
      json.config = config;
      json.configVersion =
        typeof json.configVersion === 'number' ? json.configVersion + 1 : 1;
      json.currenTime = new Date().toISOString();

      await writeFile(path, JSON.stringify(json, null, 2));
    } catch (e) {
      throw new HttpException(
        {
          message: 'error while writing config',
          system: e as Error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { message: 'success' };
  }

  async getSensorData(): Promise<SensorData> {
    const file = await readFile('src/arduino/arduinoSystem.json', 'utf8');
    const config = JSON.parse(file);

    const data: any = {};

    // getting data from DB
    const rawData = await this.arduinoRepository.query(
      "WITH hitung_all AS (SELECT id, date, distance, CASE WHEN distance > LAG(distance) OVER (ORDER BY date, id) THEN distance - LAG(distance) OVER (ORDER BY date, id) ELSE NULL END AS delta FROM sensor_data) SELECT * FROM hitung_all WHERE date >= '2026-05-01 00:00:00' AND date <= NOW() ORDER BY date DESC",
    );

    data.currentCapasity = rawData[0].distance;
    data.daily = await this.userDaily(rawData);
    data.monthly = await this.userMonthly(rawData);

    // data.priceEstimationProgresif = await this.priceEstimation(rawData);

    // System Info
    data.system = config;

    return data;
  }

  private async userDaily(rawData) {
    const dailyData: any = {
      daily: {},
    };

    // filter data to only get today's data
    const filteredDataDaily = rawData.filter((data) => {
      const d: Date = data.date;
      const t: Date = new Date();

      return d.getMonth() == t.getMonth() && d.getDate() == t.getDate();
    });

    // // Daily capacity? currently counting average PER MINUTES
    // const sumLiters = filteredDataDaily.reduce((acc, currentValue) => {
    //   if (currentValue.delta != null) {
    //     const liter = (Math.PI * Math.pow(48, 2) * currentValue.delta) / 1000;
    //     notNull++;
    //     return acc + liter;
    //   }
    //   return acc;
    // }, 0);

    // dailyData.daily.mean = notNull ? sumLiters / notNull : 0;
    // dailyData.daily.totalLiterUsed = sumLiters;

    // array for storing average per Hour by liter
    const historyLiter: any = [
      {
        date: new Date(new Date().setHours(0, 0, 0, 0)),
        liter: 0,
      },
    ];

    // the logic to count average per Hour by liter
    const historyLiterFunc = filteredDataDaily.toReversed().map((item) => {
      if (item.delta == null) {
        return;
      }

      // init variable for checking if the current hour in the loop exist
      let firstHour = 0;

      // get hour in the current item.date loop
      const hourData = new Date(item.date).getHours();
      if (hourData != firstHour) {
        firstHour = hourData; // change the first loop if the current loop hour is not present in the array
      }

      if (
        historyLiter.some((item) => item.date.getHours() == hourData) == false
      ) {
        const object = {
          date: new Date(new Date().setHours(firstHour, 0, 0, 0)),
          liter: 0,
        };

        historyLiter.push(object);
      }

      historyLiter[firstHour].liter +=
        (Math.PI * Math.pow(48, 2) * item.delta) / 1000;
    });

    // Daily capacity? currently counting average PER MINUTES
    const sumLiters = historyLiter.reduce((acc, currentValue) => {
      return acc + currentValue.liter;
    }, 0);

    dailyData.daily.mean = sumLiters / 24;
    dailyData.daily.totalLiterUsed = sumLiters;

    // const historyPrice: any = [
    //   {
    //     date: new Date(new Date().setHours(0, 0, 0, 0)),
    //     price: 0,
    //   },
    // ];

    // const historyPriceFunc = filteredDataDaily.toReversed().map((item) => {
    //   let firstHour = 0;
    //   const hourData = new Date(item.date).getHours();
    //   if (hourData != firstHour) {
    //     firstHour = hourData;
    //   }

    //   if (
    //     historyPrice.some((item) => item.date.getHours() == hourData) == false
    //   ) {
    //     const object = {
    //       date: new Date(new Date().setHours(firstHour, 0, 0, 0)),
    //       price: 0,
    //     };

    //     historyPrice.push(object);
    //   }

    //   historyPrice[firstHour].price +=
    //     ((Math.PI * Math.pow(48, 2) * item.distance) / 10) * 0.14;
    // });

    dailyData.daily.historyLiter = historyLiter;
    // dailyData.daily.historyPrice = historyPrice;

    return dailyData;
  }

  private async userMonthly(rawData) {
    const monthlyData: any = {
      monthly: {},
    };

    const filteredDataMonthly = rawData.filter((data) => {
      const d: Date = data.date;
      const t: Date = new Date();

      return d.getMonth() == t.getMonth();
    });

    // let notNull = 0;

    // // Monthly capacity? currently counting average PER MINUTES
    // const sumLiters = filteredDataMonthly.reduce((acc, currentValue) => {
    //   if (currentValue.delta != null) {
    //     const liter = (Math.PI * Math.pow(48, 2) * currentValue.delta) / 1000;
    //     notNull++;
    //     return acc + liter;
    //   }
    //   return acc;
    // }, 0);

    // monthlyData.monthly.mean = notNull ? sumLiters / notNull : 0;
    // monthlyData.monthly.totalLiterUsed = sumLiters;

    // array for storing average per Hour by liter
    const historyLiter: any = [
      {
        date: new Date(new Date().setHours(0, 0, 0, 0)),
        liter: 0,
      },
    ];

    // the logic to count average per Hour by liter
    const historyLiterFunc = filteredDataMonthly.toReversed().map((item) => {
      if (item.delta == null) {
        return;
      }

      // init variable for checking if the current hour in the loop exist
      let firstHour = 0;

      // get hour in the current item.date loop
      const hourData = new Date(item.date).getHours();
      if (hourData != firstHour) {
        firstHour = hourData; // change the first loop if the current loop hour is not present in the array
      }

      if (
        historyLiter.some((item) => item.date.getHours() == hourData) == false
      ) {
        const object = {
          date: new Date(new Date().setHours(firstHour, 0, 0, 0)),
          liter: 0,
        };

        historyLiter.push(object);
      }

      historyLiter[firstHour].liter +=
        (Math.PI * Math.pow(48, 2) * item.delta) / 1000;
    });

    // Daily capacity? currently counting average PER MINUTES
    const sumLiters = historyLiter.reduce((acc, currentValue) => {
      return acc + currentValue.liter;
    }, 0);

    monthlyData.monthly.mean = sumLiters / 24;
    monthlyData.monthly.totalLiterUsed = sumLiters;

    // const historyPrice: any = [
    //   {
    //     date: new Date(new Date().setHours(0, 0, 0, 0)),
    //     price: 0,
    //   },
    // ];

    // const historyPriceFunc = filteredDataMonthly.toReversed().map((item) => {
    //   let firstHour = 0;
    //   const hourData = new Date(item.date).getHours();
    //   if (hourData != firstHour) {
    //     firstHour = hourData;
    //   }

    //   if (
    //     historyPrice.some((item) => item.date.getHours() == hourData) == false
    //   ) {
    //     const object = {
    //       date: new Date(new Date().setHours(firstHour, 0, 0, 0)),
    //       price: 0,
    //     };

    //     historyPrice.push(object);
    //   }

    //   historyPrice[firstHour].price +=
    //     ((Math.PI * Math.pow(48, 2) * item.distance) / 10) * 0.14;
    // });

    monthlyData.monthly.historyLiter = historyLiter;
    // monthlyData.monthly.historyPrice = historyPrice;

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
