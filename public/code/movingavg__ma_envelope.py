from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def hma(values, period):
    def wma(arr, p, end):
        if end < p - 1:
            return float('nan')
        num = 0
        den = 0
        for k in range(0, p):
            num += arr[end - k] * (p - k)
            den += (p - k)
        return num / den
    half = math.floor(period / 2)
    sq = math.floor(math.sqrt(period))
    raw = []
    for i in range(0, len(values)):
        w1 = wma(values, half, i)
        w2 = wma(values, period, i)
        raw.append((float('nan') if math.isnan(w1)  or  math.isnan(w2) else 2 * w1 - w2))
    out = []
    for i in range(0, len(raw)):
        if i < period + sq:
            out.append(float('nan'))
            continue
        num = 0
        den = 0
        for k in range(0, sq):
            v = raw[i - k]
            if not math.isnan(v):
                num += v * (sq - k)
                den += (sq - k)
        out.append((num / den if den else float('nan')))
    return out
def maEnvelope(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    mid = sma(closes, 20)
    a = atr(c, 14)
    pct = 0.025
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    upper = mid[i] * (1 + pct)
    lower = mid[i] * (1 - pct)
    # Alt zarftan dönüş = long
    if prev['low'] <= mid[i - 1] * (1 - pct)  and  cur['close'] > cur['open']  and  cur['close'] > prev['close']:
        sl = prev['low'] - 0.5 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[mid[i], upper], confidence=0.69, reason="MA envelope lower bounce")
    if prev['high'] >= mid[i - 1] * (1 + pct)  and  cur['close'] < cur['open']  and  cur['close'] < prev['close']:
        sl = prev['high'] + 0.5 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[mid[i], lower], confidence=0.69, reason="MA envelope upper rejection")
    return make_signal(reason="Inside MA envelope")
