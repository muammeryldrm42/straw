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
def supplyZone(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    # Konsolidasyon sonrası güçlü düşüş = supply zone
    for k in range(i - 3, (i - 14  and  k >= 2)-1, -1):
        drop = c[k + 1]['close'] - c[k]['close']
        if drop < -a[i] * 1.5:
            top = max(c[k]['high'], c[k - 1]['high'])
            bot = min(c[k]['open'], c[k]['close'])
            if c[i]['high'] >= bot  and  c[i]['high'] <= top  and  c[i]['close'] < c[i]['open']:
                return mkA(c, i, "short", top + a[i] * 0.5, [c[i]['close'] - (top - bot) * 2, c[i]['close'] - (top - bot) * 4], 0.71, "Supply zone retest rejection")
    return make_signal(reason="No supply zone retest")
