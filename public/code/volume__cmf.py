from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def cmf(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    p = 20
    def calc(end):
        mfv = 0
        vol = 0
        for k in range(end - p + 1, (end)+1):
            rng = c[k]['high'] - c[k]['low']
            mfm = (0 if rng == 0 else ((c[k]['close'] - c[k]['low']) - (c[k]['high'] - c[k]['close'])) / rng)
            mfv += mfm * c[k]['volume']
            vol += c[k]['volume']
        return (0 if vol == 0 else mfv / vol)
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    now = calc(i)
    prev = calc(i - 1)
    if prev <= 0.05  and  now > 0.05:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.71, reason=f"CMF turned positive ({now})")
    if prev >= -0.05  and  now < -0.05:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.71, reason=f"CMF turned negative ({now})")
    return make_signal(reason=f"CMF {now}")
