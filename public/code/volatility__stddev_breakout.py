from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def stdDevBreakout(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    p = 20
    closes = [x['close'] for x in c]
    def stdAt(end):
        win = closes[end - p + 1: end + 1]
        m = sum(b for b in win) / p
        return math.sqrt(sum((v - m) ** 2 for v in win) / p)
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    sNow = stdAt(i)
    sAvg = (stdAt(i - 1) + stdAt(i - 2) + stdAt(i - 3)) / 3
    # Volatilite patlaması + yön
    if sNow > sAvg * 1.5:
        if cur['close'] > cur['open']  and  cur['close'] > c[i - 1]['close']:
            sl = cur['low'] - 1.5 * a[i]
            r = cur['close'] - sl
            return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.69, reason="Std-dev volatility expansion (up)")
        if cur['close'] < cur['open']  and  cur['close'] < c[i - 1]['close']:
            sl = cur['high'] + 1.5 * a[i]
            r = sl - cur['close']
            return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.69, reason="Std-dev volatility expansion (down)")
    return make_signal(reason="No volatility expansion")
