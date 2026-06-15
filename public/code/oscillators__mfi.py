from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mfi(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    p = 14
    tp = [(x['high'] + x['low'] + x['close']) / 3 for x in c]
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    def calc(end):
        pos = 0
        neg = 0
        for k in range(end - p + 1, (end)+1):
            mf = tp[k] * c[k]['volume']
            if tp[k] > tp[k - 1]:
                pos += mf
            else:
                neg += mf
        return (100 if neg == 0 else 100 - 100 / (1 + pos / neg))
    now = calc(i)
    prev = calc(i - 1)
    if prev < 20  and  now >= 20:
        sl = cur['low'] - 1.5 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.73, reason=f"MFI exit oversold ({now})")
    if prev > 80  and  now <= 80:
        sl = cur['high'] + 1.5 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.73, reason=f"MFI exit overbought ({now})")
    return make_signal(reason=f"MFI {now}")
