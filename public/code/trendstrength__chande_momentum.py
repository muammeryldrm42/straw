from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mk(c, i, side, a, conf, reason, m=2):
    cur = c[i]
    if side == "long":
        sl = cur['close'] - m * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=conf, reason=reason)
    sl = cur['close'] + m * a[i]
    r = sl - cur['close']
    return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=conf, reason=reason)
def aroonCalc(c, end, p):
    win = c[end - p: end + 1]
    hiIdx = 0
    loIdx = 0
    for k in range(0, len(win)):
        if win[k]['high'] >= win[hiIdx]['high']:
            hiIdx = k
        if win[k]['low'] <= win[loIdx]['low']:
            loIdx = k
    up = ((p - (p - hiIdx)) / p) * 100
    dn = ((p - (p - loIdx)) / p) * 100
    return {'up': up, 'dn': dn}
def chandeMomentum(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    p = 14
    i = len(c) - 1
    a = atr(c, 14)
    def calc(end):
        up = 0
        dn = 0
        for k in range(end - p + 1, (end)+1):
            d = closes[k] - closes[k - 1]
            if d > 0:
                up += d
            else:
                dn += -d
        return (0 if up + dn == 0 else (100 * (up - dn)) / (up + dn))
    now = calc(i)
    prev = calc(i - 1)
    if prev < -50  and  now >= -50:
        return mk(c, i, "long", a, 0.69, f"CMO exit oversold ({now})")
    if prev > 50  and  now <= 50:
        return mk(c, i, "short", a, 0.69, f"CMO exit overbought ({now})")
    return make_signal(reason=f"CMO {now}")
