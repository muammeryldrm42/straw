from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def fvg(c):
    if len(c) < 205:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    a = atr(c, 14)
    e = ema(closes, 200)
    price = closes[len(closes) - 1]
    trend = ("up" if price > e[len(e) - 1] else "down")
    for i in range(len(c) - 2, (2)-1, -1):
        ai = a[i]
        if math.isnan(ai):
            continue
        # bullish
        if c[i - 2]['high'] < c[i]['low']  and  c[i]['low'] - c[i - 2]['high'] >= ai * 0.3:
            mid = (c[i]['low'] + c[i - 2]['high']) / 2
            if trend == "up"  and  price > c[i - 2]['high']  and  price < c[i]['low']:
                sl = c[i - 2]['high'] - 0.5 * a[len(a) - 1]
                r = mid - sl
                return make_signal(signal="long", entry=mid, stop_loss=sl, take_profit=[mid + r * 2, mid + r * 3, mid + r * 5], confidence=0.75, reason=f"Bullish FVG mitigation @ {mid}")
        # bearish
        if c[i - 2]['low'] > c[i]['high']  and  c[i - 2]['low'] - c[i]['high'] >= ai * 0.3:
            mid = (c[i - 2]['low'] + c[i]['high']) / 2
            if trend == "down"  and  price < c[i - 2]['low']  and  price > c[i]['high']:
                sl = c[i - 2]['low'] + 0.5 * a[len(a) - 1]
                r = sl - mid
                return make_signal(signal="short", entry=mid, stop_loss=sl, take_profit=[mid - r * 2, mid - r * 3, mid - r * 5], confidence=0.75, reason=f"Bearish FVG mitigation @ {mid}")
    return make_signal(reason="No active FVG entry")
