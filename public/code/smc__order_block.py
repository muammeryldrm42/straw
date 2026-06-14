from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def orderBlock(c):
    if len(c) < 210:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    a = atr(c, 14)
    e = ema(closes, 200)
    price = closes[len(closes) - 1]
    trend = ("up" if price > e[len(e) - 1] else "down")
    start = max(3, len(c) - 50)
    for i in range(len(c) - 2, (start)-1, -1):
        ai = a[i]
        if math.isnan(ai):
            continue
        cur = c[i]
        nx = c[i + 1]
        if cur['close'] < cur['open']  and  nx['high'] - cur['low'] >= ai * 1.5  and  nx['close'] > cur['high']:
            if trend == "up"  and  price <= cur['high']  and  price >= cur['low']:
                entry = (cur['high'] + cur['low']) / 2
                sl = cur['low'] - 0.5 * a[len(a) - 1]
                r = entry - sl
                return make_signal(signal="long", entry=entry, stop_loss=sl, take_profit=[entry + r * 2, entry + r * 3, entry + r * 5], confidence=0.78, reason="Bullish OB retest")
        if cur['close'] > cur['open']  and  cur['high'] - nx['low'] >= ai * 1.5  and  nx['close'] < cur['low']:
            if trend == "down"  and  price <= cur['high']  and  price >= cur['low']:
                entry = (cur['high'] + cur['low']) / 2
                sl = cur['high'] + 0.5 * a[len(a) - 1]
                r = sl - entry
                return make_signal(signal="short", entry=entry, stop_loss=sl, take_profit=[entry - r * 2, entry - r * 3, entry - r * 5], confidence=0.78, reason="Bearish OB retest")
    return make_signal(reason="Aktif OB retest yok")
