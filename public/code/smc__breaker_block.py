from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def breakerBlock(c):
    if len(c) < 220:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    a = atr(c, 14)
    e = ema(closes, 200)
    cur = c[len(c) - 1]
    price = cur['close']
    trend = ("up" if price > e[len(e) - 1] else "down")
    start = max(3, len(c) - 80)
    for i in range(start, len(c) - 3):
        ai = a[i]
        if math.isnan(ai):
            continue
        cc = c[i]
        nx = c[i + 1]
        # bullish OB
        if cc['close'] < cc['open']  and  nx['high'] - cc['low'] >= ai * 1.2  and  nx['close'] > cc['high']:
            post = c[i + 2:]
            if any(x['close'] < cc['low'] for x in post)  and  cur['high'] >= cc['low']  and  cur['low'] <= cc['high']  and  trend == "down":
                entry = (cc['high'] + cc['low']) / 2
                slv = cc['high'] + 0.5 * a[len(a) - 1]
                r = slv - entry
                return make_signal(signal="short", entry=entry, stop_loss=slv, take_profit=[entry - r * 2, entry - r * 3, entry - r * 5], confidence=0.74, reason="Bearish breaker")
        if cc['close'] > cc['open']  and  cc['high'] - nx['low'] >= ai * 1.2  and  nx['close'] < cc['low']:
            post = c[i + 2:]
            if any(x['close'] > cc['high'] for x in post)  and  cur['high'] >= cc['low']  and  cur['low'] <= cc['high']  and  trend == "up":
                entry = (cc['high'] + cc['low']) / 2
                slv = cc['low'] - 0.5 * a[len(a) - 1]
                r = entry - slv
                return make_signal(signal="long", entry=entry, stop_loss=slv, take_profit=[entry + r * 2, entry + r * 3, entry + r * 5], confidence=0.74, reason="Bullish breaker")
    return make_signal(reason="Breaker kurulumu yok")
