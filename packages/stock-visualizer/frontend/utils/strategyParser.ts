import { CandleData, Signal, calculateSMA, calculateEMA, calculateRSI } from './stockData';

export interface ParsedStrategy {
  indicators: IndicatorConfig[];
  signals: Signal[];
  errors: string[];
}

export interface IndicatorConfig {
  type: 'sma' | 'ema' | 'rsi';
  period: number;
  values: (number | null)[];
  color: string;
}

interface StrategyContext {
  data: CandleData[];
  sma: Map<number, (number | null)[]>;
  ema: Map<number, (number | null)[]>;
  rsi: (number | null)[];
}

const INDICATOR_COLORS: Record<string, string> = {
  sma: '#00bcd4',
  ema: '#ff9800',
  rsi: '#9c27b0',
};

export function parseStrategy(code: string, data: CandleData[]): ParsedStrategy {
  const result: ParsedStrategy = {
    indicators: [],
    signals: [],
    errors: [],
  };

  const context: StrategyContext = {
    data,
    sma: new Map(),
    ema: new Map(),
    rsi: [],
  };

  const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));

  for (const line of lines) {
    try {
      parseLine(line.trim(), context, result);
    } catch (e) {
      result.errors.push(`Error parsing: ${line}`);
    }
  }

  return result;
}

