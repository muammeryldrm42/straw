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
def kijunBounce(c):
    if len(c) < 90:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    now = ichi(c, i)
    cl = cloud(c, i)
    # Yükseliş trendinde (bulut üstü) kijun'a geri çekilip dönüş = long
    if c[i]['close'] > cl['top']  and  c[i]['low'] <= now['kijun']  and  c[i]['close'] > c[i]['open']  and  c[i]['close'] > now['kijun']:
        return mk(c, i, "long", a, 0.7, "Bounce off Kijun in uptrend")
    if c[i]['close'] < cl['bot']  and  c[i]['high'] >= now['kijun']  and  c[i]['close'] < c[i]['open']  and  c[i]['close'] < now['kijun']:
        return mk(c, i, "short", a, 0.7, "Rejection at Kijun in downtrend")
    return make_signal(reason="No Kijun reaction")
