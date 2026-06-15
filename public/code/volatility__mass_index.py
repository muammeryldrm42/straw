from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def massIndex(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    range = [x['high'] - x['low'] for x in c]
    ema9 = ema(range, 9)
    ema9of9 = ema(ema9, 9)
    ratio = [((v / ema9of9[i] if ema9of9[i] else 1)) for i, v in enumerate(ema9)]
    sumMI = lambda end: sum(b for b in ratio[end - 24: end + 1])
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    mi = sumMI(i)
    miPrev = sumMI(i - 1)
    ema9c = ema([x['close'] for x in c], 9)
    # Reversal bulge: MI 27 üstüne çıkıp 26.5 altına dönerse
    if miPrev >= 27  and  mi < 26.5:
        # yön EMA9 eğimiyle
        if ema9c[i] < ema9c[i - 3]:
            sl = cur['high'] + 1.5 * a[i]
            r = sl - cur['close']
            return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.68, reason="Mass Index reversal bulge (down)")
        sl = cur['low'] - 1.5 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.68, reason="Mass Index reversal bulge (up)")
    return make_signal(reason=f"Mass Index {mi}")
