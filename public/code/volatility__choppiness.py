from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def choppiness(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    p = 14
    a = atr(c, 1)
    # 1-period TR
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    win = c[i - p + 1: i + 1]
    hh = max([x['high'] for x in win])
    ll = min([x['low'] for x in win])
    atrSum = sum(v for v in a[i - p + 1: i + 1])
    ci = (100 * Math.log10(atrSum / (hh - ll  or  1e-9))) / Math.log10(p)
    a14 = atr(c, 14)
    # CI < 38.2 = güçlü trend; yön için kırılım
    if ci < 38.2:
        if cur['close'] > hh * 0.999  and  cur['close'] > cur['open']:
            sl = cur['close'] - 2 * a14[i]
            r = cur['close'] - sl
            return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.7, reason=f"Low choppiness ({ci}) + breakout up")
        if cur['close'] < ll * 1.001  and  cur['close'] < cur['open']:
            sl = cur['close'] + 2 * a14[i]
            r = sl - cur['close']
            return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.7, reason=f"Low choppiness ({ci}) + breakdown")
    return make_signal(reason=f"Choppiness {ci} ({('ranging' if ci > 61.8 else 'neutral')})")
