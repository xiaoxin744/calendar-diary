import { Solar } from 'lunar-javascript';

export interface AlmanacInfo {
  lunarDate: string;
  yearName: string;
  festival: string | null;
  solarTerm: string | null;
  yi: string[];
  ji: string[];
  clash: string;
  sha: string;
  dayOfficer: string;
  mansion: string;
  mansionLuck: string;
  pengZu: string;
}

const getLunar = (date: Date) => Solar
  .fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
  .getLunar();

export const getLunarLabel = (date: Date): string => {
  const lunar = getLunar(date);
  const festival = lunar.getFestivals()[0] || lunar.getOtherFestivals()[0];
  if (festival) return festival;

  const solarTerm = lunar.getJieQi();
  if (solarTerm) return solarTerm;

  const day = lunar.getDayInChinese();
  return day === '初一' ? `${lunar.getMonthInChinese()}月` : day;
};

export const getAlmanac = (date: Date): AlmanacInfo => {
  const lunar = getLunar(date);
  const zodiac = lunar.getYearShengXiao();

  return {
    lunarDate: `${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    yearName: `${lunar.getYearInGanZhi()}${zodiac}年`,
    festival: lunar.getFestivals()[0] || lunar.getOtherFestivals()[0] || null,
    solarTerm: lunar.getJieQi() || null,
    yi: lunar.getDayYi(),
    ji: lunar.getDayJi(),
    clash: lunar.getChongDesc(),
    sha: lunar.getSha(),
    dayOfficer: lunar.getZhiXing(),
    mansion: lunar.getXiu(),
    mansionLuck: lunar.getXiuLuck(),
    pengZu: `${lunar.getPengZuGan()} ${lunar.getPengZuZhi()}`,
  };
};
