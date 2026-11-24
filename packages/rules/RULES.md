# Business rules

Lists edit karo: `config/business-rules.json` **aur** same values `src/default-rules.ts` me sync rakho (bundled defaults).

## Store

| Field | Matlab |
|---|---|
| `total_business` | Product rows pe rules laga ke sum |
| `turnover` | Site ka neeche wala **Total** row (sum me add mat karna) |

## Rules

1. **Ignore** → New + Renewal = `0`  
   Abhi: `180 DAYS 7%`, `DDS 90DAYS NEW`

2. **Half products** → New + Renewal = `50%`  
   Abhi: `MIP` (sab), `12XFD WSC 10.00%`, `XFD 12M 9.75 NEW`

3. **Saari Renewal** → `50%` (ignore pe `0`)

4. Baaki products ka **New** → `100%`

5. Site footer **Total** → sirf `turnover`, `total_business` me nahi

## Formula

```text
turnover = site "Total" row

for each product (Total row skip):
  ignore  → 0
  else:
    new = personalNew + groupNew
    renewal = personalRenewal + groupRenewal
    if half product: new *= 0.5
    renewal *= 0.5
    total_business += new + renewal
```

Match = name me text include (`MIP` = koi bhi MIP product).
