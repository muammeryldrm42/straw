from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def chochSignal(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    sh = swingHighs(c, 8)
    sl = swingLows(c, 8)
    highs = []
    lows = []
    [v != None  and  highs.append({'i': i, 'v': v}) for i, v in enumerate(sh)]
    [v != None  and  lows.append({'i': i, 'v': v}) for i, v in enumerate(sl)]
    if len(highs) < 3  or  len(lows) < 3:
        return make_signal(reason="Insufficient swings")
    a = atr(c, 14)
    cur = c[len(c) - 1]
    ai = len(a) - 1
    # Bearish ChoCH: önceden HH-HL trendi, şimdi son low önceki low'u kırdı
    lastL = lows[len(lows) - 1]
    prevL = lows[len(lows) - 2]
    prevPrevL = lows[len(lows) - 3]
    lastH = highs[len(highs) - 1]
    prevH = highs[len(highs) - 2]
    if prevPrevL.v < prevL.v  and  prevH.v < lastH.v  and  lastL.v < prevL.v:
        slv = lastH.v + 0.3 * a[ai]
        r = slv - cur['close']
        if r > 0:
            return make_signal(signal="short", entry=cur['close'], stop_loss=slv, take_profit=[cur['close'] - r * 2, cur['close'] - r * 3, cur['close'] - r * 5], confidence=0.79, reason="Bearish ChoCH: HH-HL broken")
    # Bullish ChoCH: LH-LL'den sonra son high önceki high'ı kırdı
    if prevPrevL.v > prevL.v  and  lastH.v > prevH.v  and  lastL.v > prevL.v:
        slv = lastL.v - 0.3 * a[ai]
        r = cur['close'] - slv
        if r > 0:
            return make_signal(signal="long", entry=cur['close'], stop_loss=slv, take_profit=[cur['close'] + r * 2, cur['close'] + r * 3, cur['close'] + r * 5], confidence=0.79, reason="Bullish ChoCH: LH-LL broken")
    return make_signal(reason="No ChoCH")
