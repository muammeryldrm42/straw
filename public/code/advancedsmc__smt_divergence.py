from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mkA(c, i, side, slPrice, tps, conf, reason):
    cur = c[i]
    if side == "long"  and  cur['close'] - slPrice <= 0:
        return make_signal(reason="Invalid risk")
    if side == "short"  and  slPrice - cur['close'] <= 0:
        return make_signal(reason="Invalid risk")
    return make_signal(signal=side, entry=cur['close'], stop_loss=slPrice, take_profit=tps, confidence=conf, reason=reason)
def smtDivergence(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    closes = [x['close'] for x in c]
    # momentum proxy
    mom = [((v - closes[k - 10] if k >= 10 else 0)) for k, v in enumerate(closes)]
    win = c[i - 20: i + 1]
    lowestIdx = min(range(len(win)), key=lambda _i: win[_i]['low'])
    highestIdx = max(range(len(win)), key=lambda _i: win[_i]['high'])
    # Fiyat yeni dip ama momentum daha yüksek dip = bullish div
    if lowestIdx == len(win) - 1  and  mom[i] > mom[i - 10]:
        return mkA(c, i, "long", c[i]['low'] - a[i], [c[i]['close'] + a[i] * 2, c[i]['close'] + a[i] * 4], 0.7, "Bullish SMT divergence (price low, momentum higher)")
    if highestIdx == len(win) - 1  and  mom[i] < mom[i - 10]:
        return mkA(c, i, "short", c[i]['high'] + a[i], [c[i]['close'] - a[i] * 2, c[i]['close'] - a[i] * 4], 0.7, "Bearish SMT divergence (price high, momentum lower)")
    return make_signal(reason="No SMT divergence")
