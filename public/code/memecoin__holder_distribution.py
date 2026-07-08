from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


# Strategy Lab - Holder Distribution Analysis
def checkSignal(data, cfg={}):
    maxTop1 = cfg.max_top1_pct  or  8
    maxTop10 = cfg.max_top10_pct  or  40
    maxDev = cfg.max_dev_insider_pct  or  15
    minHold = cfg.min_holders  or  100
    dangerT1 = cfg.danger_top1_pct  or  20
    dangerT10 = cfg.danger_top10_pct  or  75
    _d = data
    symbol = _d['symbol']
    price = _d['price_usd']
    holders = _d['holder_count']
    top1 = _d['top1_pct']
    top10 = _d['top10_pct']
    devInsider = _d['dev_insider_pct']
    growth = _d['holder_growth_24h_pct']
    if holders <= 0  or  price <= 0:
        return make_signal("neutral", price, 0, [], 0, "No holder data")
    # Tehlikeli konsantrasyon -> SHORT
    if top1 > dangerT1  or  top10 > dangerT10:
        return make_signal("short", price, price * 1.3, [price * 0.7, price * 0.5, price * 0.3], 0.7, f"DANGER concentration: top1={top1}% top10={top10}%", { symbol })
    # Skorlama
    reasons = []
    score = 0
    maxScore = 5
    if top1 <= maxTop1:
        score += 1
    else:
        reasons.append(f"top1 {top1}%")
    if top10 <= maxTop10:
        score += 1
    else:
        reasons.append(f"top10 {top10}%")
    if devInsider <= maxDev:
        score += 1
    else:
        reasons.append(f"dev/insider {devInsider}%")
    if holders >= minHold:
        score += 1
    else:
        reasons.append(f"holders {holders}")
    if growth > 5:
        score += 1
    else:
        reasons.append(f"growth {growth}%")
    if score >= 4:
        conf = 0.5 + (score - 4) * 0.1
        if top1 < 5:
            conf += 0.1
        if holders > 500:
            conf += 0.1
        conf = min(conf, 0.9)
        return make_signal("long", price, price * 0.7, [price * 1.5, price * 2.5, price * 4.0], conf, f"Healthy dist ({score}/{maxScore}): top1={top1}% top10={top10}% holders={holders}", {'symbol': symbol, 'score': score})
    return make_signal("neutral", price, 0, [], 0, f"Weak dist ({score}/{maxScore}): {reasons.join(', ')}", {'symbol': symbol, 'score': score})
