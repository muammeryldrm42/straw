from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def darvasBox(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    lookback = 40
    recent = c[-lookback:]
    boxTop = max([x['high'] for x in recent])
    topIdx = next((_i for _i, x in enumerate(recent) if x['high'] == boxTop), -1)
    # Kutu, top yapıldıktan sonraki mumlardan oluşur
    afterTop = recent[topIdx + 1:]
    if len(afterTop) < 4:
        return make_signal(reason="Box not formed (top too recent)")
    boxBottom = min([x['low'] for x in afterTop])
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    a = atr(c, 14)
    vols = [x['volume'] for x in c]
    avgV = sma(vols, 20)[i]
    # Kutu yüksekliği makul (çok geniş değil)
    if boxTop - boxBottom > a[i] * 8:
        return make_signal(reason="Box too wide")
    # Kutu üstü kırılım = long
    if cur['close'] > boxTop  and  prev['close'] <= boxTop  and  cur['volume'] > avgV * 1.3:
        sl = boxBottom
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1, cur['close'] + r * 2, cur['close'] + r * 3], confidence=0.74, reason="Darvas box breakout UP + volume")
    # Kutu altı kırılım = short
    if cur['close'] < boxBottom  and  prev['close'] >= boxBottom  and  cur['volume'] > avgV * 1.3:
        sl = boxTop
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1, cur['close'] - r * 2, cur['close'] - r * 3], confidence=0.7, reason="Darvas box breakdown DOWN + volume")
    return make_signal(reason="Price inside Darvas box")
