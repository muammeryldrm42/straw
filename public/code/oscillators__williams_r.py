from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def williamsR(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    p = 14
    def wr(idx):
        win = c[idx - p + 1: idx + 1]
        hh = max([x['high'] for x in win])
        ll = min([x['low'] for x in win])
        return (-50 if hh == ll else ((hh - c[idx]['close']) / (hh - ll)) * -100)
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    now = wr(i)
    prev = wr(i - 1)
    if prev < -80  and  now > -80:
        sl = cur['low'] - 1.5 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.7, reason=f"Williams %R exit oversold ({now})")
    if prev > -20  and  now < -20:
        sl = cur['high'] + 1.5 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.7, reason=f"Williams %R exit overbought ({now})")
    return make_signal(reason=f"Williams %R {now}")
