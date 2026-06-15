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
def ichi(c, end):
    hh = lambda n: max([x['high'] for x in c[end - n + 1: end + 1]])
    ll = lambda n: min([x['low'] for x in c[end - n + 1: end + 1]])
    tenkan = (hh(9) + ll(9)) / 2
    kijun = (hh(26) + ll(26)) / 2
    spanA = (tenkan + kijun) / 2
    spanB = (hh(52) + ll(52)) / 2
    return {'tenkan': tenkan, 'kijun': kijun, 'spanA': spanA, 'spanB': spanB}
def cloud(c, i):
    past = ichi(c, i - 26)
    return {'top': max(past['spanA'], past['spanB']), 'bot': min(past['spanA'], past['spanB']), 'spanA': past['spanA'], 'spanB': past['spanB']}
def fullIchimoku(c):
    if len(c) < 90:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    now = ichi(c, i)
    cl = cloud(c, i)
    chikouOk = lambda dir: (c[i]['close'] > c[i - 26]['close'] if dir > 0 else c[i]['close'] < c[i - 26]['close'])
    score = 0
    score += (1 if now['tenkan'] > now['kijun'] else -1)
    score += (1 if c[i]['close'] > cl['top'] else ((-1 if c[i]['close'] < cl['bot'] else 0)))
    score += (1 if now['spanA'] > now['spanB'] else -1)
    score += (1 if c[i]['close'] > now['kijun'] else -1)
    score += (1 if chikouOk(1) else ((-1 if chikouOk(-1) else 0)))
    if score >= 4:
        return mk(c, i, "long", a, 0.73, f"Ichimoku full bullish confluence ({score}/5)")
    if score <= -4:
        return mk(c, i, "short", a, 0.73, f"Ichimoku full bearish confluence ({score}/5)")
    return make_signal(reason=f"Ichimoku score {score}")
