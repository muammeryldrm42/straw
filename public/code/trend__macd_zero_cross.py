from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def macdZeroCross(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    m = macd(closes, 12, 26, 9)
    e200 = ema(closes,(math.floor(len(c) / 2) if 200 > len(c) else 200))
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    # MACD line önceki mumda <0, şimdi >0 = bullish zero cross
    bullCross = m['macd'][i - 1] <= 0  and  m['macd'][i] > 0
    bearCross = m['macd'][i - 1] >= 0  and  m['macd'][i] < 0
    if bullCross  and  cur['close'] > e200[i]:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.74, reason="MACD zero-line cross UP + above EMA200")
    if bearCross  and  cur['close'] < e200[i]:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.74, reason="MACD zero-line cross DOWN + below EMA200")
    return make_signal(reason="No MACD zero-line cross")
