from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mkH(c, i, side, a, conf, reason, m=2):
    cur = c[i]
    if side == "long":
        sl = cur['close'] - m * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=conf, reason=reason)
    sl = cur['close'] + m * a[i]
    r = sl - cur['close']
    return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=conf, reason=reason)
def stochK(c, p=14):
    out = []
    for i in range(0, len(c)):
        if i < p - 1:
            out.append(50)
            continue
        w = c[i - p + 1: i + 1]
        hh = max([x['high'] for x in w])
        ll = min([x['low'] for x in w])
        out.append((50 if hh == ll else ((c[i]['close'] - ll) / (hh - ll)) * 100))
    return sma(out, 3)
def stochMacd(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    k = stochK(c)
    m = macd(closes)
    i = len(c) - 1
    a = atr(c, 14)
    if k[i] < 25  and  m['histogram'][i] > m['histogram'][i - 1]:
        return mkH(c, i, "long", a, 0.72, "Stochastic oversold + MACD histogram rising")
    if k[i] > 75  and  m['histogram'][i] < m['histogram'][i - 1]:
        return mkH(c, i, "short", a, 0.72, "Stochastic overbought + MACD histogram falling")
    return make_signal(reason="No Stoch+MACD confluence")