function parseLine(line: string, context: StrategyContext, result: ParsedStrategy): void {
  // Parse indicator definitions: sma(20), ema(12), rsi(14)
  const indicatorMatch = line.match(/^(sma|ema|rsi)\s*\(\s*(\d+)\s*\)/i);
  if (indicatorMatch) {
    const type = indicatorMatch[1].toLowerCase() as 'sma' | 'ema' | 'rsi';
    const period = parseInt(indicatorMatch[2], 10);
    
    let values: (number | null)[];
    if (type === 'sma') {
      if (!context.sma.has(period)) {
        context.sma.set(period, calculateSMA(context.data, period));
      }
      values = context.sma.get(period)!;
    } else if (type === 'ema') {
      if (!context.ema.has(period)) {
        context.ema.set(period, calculateEMA(context.data, period));
      }
      values = context.ema.get(period)!;
    } else {
      if (context.rsi.length === 0) {
        context.rsi = calculateRSI(context.data, period);
      }
      values = context.rsi;
    }

    result.indicators.push({
      type,
      period,
      values,
      color: INDICATOR_COLORS[type],
    });
    return;
  }

  // Parse buy/sell conditions
  // buy when sma(10) crosses above sma(20)
  const crossMatch = line.match(/^(buy|sell)\s+when\s+(sma|ema)\s*\(\s*(\d+)\s*\)\s+crosses\s+(above|below)\s+(sma|ema)\s*\(\s*(\d+)\s*\)/i);
  if (crossMatch) {
    const action = crossMatch[1].toLowerCase() as 'buy' | 'sell';
    const ind1Type = crossMatch[2].toLowerCase() as 'sma' | 'ema';
    const ind1Period = parseInt(crossMatch[3], 10);
    const direction = crossMatch[4].toLowerCase();
    const ind2Type = crossMatch[5].toLowerCase() as 'sma' | 'ema';
    const ind2Period = parseInt(crossMatch[6], 10);

    const getIndicatorValues = (type: 'sma' | 'ema', period: number): (number | null)[] => {
      if (type === 'sma') {
        if (!context.sma.has(period)) {
          context.sma.set(period, calculateSMA(context.data, period));
        }
        return context.sma.get(period)!;
      } else {
        if (!context.ema.has(period)) {
          context.ema.set(period, calculateEMA(context.data, period));
        }
        return context.ema.get(period)!;
      }
    };

    const values1 = getIndicatorValues(ind1Type, ind1Period);
    const values2 = getIndicatorValues(ind2Type, ind2Period);

    for (let i = 1; i < context.data.length; i++) {
      const prev1 = values1[i - 1];
      const prev2 = values2[i - 1];
      const curr1 = values1[i];
      const curr2 = values2[i];

      if (prev1 === null || prev2 === null || curr1 === null || curr2 === null) continue;

      const crossedAbove = prev1 <= prev2 && curr1 > curr2;
      const crossedBelow = prev1 >= prev2 && curr1 < curr2;

      if ((direction === 'above' && crossedAbove) || (direction === 'below' && crossedBelow)) {
        result.signals.push({
          index: i,
          type: action,
          price: context.data[i].close,
        });
      }
    }
    return;
  }

  // Parse RSI conditions: buy when rsi < 30
  const rsiMatch = line.match(/^(buy|sell)\s+when\s+rsi\s*(<|>|<=|>=)\s*(\d+)/i);
  if (rsiMatch) {
    const action = rsiMatch[1].toLowerCase() as 'buy' | 'sell';
    const operator = rsiMatch[2];
    const threshold = parseInt(rsiMatch[3], 10);

    if (context.rsi.length === 0) {
      context.rsi = calculateRSI(context.data, 14);
    }

    for (let i = 1; i < context.data.length; i++) {
      const prevRsi = context.rsi[i - 1];
      const currRsi = context.rsi[i];
      if (prevRsi === null || currRsi === null) continue;

      let triggered = false;
      let prevTriggered = false;

      switch (operator) {
        case '<':
          triggered = currRsi < threshold;
          prevTriggered = prevRsi < threshold;
          break;
        case '>':
          triggered = currRsi > threshold;
          prevTriggered = prevRsi > threshold;
          break;
        case '<=':
          triggered = currRsi <= threshold;
          prevTriggered = prevRsi <= threshold;
          break;
        case '>=':
          triggered = currRsi >= threshold;
          prevTriggered = prevRsi >= threshold;
          break;
      }

      // Only signal on transition
      if (triggered && !prevTriggered) {
        result.signals.push({
          index: i,
          type: action,
          price: context.data[i].close,
        });
      }
    }
    return;
  }

  // Parse price crossover: buy when close > sma(20)
  const priceMatch = line.match(/^(buy|sell)\s+when\s+(close|open|high|low)\s*(>|<|>=|<=)\s*(sma|ema)\s*\(\s*(\d+)\s*\)/i);
  if (priceMatch) {
    const action = priceMatch[1].toLowerCase() as 'buy' | 'sell';
    const priceType = priceMatch[2].toLowerCase() as 'close' | 'open' | 'high' | 'low';
    const operator = priceMatch[3];
    const indType = priceMatch[4].toLowerCase() as 'sma' | 'ema';
    const period = parseInt(priceMatch[5], 10);

    const getIndicatorValues = (type: 'sma' | 'ema', p: number): (number | null)[] => {
      if (type === 'sma') {
        if (!context.sma.has(p)) {
          context.sma.set(p, calculateSMA(context.data, p));
        }
        return context.sma.get(p)!;
      } else {
        if (!context.ema.has(p)) {
          context.ema.set(p, calculateEMA(context.data, p));
        }
        return context.ema.get(p)!;
      }
    };

    const indValues = getIndicatorValues(indType, period);

    for (let i = 1; i < context.data.length; i++) {
      const price = context.data[i][priceType];
      const prevPrice = context.data[i - 1][priceType];
      const indVal = indValues[i];
      const prevIndVal = indValues[i - 1];

      if (indVal === null || prevIndVal === null) continue;

      let triggered = false;
      let prevTriggered = false;

      switch (operator) {
        case '>':
          triggered = price > indVal;
          prevTriggered = prevPrice > prevIndVal;
          break;
        case '<':
          triggered = price < indVal;
          prevTriggered = prevPrice < prevIndVal;
          break;
        case '>=':
          triggered = price >= indVal;
          prevTriggered = prevPrice >= prevIndVal;
          break;
        case '<=':
          triggered = price <= indVal;
          prevTriggered = prevPrice <= prevIndVal;
          break;
      }

      if (triggered && !prevTriggered) {
        result.signals.push({
          index: i,
          type: action,
          price: context.data[i].close,
        });
      }
    }
  }
}

export const DEFAULT_STRATEGY = `// Stock Strategy Visualizer
// Define indicators to display
sma(20)
ema(12)

// Trading rules
buy when sma(12) crosses above sma(20)
sell when sma(12) crosses below sma(20)

// RSI signals
buy when rsi < 30
sell when rsi > 70`;
