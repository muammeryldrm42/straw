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
def lastTwoLows(c, end, lb=3, span=40):
    lows = []
    for k in range(end - 1, (max(2, end - span))-1, -1):
        isLow = True
        for j in range(1, (lb)+1):
            if c[k - j]['low'] < c[k]['low']  or  c[k + j]['low'] < c[k]['low']:
                isLow = False
                break
            if isLow:
                lows.append(k)
                if len(lows) == 2:
                    break
        return lows
    def lastTwoHighs(c, end, lb=3, span=40):
        highs = []
        for k in range(end - 1, (max(2, end - span))-1, -1):
            isHigh = True
            for j in range(1, (lb)+1):
                if c[k - j]['high'] > c[k]['high']  or  c[k + j]['high'] > c[k]['high']:
                    isHigh = False
                    break
                if isHigh:
                    highs.append(k)
                    if len(highs) == 2:
                        break
            return highs
        def detectDiv(c, osc, i, a, name, conf, hidden=false):
            lows = lastTwoLows(c, i)
            highs = lastTwoHighs(c, i)
            if len(lows) == 2:
                [l1, l2] = lows
                # l1 daha yeni
                if not hidden  and  c[l1]['low'] < c[l2]['low']  and  osc[l1] > osc[l2]:
                    return mk(c, i, "long", a, conf, f"Bullish {name} divergence (price LL, {name} HL)")
                if hidden  and  c[l1]['low'] > c[l2]['low']  and  osc[l1] < osc[l2]:
                    return mk(c, i, "long", a, conf, f"Hidden bullish {name} divergence")
            if len(highs) == 2:
                [h1, h2] = highs
                if not hidden  and  c[h1]['high'] > c[h2]['high']  and  osc[h1] < osc[h2]:
                    return mk(c, i, "short", a, conf, f"Bearish {name} divergence (price HH, {name} LH)")
                if hidden  and  c[h1]['high'] < c[h2]['high']  and  osc[h1] > osc[h2]:
                    return mk(c, i, "short", a, conf, f"Hidden bearish {name} divergence")
            return make_signal(reason=f"No {name} divergence")
        def obvArr(c):
            o = [0]
            for k in range(1, len(c)):
                o.append(o[k - 1] + ((c[k]['volume'] if c[k]['close'] > c[k - 1]['close'] else (-c[k]['volume'] if c[k]['close'] < c[k - 1]['close'] else 0))))
            return o
        def cciArr(c, p=20):
            tp = [(x['high'] + x['low'] + x['close']) / 3 for x in c]
            m = sma(tp, p)
            out = []
            for i in range(0, len(c)):
                if i < p - 1:
                    out.append(0)
                    continue
                win = tp[i - p + 1: i + 1]
                md = sum(abs(v - m[i]) for v in win) / p
                out.append(((tp[i] - m[i]) / (0.015 * md) if md else 0))
            return out
        def mfiArr(c, p=14):
            out = []
            for i in range(0, len(c)):
                if i < p:
                    out.append(50)
                    continue
                pos = 0
                neg = 0
                for k in range(i - p + 1, (i)+1):
                    tp = (c[k]['high'] + c[k]['low'] + c[k]['close']) / 3
                    tpPrev = (c[k - 1]['high'] + c[k - 1]['low'] + c[k - 1]['close']) / 3
                    rmf = tp * c[k]['volume']
                    if tp > tpPrev:
                        pos += rmf
                    else:
                        neg += rmf
                out.append((100 if neg == 0 else 100 - 100 / (1 + pos / neg)))
            return out
        def stochArr(c, p=14):
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
        def aoArr(c):
            mp = [(x['high'] + x['low']) / 2 for x in c]
            f = sma(mp, 5)
            s = sma(mp, 34)
            return [v - s[i] for i, v in enumerate(f)]
        def rsiDivergence(c):
            if len(c) < 50:
                return make_signal(reason="Insufficient data")
            return detectDiv(c, rsi([x['close'] for x in c], 14), len(c) - 1, atr(c, 14), "RSI", 0.72)
