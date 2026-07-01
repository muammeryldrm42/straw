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
def rollingVwap(c, end, p):
    pv = 0
    vol = 0
    tps = []
    wts = []
    for k in range(end - p + 1, (end)+1):
        tp = (c[k]['high'] + c[k]['low'] + c[k]['close']) / 3
        pv += tp * c[k]['volume']
        vol += c[k]['volume']
        tps.append(tp)
        wts.append(c[k]['volume'])
    vwap = (pv / vol if vol else c[end]['close'])
    # hacim ağırlıklı std
    varSum = 0
    for j in range(0, len(tps)):
        varSum += wts[j] * (tps[j] - vwap) ** 2
    sd = (math.sqrt(varSum / vol) if vol else 0)
    return {'vwap': vwap, 'sd': sd}
def anchoredVwap(c, end, span=50):
    anchor = end - span
    if anchor < 0:
        anchor = 0
    # span içindeki en düşük low'u anchor al
    lowIdx = anchor
    for k in range(anchor, (end)+1):
        if c[k]['low'] < c[lowIdx]['low']:
            lowIdx = k
    pv = 0
    vol = 0
    for k in range(lowIdx, (end)+1):
        tp = (c[k]['high'] + c[k]['low'] + c[k]['close']) / 3
        pv += tp * c[k]['volume']
        vol += c[k]['volume']
    return (pv / vol if vol else c[end]['close'])
def vwapVolumeConfirm(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    _d = rollingVwap(c, i, 30)
    vwap = _d['vwap']
    avgV = sum(x['volume'] for x in c[i - 20: i]) / 20
    if c[i]['close'] > vwap  and  c[i - 1]['close'] <= rollingVwap(c, i - 1, 30).vwap  and  c[i]['volume'] > avgV * 1.4:
        return mk(c, i, "long", a, 0.71, "VWAP reclaim on high volume")
    if c[i]['close'] < vwap  and  c[i - 1]['close'] >= rollingVwap(c, i - 1, 30).vwap  and  c[i]['volume'] > avgV * 1.4:
        return mk(c, i, "short", a, 0.71, "VWAP loss on high volume")
    return make_signal(reason="No volume-confirmed VWAP cross")
