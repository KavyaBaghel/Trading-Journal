/**
 * Parity port of legacy index.html dashboard metrics.
 *
 * Citations from index.html:
 * - Line 5549: Equity calculation `const eq=[0,...srt.map(t=>+(cum+=t.pnl).toFixed(2))];`
 * - Line 5552-5554: Outcome grouping (wins, losses, flats)
 * - Line 5557: Win rate formula `((wins.length/filtered.length)*100).toFixed(1)`
 * - Line 5559-5561: Gross profit/loss and profit factor
 */

export function deriveAnalytics(trades) {
  if (!trades || !trades.length) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      totalPnl: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0
    };
  }

  const totalTrades = trades.length;

  // Parity with index.html:5552-5554 outcome helper logic
  const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = trades.filter(t => (t.pnl || 0) < 0);
  const breakEvenTrades = trades.filter(t => (t.pnl || 0) === 0);

  // Parity with index.html:5557
  const winRate = (winningTrades.length / totalTrades) * 100;

  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  // Parity with index.html:5559-5560
  const grossProfit = winningTrades.reduce((a, t) => a + (t.pnl || 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((a, t) => a + (t.pnl || 0), 0));

  // Parity with index.html:5564
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);

  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakEvenTrades: breakEvenTrades.length,
    winRate,
    totalPnl,
    grossProfit,
    grossLoss,
    profitFactor
  };
}
