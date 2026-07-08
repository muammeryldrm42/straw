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
def dailyLevel(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    cur = c[i]
    # Önceki 24-mum bloğunun H/L = günlük seviye
    prevDay = c[i - 48: i - 24]
    pdh = max([x['high'] for x in prevDay])
    pdl = min([x['low'] for x in prevDay])
    if abs(cur['low'] - pdl) < a[i] * 0.6  and  cur['close'] > cur['open']:
        return mkA(c, i, "long", pdl - a[i] * 0.5, [cur['close'] + a[i] * 2, cur['close'] + a[i] * 4], 0.69, "Bounce off previous-day low (PDL)")
    if abs(cur['high'] - pdh) < a[i] * 0.6  and  cur['close'] < cur['open']:
        return mkA(c, i, "short", pdh + a[i] * 0.5, [cur['close'] - a[i] * 2, cur['close'] - a[i] * 4], 0.69, "Rejection at previous-day high (PDH)")
    return make_signal(reason="Not at daily level")
