declare module 'lunar-javascript' {
  interface LunarDate {
    getFestivals(): string[];
    getOtherFestivals(): string[];
    getJieQi(): string;
    getDayInChinese(): string;
    getMonthInChinese(): string;
    getYearInGanZhi(): string;
    getYearShengXiao(): string;
    getDayYi(sect?: number): string[];
    getDayJi(sect?: number): string[];
    getChongDesc(): string;
    getSha(): string;
    getZhiXing(): string;
    getXiu(): string;
    getXiuLuck(): string;
    getPengZuGan(): string;
    getPengZuZhi(): string;
  }

  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    getLunar(): LunarDate;
  }
}
