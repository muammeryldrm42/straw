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
def flatKijun(c):
    if len(c) < 90:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    k = [ichi(c, i)['kijun'], ichi(c, i - 1)['kijun'], ichi(c, i - 2)['kijun'], ichi(c, i - 3)['kijun']]
    flat = max(k) - min(k) < a[i] * 0.3
    # düz kijun
    now = ichi(c, i)
    # Düz kijun mıknatıs gibi çeker — fiyat uzaktaysa kijun'a doğru
    if flat  and  c[i]['close'] < now['kijun'] - a[i]  and  c[i]['close'] > c[i]['open']:
        return mk(c, i, "long", a, 0.67, "Flat Kijun magnet pull up")
    if flat  and  c[i]['close'] > now['kijun'] + a[i]  and  c[i]['close'] < c[i]['open']:
        return mk(c, i, "short", a, 0.67, "Flat Kijun magnet pull down")
    return make_signal(reason="No flat-Kijun setup")
