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
def renkoDir(c, i, brick):
    last = c[max(0, i - 60)]['close']
    dir = 0
    prevDir = 0
    for k in range(max(1, i - 60), (i)+1):
        cl = c[k]['close']
        while cl >= last + brick:
            prevDir = dir
            dir = 1
            last += brick
        while cl <= last - brick:
            prevDir = dir
            dir = -1
            last -= brick
    return {'dir': dir, 'prevDir': prevDir}
def swma(v, i):
    return (v[i] if i < 3 else (v[i] + 2 * v[i - 1] + 2 * v[i - 2] + v[i - 3]) / 6)
def rviArr(c):
    num = []
    den = []
    for i in range(0, len(c)):
        num.append(swma([x['close'] - x['open'] for x in c], i))
        den.append(swma([x['high'] - x['low'] for x in c], i))
    def _map_rvi(n, i):
        d = den[i]
        return (n / d if d else 0)
    rvi = [_map_rvi(n, i) for i, n in enumerate(num)]
    sig = [swma(rvi, i) for i, _ in enumerate(rvi)]
    return {'rvi': rvi, 'sig': sig}
def bopArr(c):
    return [((x['close'] - x['open']) / (x['high'] - x['low']) if (x['high'] - x['low']) else 0) for x in c]
def mcginley(c, n=14):
    md = [c[0]['close']]
    for i in range(1, len(c)):
        prev = md[i - 1]
        ratio = (c[i]['close'] / prev if prev else 1)
        md.append(prev + (c[i]['close'] - prev) / max(1, n * (ratio) ** (4)))
    return md
def zlema(values, n):
    lag = math.floor((n - 1) / 2)
    adj = [v + (v - (values[i - lag]  or  v)) for i, v in enumerate(values)]
    return ema(adj, n)
def rci(c, i, n=9):
    if i < n:
        return 0
    win = [x['close'] for x in c[i - n + 1: i + 1]]
    priceRank = [[w for w in win if w > v].length + 1 for v in win]
    d2 = 0
    for k in range(0, n):
        timeRank = n - k
        d2 += (timeRank - priceRank[k]) ** 2
    return (1 - (6 * d2) / (n * (n * n - 1))) * 100
def zigzag(c, i, dev=0.03):
    # son swing yönü: %dev sapmayla pivot tespiti
    pivot = c[max(0, i - 50)]['close']
    dir = 0
    lastPivotIdx = max(0, i - 50)
    for k in range(lastPivotIdx + 1, (i)+1):
        ch = (c[k]['close'] - pivot) / pivot
        if dir >= 0  and  ch <= -dev:
            dir = -1
            pivot = c[k]['close']
            lastPivotIdx = k
        elif dir <= 0  and  ch >= dev:
            dir = 1
            pivot = c[k]['close']
            lastPivotIdx = k
        elif dir >= 0  and  c[k]['close'] > pivot:
            pivot = c[k]['close']
        elif dir <= 0  and  c[k]['close'] < pivot:
            pivot = c[k]['close']
    return {'dir': dir, 'lastPivotIdx': lastPivotIdx}
def renkoRvi(c):
    if len(c) < 70:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    _d = renkoDir(c, i, a[i])
    dir = _d['dir']
    _d = rviArr(c)
    rvi = _d['rvi']
    sig = _d['sig']
    if dir == 1  and  rvi[i] > sig[i]  and  rvi[i - 1] <= sig[i - 1]:
        return mk(c, i, "long", a, 0.73, "Renko green + RVI bullish cross")
    if dir == -1  and  rvi[i] < sig[i]  and  rvi[i - 1] >= sig[i - 1]:
        return mk(c, i, "short", a, 0.73, "Renko red + RVI bearish cross")
    return make_signal(reason="No Renko+RVI alignment")
