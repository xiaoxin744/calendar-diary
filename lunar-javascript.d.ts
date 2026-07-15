declare module 'lunar-javascript' {
  interface LunarDate {
    getFestivals(): string[];
    getOtherFestivals(): string[];
    getJieQi(): string;
    getDayInChinese(): string;
    getMonthInChinese(): string;
    getYearInGanZhi(): string;
  }

  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    getLunar(): LunarDate;
  }
}
