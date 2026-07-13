import React, { useEffect, useState } from 'react';
import { format } from '../utils/dateUtils';
import { DayData } from '../types';
import { X } from 'lucide-react';

interface DayPreviewProps {
  date: Date;
  data?: DayData;
  onClose: () => void;
}

export const DayPreview: React.FC<DayPreviewProps> = ({ date, data, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const events = data?.events || [];
  const stickers = data?.stickers || [];

  const maxHeight = Math.floor(window.innerHeight * 0.7);

  return (
    <div
      className="bg-white w-[700px] max-w-[90vw] rounded-xl shadow-xl overflow-hidden flex flex-col transition-all duration-200 ease-out"
      style={{
        maxHeight,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        opacity: isVisible ? 1 : 0
      }}
    >
      <div className="bg-[#ececec] px-4 py-2 border-b border-[#dcdcdc] flex justify-between items-center select-none">
        <div>
          <h3 className="font-serif font-bold text-lg text-ink-black">{format(date, 'yyyy/MM/dd')}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 transition-colors"
          aria-label="关闭预览"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 overflow-y-auto overflow-x-hidden flex-1">
        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="text-xs text-stone-400">暂无内容</p>
          ) : (
            events.map((event, index) => (
              <div key={event.id} className="flex items-start gap-2 text-sm leading-relaxed text-stone-700 min-w-0">
                <span className="text-stone-400 font-mono text-xs shrink-0 pt-0.5">{index + 1}.</span>
                <span className="shrink-0 text-base pt-0.5">{event.emoji}</span>
                <div className="flex-1 whitespace-pre-wrap break-words min-w-0">{event.summary || event.rawText}</div>
              </div>
            ))
          )}
        </div>

        {stickers.length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] font-bold text-stone-500 uppercase mb-1">贴纸</div>
            <div className="flex flex-wrap gap-1">
              {stickers.map((s, i) => (
                <span key={i} className="text-xl">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
