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
def multiTimeframe(c):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    htf = ema(closes, 50)
    ltf = ema(closes, 12)
    i = len(c) - 1
    a = atr(c, 14)
    htfUp = htf[i] > htf[i - 3]
    htfDn = htf[i] < htf[i - 3]
    ltfCrossUp = closes[i - 1] <= ltf[i - 1]  and  closes[i] > ltf[i]
    ltfCrossDn = closes[i - 1] >= ltf[i - 1]  and  closes[i] < ltf[i]
    if htfUp  and  ltfCrossUp:
        return mkH(c, i, "long", a, 0.73, "HTF uptrend + LTF pullback entry")
    if htfDn  and  ltfCrossDn:
        return mkH(c, i, "short", a, 0.73, "HTF downtrend + LTF bounce entry")
    return make_signal(reason="Timeframes not aligned")
