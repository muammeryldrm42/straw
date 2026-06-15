from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def premiumDiscount(c):
    if len(c) < 80:
        return make_signal(reason="Insufficient data")
    rng = c[-50:]
    rH = max([x['high'] for x in rng])
    rL = min([x['low'] for x in rng])
    mid = (rH + rL) / 2
    cur = c[len(c) - 1]
    a = atr(c, 14)
    ai = len(a) - 1
    pct = (cur['close'] - rL) / (rH - rL)
    # 0..1
    # Discount zone (0-0.5): long
    if pct < 0.3  and  cur['close'] > cur['open']:
        slv = rL - 0.3 * a[ai]
        r = cur['close'] - slv
        return make_signal(signal="long", entry=cur['close'], stop_loss=slv, take_profit=[mid, mid + (rH - mid) * 0.5, rH], confidence=0.74, reason=f"Discount zone @ {(pct*100)}%")
    # Premium zone (0.7-1): short
    if pct > 0.7  and  cur['close'] < cur['open']:
        slv = rH + 0.3 * a[ai]
        r = slv - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=slv, take_profit=[mid, mid - (mid - rL) * 0.5, rL], confidence=0.74, reason=f"Premium zone @ {(pct*100)}%")
    return make_signal(reason=f"Equilibrium zone @ {(pct*100)}%")
