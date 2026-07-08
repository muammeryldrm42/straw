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
def volumePrice(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    e = ema(closes, 20)
    i = len(c) - 1
    a = atr(c, 14)
    avgV = sum(x['volume'] for x in c[i - 20: i]) / 20
    cur = c[i]
    if cur['close'] > e[i]  and  cur['close'] > cur['open']  and  cur['volume'] > avgV * 1.5  and  cur['close'] > c[i - 1]['high']:
        return mkH(c, i, "long", a, 0.72, "Breakout candle + 1.5x volume + above EMA")
    if cur['close'] < e[i]  and  cur['close'] < cur['open']  and  cur['volume'] > avgV * 1.5  and  cur['close'] < c[i - 1]['low']:
        return mkH(c, i, "short", a, 0.72, "Breakdown candle + 1.5x volume + below EMA")
    return make_signal(reason="No volume+price confluence")
