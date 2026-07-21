import React, { useMemo } from 'react';
import { getAlmanac } from '../utils/dateUtils';

interface AlmanacPanelProps {
  date: Date;
}

export const AlmanacPanel: React.FC<AlmanacPanelProps> = ({ date }) => {
  const almanac = useMemo(() => getAlmanac(date), [date]);
  const observances = [almanac.festival, almanac.solarTerm].filter((item): item is string => Boolean(item));

  return (
    <section className="rounded-md border border-stone-200 bg-[#fdfcf9] p-3" aria-label="今日黄历">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-stone-800">今日黄历</h3>
          <p className="mt-0.5 text-[11px] text-stone-500">农历 {almanac.lunarDate}</p>
        </div>
        <span className="shrink-0 text-xs font-bold text-ink-red">{almanac.yearName}</span>
      </div>

      {observances.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {observances.map((item) => (
            <span key={item} className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-ink-red">{item}</span>
          ))}
        </div>
      )}

      <div className="mt-2 grid grid-cols-3 gap-2 border-y border-stone-200 py-2">
        <div>
          <div className="text-[10px] text-stone-400">值日</div>
          <div className="mt-0.5 text-xs font-semibold text-stone-700">{almanac.dayOfficer}日</div>
        </div>
        <div>
          <div className="text-[10px] text-stone-400">星宿</div>
          <div className="mt-0.5 text-xs font-semibold text-stone-700">{almanac.mansion}宿 · {almanac.mansionLuck}</div>
        </div>
        <div>
          <div className="text-[10px] text-stone-400">冲煞</div>
          <div className="mt-0.5 break-words text-xs font-semibold text-stone-700">冲{almanac.clash} · 煞{almanac.sha}</div>
        </div>
      </div>

      <div className="mt-2.5 flex items-start gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-50 text-xs font-bold text-emerald-700">宜</span>
        <p className="min-w-0 flex-1 text-xs leading-5 text-stone-600">{almanac.yi.join(' · ') || '诸事不宜'}</p>
      </div>
      <div className="mt-2 flex items-start gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-red-50 text-xs font-bold text-ink-red">忌</span>
        <p className="min-w-0 flex-1 text-xs leading-5 text-stone-600">{almanac.ji.join(' · ') || '诸事不忌'}</p>
      </div>

      <p className="mt-2.5 border-t border-stone-200 pt-2 text-[10px] leading-4 text-stone-400">彭祖百忌&nbsp;&nbsp;{almanac.pengZu}</p>
    </section>
  );
};
