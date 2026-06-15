from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def tieredExit(c):
    if len(c) < 25:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    ef = []
    es = []
    k9 = 2 / 10
    k21 = 2 / 22
    p9 = closes[0]
    p21 = closes[0]
    for i in range(0, len(closes)):
        p9 = (closes[0] if i == 0 else closes[i] * k9 + p9 * (1 - k9))
        p21 = (closes[0] if i == 0 else closes[i] * k21 + p21 * (1 - k21))
        ef.append(p9)
        es.append(p21)
    i = len(c) - 1
    cur = c[i]
    if ef[i] > es[i]  and  ef[i - 1] <= es[i - 1]:
        sl = cur['close'] * 0.75
        r = cur['close'] - sl
        # tiered: +50% / +150% / +300%
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] * 1.5, cur['close'] * 2.5, cur['close'] * 4], confidence=0.7, reason="EMA cross momentum (kademeli TP: +50/+150/+300%)")
    return make_signal(reason="No momentum entry")
