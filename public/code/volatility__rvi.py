from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def rvi(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    p = 10
    closes = [x['close'] for x in c]
    std = []
    for k in range(0, len(closes)):
        if k < p:
            std.append(0)
            continue
        win = closes[k - p + 1: k + 1]
        m = sum(b for b in win) / p
        std.append(math.sqrt(sum((v - m) ** 2 for v in win) / p))
    up = [0]
    down = [0]
    for k in range(1, len(closes)):
        up.append((std[k] if closes[k] > closes[k - 1] else 0))
        down.append((std[k] if closes[k] < closes[k - 1] else 0))
    upEma = ema(up, 14)
    downEma = ema(down, 14)
    rviCalc = lambda idx: ((50 if upEma[idx] + downEma[idx] == 0 else (100 * upEma[idx]) / (upEma[idx] + downEma[idx])))
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    now = rviCalc(i)
    prev = rviCalc(i - 1)
    if prev < 50  and  now >= 50:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.68, reason=f"RVI crossed above 50 ({now})")
    if prev > 50  and  now <= 50:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.68, reason=f"RVI crossed below 50 ({now})")
    return make_signal(reason=f"RVI {now}")
