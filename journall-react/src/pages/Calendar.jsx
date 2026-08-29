/**
 * Legacy source: index.html lines 3898-3945 (calendar section), citing
 * calendarSummary, calendarGrid, calendarKpis, calendarMonths, month/year nav controls.
 */

import React, { useState, useEffect } from 'react';
import { useTradeStore } from '../store/useTradeStore';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month' or 'year'

  const trades = useTradeStore(state => state.trades);

  // Helper functions to replace date-fns
  const formatDate = (date, formatString) => {
    switch (formatString) {
      case 'MMMM yyyy':
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
      case 'd':
        return String(date.getDate());
      case 'MMM':
        return date.toLocaleString('default', { month: 'short' });
      case 'yyyy':
        return String(date.getFullYear());
      default:
        return date.toString();
    }
  };

  const startOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const endOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const eachDayOfInterval = ({ start, end }) => {
    const days = [];
    let current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }
    return days;
  };

  const isSameMonth = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
  };

  const isSameDay = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const addMonths = (date, amount) => {
    return new Date(date.getFullYear(), date.getMonth() + amount, date.getDate());
  };

  const subMonths = (date, amount) => {
    return addMonths(date, -amount);
  };

  const addYears = (date, amount) => {
    return new Date(date.getFullYear() + amount, date.getMonth(), date.getDate());
  };

  const subYears = (date, amount) => {
    return addYears(date, -amount);
  };

  const startOfYear = (date) => {
    return new Date(date.getFullYear(), 0, 1);
  };

  const endOfYear = (date) => {
    return new Date(date.getFullYear(), 11, 31);
  };

  const eachMonthOfInterval = ({ start, end }) => {
    const months = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (current <= endMonth) {
      months.push(new Date(current));
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return months;
  };

  const isSameYear = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear();
  };

  const getDailyPnL = (date) => {
    const dayTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      return isSameDay(tradeDate, date);
    });

    return dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  };

  const getDailyTradeCount = (date) => {
    return trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      return isSameDay(tradeDate, date);
    }).length;
  };

  const getMonthPnL = (month) => {
    const monthTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      return isSameMonth(tradeDate, month);
    });

    return monthTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  };

  const getMonthTradeCount = (month) => {
    return trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      return isSameMonth(tradeDate, month);
    }).length;
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const monthPnL = getMonthPnL(currentDate);
    const monthTradeCount = getMonthTradeCount(currentDate);

    return (
      <div className="calendar-premium-card">
        <div className="calendar-hero">
          <div>
            <div className="label">Trading Calendar</div>
            <h2>{formatDate(currentDate, 'MMMM yyyy')}</h2>
            <p className="calendar-sub">Monthly trade map with daily P&L, trade count, profit/loss/break-even dots, and performance summary. Full bar = $50 move.</p>
          </div>

          <div className="calendar-controls premium-controls">
            <button className="btn" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>&larr; Previous</button>
            <button className="btn primary" onClick={() => setCurrentDate(new Date())}>Current Month</button>
            <button className="btn" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>Next &rarr;</button>
          </div>
        </div>

        <div className="calendar-summary">
          <div className="summary-item">
            <div className="summary-label">Month P&L</div>
            <div className={`summary-value ${monthPnL > 0 ? 'profit' : monthPnL < 0 ? 'loss' : 'neutral'}`}>${Math.abs(monthPnL).toFixed(2)}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Trades</div>
            <div className="summary-value">{monthTradeCount}</div>
          </div>
        </div>

        <div className="calendar-legend">
          <span><i className="legend-dot profit-bg"></i> Profit day</span>
          <span><i className="legend-dot loss-bg"></i> Loss day</span>
          <span><i className="legend-dot neutral-bg"></i> Breakeven / no result</span>
        </div>

        <div className="calendar-grid">
          {days.map(day => {
            const dailyPnL = getDailyPnL(day);
            const tradeCount = getDailyTradeCount(day);
            const dayClass = dailyPnL > 0 ? 'profit' : dailyPnL < 0 ? 'loss' : 'neutral';

            return (
              <div key={day.toString()} className={`calendar-day ${dayClass}`}>
                <div className="day-number">{formatDate(day, 'd')}</div>
                {tradeCount > 0 && (
                  <div className="day-trades">
                    <div className="trade-count">{tradeCount}</div>
                    <div className="pnl-bar" style={{ height: `${Math.min(Math.abs(dailyPnL) / 50 * 100, 100)}%` }}></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    return (
      <div className="calendar-shell">
        <div className="calendar-topbar">
          <div className="calendar-year-heading">
            <div className="label">Trading Year</div>
            <h2>{formatDate(currentDate, 'yyyy')}</h2>
          </div>
          <div className="calendar-year-nav">
            <button className="btn" onClick={() => setCurrentDate(subYears(currentDate, 1))}>&larr;</button>
            <button className="btn primary" onClick={() => setCurrentDate(new Date())}>Current Year</button>
            <button className="btn" onClick={() => setCurrentDate(addYears(currentDate, 1))}>&rarr;</button>
          </div>
        </div>

        <div className="calendar-kpi-grid">
          {months.map(month => {
            const monthPnL = getMonthPnL(month);
            const monthTradeCount = getMonthTradeCount(month);
            const monthClass = monthPnL > 0 ? 'profit' : monthPnL < 0 ? 'loss' : 'neutral';

            return (
              <div key={month.toString()} className={`month-kpi ${monthClass}`}>
                <div className="month-name">{formatDate(month, 'MMM')}</div>
                <div className="month-pnl">${Math.abs(monthPnL).toFixed(2)}</div>
                <div className="month-trades">{monthTradeCount} trades</div>
              </div>
            );
          })}
        </div>

        <div className="calendar-month-grid">
          {months.map(month => {
            const monthPnL = getMonthPnL(month);
            const monthTradeCount = getMonthTradeCount(month);
            const monthClass = monthPnL > 0 ? 'profit' : monthPnL < 0 ? 'loss' : 'neutral';

            return (
              <div key={month.toString()} className={`month-cell ${monthClass}`}>
                <div className="month-name">{formatDate(month, 'MMM')}</div>
                <div className="month-pnl">${Math.abs(monthPnL).toFixed(2)}</div>
                <div className="month-trades">{monthTradeCount} trades</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="section">
      <div className="view-toggle">
        <button className={`btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
        <button className={`btn ${view === 'year' ? 'active' : ''}`} onClick={() => setView('year')}>Year</button>
      </div>
      {view === 'month' ? renderMonthView() : renderYearView()}
    </div>
  );
};

export default Calendar;