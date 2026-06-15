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
def hma(values, period):
    def wma(arr, p):
        out = []
        for i in range(0, len(arr)):
            if i < p - 1:
                out.append(arr[i])
                continue
            num = 0
            den = 0
            for k in range(0, p):
                w = p - k
                num += arr[i - k] * w
                den += w
            out.append(num / den)
        return out
    half = max(1, math.floor(period / 2))
    sqrtP = max(1, round(math.sqrt(period)))
    w1 = wma(values, half)
    w2 = wma(values, period)
    raw = [2 * v - w2[i] for i, v in enumerate(w1)]
    return wma(raw, sqrtP)
def keltner(c, p, mult):
    closes = [x['close'] for x in c]
    mid = ema(closes, p)
    a = atr(c, p)
    return {'mid': mid, 'upper': [v + mult * a[i] for i, v in enumerate(mid)], 'lower': [v - mult * a[i] for i, v in enumerate(mid)]}
def ttmSqueeze(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    bb = bollingerBands(closes, 20, 2)
    kc = keltner(c, 20, 1.5)
    a = atr(c, 14)
    i = len(c) - 1
    squeezeOn = lambda idx: bb['lower'][idx] > kc['lower'][idx]  and  bb['upper'][idx] < kc['upper'][idx]
    # Momentum: close - midpoint donchian/sma
    mom = [((0 if idx < 20 else v - (max([x['high'] for x in c[idx - 20: idx]]) + min([x['low'] for x in c[idx - 20: idx]]) + sma(closes, 20)[idx]) / 3)) for idx, v in enumerate(closes)]
    # Squeeze biraz önce vardı, şimdi bitti (fire) + momentum yönü
    if squeezeOn(i - 1)  and  not squeezeOn(i)  and  mom[i] > 0:
        return mk(c, i, "long", a, 0.74, "TTM Squeeze fired long (momentum up)")
    if squeezeOn(i - 1)  and  not squeezeOn(i)  and  mom[i] < 0:
        return mk(c, i, "short", a, 0.74, "TTM Squeeze fired short (momentum down)")
    return make_signal(reason=("Squeeze on (waiting for release)" if squeezeOn(i) else "No squeeze release"))
