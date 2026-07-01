from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mk(c, i, side, a, conf, reason, slMult=2):
    cur = c[i]
    if side == "long":
        sl = cur['close'] - slMult * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=conf, reason=reason)
    sl = cur['close'] + slMult * a[i]
    r = sl - cur['close']
    return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=conf, reason=reason)
def stochKD(c, kP, smooth, dP):
    raw = []
    for i in range(0, len(c)):
        if i < kP - 1:
            raw.append(50)
            continue
        win = c[i - kP + 1: i + 1]
        hh = max([x['high'] for x in win])
        ll = min([x['low'] for x in win])
        raw.append((50 if hh == ll else ((c[i]['close'] - ll) / (hh - ll)) * 100))
    k = sma(raw, smooth)
    d = sma(k, dP)
    return {'k': k, 'd': d}
def macdLine(closes, f, s):
    ef = ema(closes, f)
    es = ema(closes, s)
    return [v - es[i] for i, v in enumerate(ef)]
def stochOf(arr, p):
    out = []
    for i in range(0, len(arr)):
        if i < p - 1:
            out.append(50)
            continue
        win = arr[i - p + 1: i + 1]
        mn = min(win)
        mx = max(win)
        out.append((50 if mx == mn else ((arr[i] - mn) / (mx - mn)) * 100))
    return out
def connorsRsi(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    r3 = rsi(closes, 3)
    # streak
    streak = [0]
    for i in range(1, len(closes)):
        if closes[i] > closes[i - 1]:
            streak.append((streak[i - 1] + 1 if streak[i - 1] > 0 else 1))
        elif closes[i] < closes[i - 1]:
            streak.append((streak[i - 1] - 1 if streak[i - 1] < 0 else -1))
        else:
            streak.append(0)
    rStreak = rsi(streak, 2)
    i = len(c) - 1
    a = atr(c, 14)
    crsi = (r3[i] + rStreak[i] + 50) / 3
    # simplified (percentrank≈50)
    if crsi < 20:
        return mk(c, i, "long", a, 0.72, f"Connors RSI oversold ({crsi})")
    if crsi > 80:
        return mk(c, i, "short", a, 0.72, f"Connors RSI overbought ({crsi})")
    return make_signal(reason=f"Connors RSI {crsi}")
