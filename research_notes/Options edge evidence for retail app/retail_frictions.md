# Practical Trading Frictions for Retail Options Traders (Bid-Ask Spreads, Price Improvement, Fees, Vol Markups)

Notes compiled October 2026. Convention used below (from Bryzgalova, Pavlova & Sikorskaya 2023): **quoted spread** = (ask - bid) / midpoint; **effective spread** = 2 x |trade price - midpoint| / midpoint. A marketable order pays roughly *half* the effective spread one way, so a round trip (open + close, both marketable) costs roughly *one full* effective spread as a share of premium.

Source-quality legend: [PRIMARY] = read in the paper's own text; [ABSTRACT] = verified from journal/working-paper abstract only; [SECONDARY] = from a press or blog summary of the paper, not verified against the paper.

---

## 1. Typical quoted and effective spreads as a share of mid (index/ETF vs single-stock; moneyness; expiry)

### Takeaway
Retail-sized trades in US equity and ETF options face quoted spreads averaging about **13.7% of mid** and effective spreads of about **6.7%** (Nov 2019 to Jun 2021). ETF options cost about half as much as single-stock options (8.4% quoted / 4.4% effective, versus 14.9% / 7.2%). Costs rise steeply for OTM strikes (about 29% quoted for slightly OTM, more than 50% for deep OTM) and for small-ticket trades (23.5% quoted on trades under $250). Weekly options average 12.6% quoted and 6.6% effective. SPX 0DTE effective spreads for retail were about 5-6% (2021-2023).

### Cited Findings

**Bryzgalova, Pavlova & Sikorskaya (BPS), JF 2023, Table I [PRIMARY]**

These figures are frequency-weighted averages for retail ("SLIM", single-leg price-improvement-auction) trades in OPRA/LiveVol data covering all trades on 16 US exchanges in ETF and equity options. Index options such as SPX are excluded. The sample runs Nov 4, 2019 to Jun 30, 2021. — [BPS, JF 2023, DOI 10.1111/jofi.13285](https://doi.org/10.1111/jofi.13285); [LBS open-access copy](https://lbsresearch.london.edu/id/eprint/2827)

- All retail (SLIM) trades: quoted 13.7%, effective 6.7%. All non-SLIM trades: quoted 11.6%, effective 8.6%. — [BPS 2023](https://doi.org/10.1111/jofi.13285)
- **ETF vs single-stock.** ETF options: SLIM quoted 8.4%, effective 4.4%; non-SLIM 8.9% / 6.7%. Non-ETF (single-stock) options: SLIM quoted 14.9%, effective 7.2%; non-SLIM 12.2% / 9.0%. ETFs are 27.0% of SLIM volume. — [BPS 2023](https://doi.org/10.1111/jofi.13285)
- **Time to expiry, SLIM quoted / effective (non-SLIM in brackets):**
  - Under 1 week: 12.6% / 6.6% [13.3 / 10.1]
  - 1-2 weeks: 12.4 / 6.0 [10.0 / 7.2]
  - 2-4 weeks: 15.2 / 7.1 [11.2 / 7.5]
  - 1-3 months: 14.0 / 6.2 [9.8 / 6.6]
  - 3-12 months: 18.5 / 7.8 [10.2 / 7.9]
  - Over 1 year: 17.7 / 9.3 [12.7 / 11.8]

  49.9% of SLIM volume is in options with under one week to expiry, versus 41.5% for non-SLIM. — [BPS 2023](https://doi.org/10.1111/jofi.13285)
- **Moneyness, SLIM quoted / effective (non-SLIM in brackets).** Buckets are as labelled in BPS. Moneyness for calls is (Mid - Strike)/Strike, with the sign reversed for puts.
  - Deep OTM "below -2": 54.1% / 28.4% [47.6 / 32.2]
  - "-2 to -1": 50.8 / 25.5 [44.2 / 27.4]
  - Slightly OTM "-1 to -0.1": **28.7 / 13.9** [21.3 / 15.0]
  - **ATM: 8.7 / 4.2** [8.4 / 6.2]
  - ITM "0.1 to 1": 8.6 / 4.8 [5.9 / 7.0]
  - "1 to 2": 9.0 / 7.6
  - "Above 2": 16.8 / 11.5

  Retail trades are 71.6% ATM and 24.0% slightly OTM by volume. — [BPS 2023](https://doi.org/10.1111/jofi.13285)
- **Trade size in dollars, SLIM quoted / effective.** Spreads fall sharply as ticket size grows:
  - Under $250: **23.5% / 11.6%** (41.6% of retail trades)
  - $250-500: 8.7 / 3.8
  - $500-1,000: 7.4 / 3.1
  - $1,000-2,500: 6.2 / 2.6
  - $2,500-5,000: 5.2 / 2.1
  - $5,000-10,000: 4.5 / 1.9
  - Above $20,000: effective spread exceeds quoted (6.7-11.9%), which reflects price impact on institutional-size trades.

  — [BPS 2023](https://doi.org/10.1111/jofi.13285)
- Calls vs puts (SLIM): calls 13.5% / 6.6%, puts 14.0% / 6.9%. Calls are 69.4% of retail volume. — [BPS 2023](https://doi.org/10.1111/jofi.13285)
- Weekly ATM options favoured by retail often carry implied leverage of 58-72x. — [BPS 2023, fn. 19](https://doi.org/10.1111/jofi.13285)
- Muravyev & Pearson (2020) report that the average quoted spread on options of S&P 500 stocks is "as high as 17.2%". BPS compare this with 3.55 bps for S&P 500 stocks themselves, citing Hagstromer 2021. — [BPS 2023, fn. 6](https://doi.org/10.1111/jofi.13285)

**Muravyev & Pearson, "Options Trading Costs Are Lower than You Think", RFS 33(11):4973-5014, 2020 [PRIMARY for the 2015 WP; ABSTRACT for the published version]**

The working-paper sample is 37 stocks and 2 ETFs including QQQ, April 2003 to October 2006, 20.4 million trades. This is before the penny tick pilot.
- Quoted spread averages 8.1 cents per share. Conventional effective spread is 6.2 cents. The average option price is $1.70. Underlying stock spreads average 1.4 cents. — [MP 2015 WP](https://c.mql5.com/forextsd/forum/209/Option%20Trading%20Costs%20Are%20Lower%20than%20You%20Think.pdf) (third-party mirror of the working paper)
- An investor trading at random times pays about **8.4 cents round trip, about 5% of the average option price**. The average quoted spread at the time of trade is 6.6 cents and the effective spread 6.4 cents; more than 80% of trades execute at the bid or ask. — [MP 2015 WP](https://c.mql5.com/forextsd/forum/209/Option%20Trading%20Costs%20Are%20Lower%20than%20You%20Think.pdf)
- **Moneyness, in dollars:** OTM quoted spread is under 7 cents and ITM about 11 cents. The timing-adjusted effective spread is much flatter, at 4 to 6 cents. — [MP 2015 WP](https://c.mql5.com/forextsd/forum/209/Option%20Trading%20Costs%20Are%20Lower%20than%20You%20Think.pdf). (Dollar spreads rise with moneyness, but *percentage* spreads are highest for OTM options because premiums are small. See BPS and Christoffersen et al.)

**Christoffersen, Goyenko, Jacobs & Karoui, "Illiquidity Premia in the Equity Options Market", RFS 2018 [SECONDARY for spread levels]**
- Sample: S&P 500 constituents with traded options, 1996-2007 (341 firms). The average quoted spread relative to mid is **34% for short-term OTM calls versus 23% for long-term OTM calls**. Liquidity ranks ITM > ATM > OTM, and short-dated contracts are less liquid than long-dated regardless of moneyness. — [CXO Advisory summary of the 2011 WP](https://www.cxoadvisory.com/?p=13300); [CREATES WP](https://repec.econ.au.dk/repec/creates/rp/11/rp11_43.pdf); [RFS record (CBS)](https://research.cbs.dk/en/publications/illiquidity-premia-in-the-equity-options-market-2/)

**SPX 0DTE: Beckmeyer, Branger & Gayda, "Retail Traders Love 0DTE Options... But Should They?" (SSRN 4404704, 2023) [SECONDARY]**
- Cboe SPX trade data with trader-type codes; the 0DTE analysis covers Jan 2021 to Feb 2023. Retail **effective spreads are 6.1% for calls and 4.9% for puts, versus 13.1% and 10.1% for non-retail**. Spreads widen as expiry approaches, yet retail keeps trading with under one hour left. About 75% of retail SPX trades are 0DTE, and 72.2% of retail orders are for a single contract. — [WealthManagement.com summary](https://www.wealthmanagement.com/equities/retail-investors-are-in-love-with-same-day-options); [SSRN 4404704](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4404704)
- A vendor study of NDX daily options (not peer-reviewed) finds expiring ITM options carry spreads at the close more than double the full-sample average. Assuming 25% slippage of the mid-to-bid spread, it estimates about 300-350 bps per year in transaction costs for a daily NDX program. — [Volos Software](https://volossoftware.com/insights/improving-0dte-trading-returns). Low weight: vendor research.

### Inferences
- **Round-trip costs (two marketable orders, one effective spread):**
  - Typical ATM retail trade: about 4-7% of premium
  - Weekly single-stock option: about 6.6%
  - Slightly OTM option: about 14%
  - Ticket under $250: about 12%
  - Paying the full quoted spread each way roughly doubles these, for example about 13% for weeklies and about 29% for slightly OTM.
- **ETF/index products are the cheapest venue.** ETF options (SPY, QQQ and others are in BPS's ETF bucket) cost about 40% less than single-stock options in BPS (4.4% vs 7.2% effective).
- **Mid and small caps likely cost more.** BPS documents that retail favours larger companies and that option spreads co-move with underlying spreads (BPS Table II regressions). Mid/small-cap single-stock options very likely sit above the 7.2% single-stock average, but I found no direct published breakdown (see Gaps).
- **The 2003-2006 Muravyev-Pearson figures (5% round trip) predate penny-increment quoting.** The 2019-2021 BPS percentages are the better benchmark for current retail costs.

### Gaps
- I could not find a peer-reviewed or exchange-published 2024-2026 breakdown of SPY, QQQ or SPX quoted spreads as a percent of mid by moneyness and expiry. BPS excludes index options; SPY and QQQ sit inside the ETF bucket and are not broken out. Cboe/OPRA quote data, ORATS or similar vendor data would be needed for current product-level numbers.
- I found no published study that splits option spreads by market-cap tier (large vs mid vs small). Christoffersen et al. cover S&P 500 names only.
- I could not access the published RFS version of Muravyev & Pearson (2020) tables, which use a later sample. Only the 17.2% figure, via BPS, and the abstract claims are verified.
- Dim, Eraker & Vilkov's 0DTE paper and Vilkov's "0DTE Trading Rules" were not retrieved. No verified SPX 0DTE quoted-spread-by-moneyness figures.

---

## 2. Effective vs quoted spreads: price improvement, PFOF and wholesalers

### Takeaway
Retail marketable orders routed through wholesaler price-improvement auctions pay about **half the quoted spread** (6.7% effective vs 13.7% quoted). Sophisticated, timing-aware traders pay much less still. But the wholesaler/PFOF structure leaves measurable money on the table: about **1% of premium worse fills** when the market maker pays PFOF, an estimated **more than $7bn of extra cost** over 26 months.

### Cited Findings
- **Scale and concentration.** Retail trading recently reached over 60% of total options market volume, facilitated by PFOF from wholesalers. Nearly 90% of options PFOF comes from three wholesalers (as of Q2 2021). — [BPS 2023 abstract](https://doi.org/10.1111/jofi.13285)
- **Price improvement shrinks the effective cost.** Weekly options: 12.6% quoted vs 6.6% effective. BPS read this as "these orders did indeed receive price improvement", but the effective spread is still "orders of magnitude higher than that in equities". — [BPS 2023](https://doi.org/10.1111/jofi.13285)
- **Wholesaler auction economics.** On most exchanges, a wholesaler-affiliated market maker pays $0.05 per contract to execute its paired order in a price-improvement auction. A competing market maker must pay $0.50 to break it up, and in that case the wholesaler receives a net $0.30 rebate. — [BPS 2023, fn. 15](https://doi.org/10.1111/jofi.13285)
- **Total options PFOF in the BPS sample (Nov 2019 to Jun 2021) was about $2.8bn.** — [BPS 2023, fn. 38](https://doi.org/10.1111/jofi.13285)
- **Timing-aware traders (Muravyev & Pearson):**
  - Published RFS abstract: effective spreads for traders who time executions are less than 40% of conventional measures, and the overall average effective spread is about one-quarter smaller than conventional estimates. — [MP 2020 RFS via RePEc](https://ideas.repec.org/a/oup/rfinst/v33y2020i11p4973-5014..html)
  - 2015 working paper: timed trades pay about 1.3 cents/share, 21% of the 6.2-cent conventional effective spread and 16% of the 8.1-cent quoted spread. At least 40% of trades were timed, rising to 54% in the last sample month. "Retail and other investors who are not able to time executions... their costs will equal the conventionally measured effective spreads." — [MP 2015 WP](https://c.mql5.com/forextsd/forum/209/Option%20Trading%20Costs%20Are%20Lower%20than%20You%20Think.pdf)
- **Ernst & Spatt, "Payment for Order Flow and Asset Choice", NBER WP 29883 (2022) [PRIMARY]:**
  - Typical PFOF is about **40 cents per options contract** (per 100 shares), versus about 20 cents per 100 shares of stock.
  - $1,000 placed in a $5 option generates about 80 cents of PFOF, about **10x** the PFOF from $1,000 placed in a $25 stock.
  - Ernst & Spatt document $3.2bn of options PFOF from Jan 2020 to Jul 2021.

  — [Ernst & Spatt, NBER w29883](https://www.nber.org/papers/w29883)
- **Ernst & Spatt on PFOF-paying market makers:**
  - Comparing execution when the exchange's Designated Market Maker pays PFOF versus when it does not, a $2 option gets a fill **2 cents/share (100 bps) worse**, while the broker collects only 0.4 cents/share in PFOF.
  - Applied to $770bn of price-improvement-mechanism trades over 26 months, a 1% worse price implies **more than $7bn** in added retail cost, versus $2-3bn of total options PFOF.

  — [Ernst & Spatt WP PDF](https://www.nber.org/system/files/working_papers/w29883/revisions/w29883.rev0.pdf)
- **Size of the improvement itself.** The median retail option order gets 5 cents of price improvement, about **3% of the trade price**; most get 0-10 cents. About 5-10% of trades go through an automated improvement mechanism, and price-improvement-mechanism trades received more than $2.4bn of improvement versus OPRA NBBO. Exchange rules such as PHLX's auto-match and the 40% allocation guarantee give the internalizing market maker a first-mover advantage. — [Ernst & Spatt WP](https://www.nber.org/system/files/working_papers/w29883/revisions/w29883.rev0.pdf)
- **0DTE SPX:** retail effective spreads are roughly half of non-retail (6.1% vs 13.1% for calls; 4.9% vs 10.1% for puts). — [WealthManagement.com summary of Beckmeyer et al.](https://www.wealthmanagement.com/equities/retail-investors-are-in-love-with-same-day-options)

### Inferences
- **Effective spread ≈ 50% of quoted** is a reasonable planning assumption for retail marketable orders routed via PFOF brokers (BPS: 6.7/13.7; weekly 6.6/12.6; ETF 4.4/8.4). Even after improvement, one-way cost on weekly single-stock options is about 3.3% of premium.
- **Patient limit orders can do better.** A systematic strategy that works limit orders at or near mid, or times entries, can plausibly get closer to the Muravyev-Pearson "timed" cost (about 20-40% of conventional effective spread). This is not demonstrated for retail specifically.
- **The PFOF-paying routing structure itself costs money.** Ernst & Spatt estimate about 1% of premium per trade; this is not visible on a $0-commission statement.

### Gaps
- No verified post-2022 study of retail option price improvement (2023-2026), nor of Rule 605 options execution statistics. Rule 605 historically does not cover options.
- Ernst & Spatt appears as an NBER WP (2022 revision). I did not verify whether a journal-published version exists or changed its estimates.

---

## 3. Aggregate retail option losses and how much is spreads vs timing/vol overpayment

### Takeaway
Retail options traders lose money in aggregate, and **transaction costs are the dominant component**:
- BPS: about $2.1bn of losses over 20 months against $6.4bn of indirect spread costs (about 7x the roughly $0.9bn in commissions).
- Beckmeyer et al.: about 60% of 0DTE losses are due to transaction costs.
- de Silva et al.: 5-14% losses around earnings, driven by overpaying for vol, wide spreads and holding too long.

Losses concentrate in **long, short-dated (weekly/0DTE) options**; retail option *sellers* roughly broke even or profited.

### Cited Findings
- **BPS aggregate losses.** At a 10-day holding horizon, retail lost **$2.10bn on options trades from Nov 2019 to Jun 2021**. Losses are concentrated in buy trades, ATM contracts, calls, and contracts with under one week to expiry. The worst months were Jan 2021 (-$672m), Feb 2021 (-$358m) and Dec 2020 (-$321m). The 100 most WallStreetBets-mentioned names account for more than 50% of losses. — [BPS 2023](https://doi.org/10.1111/jofi.13285)
- **BPS cost decomposition.** "The bulk of the losses comes from the indirect costs of trading."
  - Aggregate indirect costs (effective half-spread x size over all SLIM trades) are **about $6.4bn**.
  - Direct commission costs are about **$887m**, estimated at $0.65/contract on the 75% of volume not at Robinhood.
  - Indirect costs are "almost seven times" direct costs.

  — [BPS 2023](https://doi.org/10.1111/jofi.13285)
- **BPS buyer vs seller split.** The buy portfolio loses on average *even gross* of costs, consistent with theta. The sell portfolio is positive gross and positive net, but not statistically different from zero except intraday. BPS infer "two distinct groups": buyers of weeklies who lose and sellers who "earn a premium most of the time." Per dollar traded with no leverage, retail loses 28-40 cents per $100 traded; the under-one-week portfolio loses significantly at all horizons. — [BPS 2023](https://doi.org/10.1111/jofi.13285)
- **Beckmeyer, Branger & Gayda (SPX 0DTE, Jan 2021 to Feb 2023) [SECONDARY]:**
  - Retail lost more than $70m in total: an average of $184k/day over the full sample, and **$358k/day after daily expirations began on May 16, 2022**.
  - **About 60% of daily losses are due to transaction costs.** About 60% come from 0DTE puts.
  - Long positions lose 53% of value on average (61% after May 2022); short positions return 48% (56%).

  — [WealthManagement.com](https://www.wealthmanagement.com/equities/retail-investors-are-in-love-with-same-day-options); [BNN Bloomberg](https://www.bnnbloomberg.ca/day-traders-lose-358-000-per-day-gambling-on-zero-day-options-1.1910634); [SSRN 4404704](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4404704)

  A later review cites about $125m aggregate and about $350k/day since weekday expiries, which suggests an updated draft. — [Neudata review](https://neudata.co/literature-reviews/zero-day-to-expiry-options-a-losing-bet-for-retail-traders)
- **de Silva, So & Smith, "Losing is Optional", Review of Finance 30(2):489-535, 2026 (online Oct 24, 2025), DOI 10.1093/rof/rfaf052 [ABSTRACT]:**
  - Retail investors concentrate option *purchases* before earnings announcements with high expected announcement volatility (EAV).
  - They lose through three channels: (i) overpaying relative to realized volatility, (ii) "enormous" bid-ask spreads, and (iii) failing to close positions until weeks after announcements, despite volatility subsiding quickly.
  - Average retail losses are **5-9%, rising to 10-14% around high-EAV announcements**. Market makers are the primary beneficiaries.

  — [Review of Finance (OUP)](https://academic.oup.com/rof/article/30/2/489/8301159); [SSRN 4050165](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4050165)
- **de Silva et al., secondary detail:** the average option bid-ask spread in their sample is about **20% of the option price** and widens ahead of high-EAV announcements. In the 10 days after an average high-EAV announcement, retail loses about $60,000, or **10% of investment, before transaction costs**. Total retail capital outflow over the sample is about $1.5bn. — [Quantpedia summary (2022 WP version)](https://quantpedia.com/how-retail-losses-money-in-option-trading/)
- **Ernst & Spatt** simulated portfolios from observed retail option trades held to maturity (more than 400,000 samples):
  - Option portfolios have **10x the standard deviation** of matched stock portfolios.
  - **Over half lose more than 90% of their value.**

  — [Ernst & Spatt WP](https://www.nber.org/system/files/working_papers/w29883/revisions/w29883.rev0.pdf)

### Inferences
- In BPS, indirect spread costs ($6.4bn) are about 3x the net loss ($2.1bn). This implies retail's *gross-of-spread* trading would have been profitable in aggregate, at least partly because option sellers earn the premium. Spreads, not just bad direction or timing, convert a near-zero-sum activity into a large loss.
- For long-option buyers specifically, losses exist even gross of costs (theta, overpaying for implied vol). Spreads compound an already negative gross edge.
- In 0DTE, roughly 60/40 split between transaction costs and other (timing/payoff) losses per Beckmeyer et al.
- The de Silva et al. "10% before transaction costs" figure suggests that around earnings, overpaying for vol and holding through the IV crush rival or exceed spread costs.

### Gaps
- I could not access de Silva et al.'s full text for the exact spread-vs-vol-overpayment decomposition, the sample period, or IV-RV numbers.
- Beckmeyer et al. figures are from press summaries. The paper's own tables, including the moneyness and time-of-day spread breakdown, were not verified.
- **Conflict on retail's 0DTE share:** a WealthManagement summary states retail exceeded "6%" of 0DTE activity, while search-result summaries attribute a 50-60% retail share of SPX 0DTE to Cboe. Neither was verified at the primary source.

---

## 4. Commissions and fees per contract at major retail brokers (2025-2026), plus exchange/regulatory fees

### Takeaway
Equity/ETF options commissions are either $0 (Robinhood, Webull) or about **$0.65/contract** (Fidelity, Schwab, E*Trade), plus small pass-through regulatory fees of about $0.02-0.05/contract. Index options (SPX/SPXW/NDX) carry **much higher** exchange proprietary fees, about $0.50-0.66 per contract, plus the broker's contract fee. On a $0.50 premium (that is, $50 per contract), $0.65 is 1.3% per side.

### Cited Findings
- **Robinhood (US help page, accessed Oct 2026) [PRIMARY]:**
  - $0 commission for stock and ETF options.
  - **Combined regulatory + OCC clearing fee of $0.04 per contract** since Jan 10, 2025. Robinhood calculates this from an average of what it remits and says it may differ from the actual fee.
  - **FINRA TAF on options sells: $0.00329/contract** (from Jan 1, 2026), capped at $9.79 per trade. The page notes the TAF is paused Oct 1 to Dec 31, 2026.
  - **SEC Section 31 fee: $20.60 per $1m of principal on sells** (from Apr 4, 2026), not charged on index options.
  - **Index options:** contract fee $0.50 ($0.35 with Gold). Exchange fees per contract on top:
    - SPX $0.57 (premium < $1) or $0.66 (≥ $1)
    - SPXW $0.50 or $0.59
    - XSP $0 for under 10 contracts, otherwise $0.07
    - NDX/NDXP $0.25-0.75
    - RUT $0.18
  - **Professional customer fee: $0.50/contract**, starting on or after Oct 15, 2026.

  — [Robinhood: Trading fees](https://robinhood.com/us/en/support/articles/trading-fees-on-robinhood)
- **Fidelity [PRIMARY]:** $0 commission plus **$0.65 per contract** on online options; $0 for buy-to-close orders priced at $0.65 or less. Professional Options Trader accounts pay an extra $0.50/contract. An Options Regulatory Fee applies to buys and sells (amount not stated). — [Fidelity commissions page](https://www.fidelity.com/trading/commissions-margin-rates)
- **Schwab and E*Trade [SECONDARY]:** about **$0.65/contract**. E*Trade's active-trader rate, reportedly $0.50 in one comparison table, is unverified. Webull: $0/contract, $0 exercise/assignment. Tastytrade: reportedly $1.00 to open, $0 to close, $10 cap per leg. — [StockBrokers.com Schwab vs Webull](https://www.stockbrokers.com/compare/charlesschwab-vs-webull); [StockBrokers.com E*TRADE vs Webull](https://www.stockbrokers.com/compare/etrade-vs-webull); [NerdWallet options brokers 2026](https://www.nerdwallet.com/blog/investing/best-online-brokers/best-brokers-online-options-trading-accounts/)
- **BPS (as of March 2022):** TD Ameritrade, Schwab, E*Trade and Fidelity all charged $0.65/contract. — [BPS 2023, fn. 37](https://doi.org/10.1111/jofi.13285)
- **Options Regulatory Fee (ORF) [filing-stage, from SEC/Cboe rule filings; not fully read]:**
  - Many exchanges moved on **July 1, 2026** to assessing ORF only on customer-range trades executed *on that exchange*.
  - Proposed per-contract-side rates: Cboe EDGX $0.00286; Cboe BZX $0.00476; MIAX $0.0170; Nasdaq NOM $0.0157 → $0.0200; Emerald $0.0220; BOX $0.0220.
  - Sources: [MIAX SR filing](https://www.sec.gov/files/rules/sro/miax/2026/34-105886.pdf); [BOX filing](https://www.sec.gov/files/rules/sro/box/2026/34-105876.pdf); [Nasdaq filing](https://www.sec.gov/files/rules/sro/nasdaq/2026/34-105690.pdf); [Emerald filing](https://www.sec.gov/files/rules/sro/emerald/2026/34-105892.pdf); [SR-CboeEDGX-2026-046](https://cdn.cboe.com/resources/regulation/rule_filings/approved/2026/SR-CboeEDGX-2026-046.pdf); [SR-CboeBZX-2026-056](https://cdn.cboe.com/resources/regulation/rule_filings/approved/2026/SR-CboeBZX-2026-056.pdf)

### Inferences
- **Commission as a share of premium.** Per contract per side, $0.65 is 0.38% of a $1.70 option ($170), 1.3% of a $0.50 option, and 3.25% of a $0.20 lottery-ticket option. For cheap short-dated OTM options, commissions at $0.65 brokers can rival the effective spread. At $0-commission brokers, the roughly $0.04 regulatory pass-through is negligible except on sub-$0.10 premiums.
- **SPX vs SPY/XSP.** One SPX contract is about 10x the notional of one SPY contract, so about $1 of per-contract fees on SPX is small relative to premium. Still, a retail app should model the index fee schedule explicitly, since XSP is $0 below 10 contracts at Robinhood.
- **Hidden costs dwarf visible ones.** BPS estimate indirect spread costs at about 7x commissions.

### Gaps
- **IBKR, Schwab and E*Trade official pages could not be fetched** (403, authorization error and timeout respectively). IBKR Pro fixed/tiered options rates for 2026 are unverified.
- The current OCC clearing fee per contract was not found as a standalone figure. Robinhood folds it into its $0.04 combined fee.
- The ORF rates above are from proposal filings and may have been amended.

---

## 5. Implied-volatility markup retail buyers pay vs realized volatility (earnings and 0DTE)

### Takeaway
Retail option buying is concentrated where implied volatility is richest: ahead of high-expected-volatility earnings. Retail overpays relative to subsequently realized vol and then holds through the post-announcement IV crush. Peer-reviewed estimates put losses at 10-14% around high-EAV announcements. In 0DTE SPX, a variance risk premium exists but is small and volatile, and transaction costs reportedly consume it.

### Cited Findings
- de Silva, So & Smith: retail "overpay for options relative to realized volatility". Expected announcement volatility is measured from the IV term structure across expiries. Post-announcement realized volatility is statistically indistinguishable between high- and low-EAV announcements, yet retail keeps positions open. Losses are 10-14% for high-EAV events. — [Review of Finance 2026](https://academic.oup.com/rof/article/30/2/489/8301159); [Quantpedia summary](https://quantpedia.com/how-retail-losses-money-in-option-trading/); [MIT Sloan coverage](https://mitsloan.mit.edu/ideas-made-to-matter/retail-investors-lose-big-options-markets-research-shows)
- **Vilkov, "0DTE Trading Rules" (SSRN 4641356)** [SECONDARY]: SPX options Sep 2016 to Jan 11, 2024; static daily hold-to-expiry rules. There is a variance risk premium in 0DTE, but return distributions are so wide and skewed that most strategies' average returns are statistically insignificant. Much of the P&L is driven by realized skewness. — [Hull Tactical review (Jul 2026)](https://hulltactical.com/2026/07/08/0dte-options-tiny-edge-huge-distribution/); [SSRN 4641356](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4641356)
- **2026 HKUST-hosted study of 0DTE options (2020-2024)** [SECONDARY, unverified]: transaction costs and estimation risk make the Sharpe ratios of volatility-arbitrage strategies economically insignificant. — [HKUST Business Insight, Apr 2026](https://bm.hkust.edu.hk/bizinsight/2026/04/are-0dte-options-mispriced)
- **BPS:** long-option retail trades lose even gross of costs, consistent with paying the theta and variance premium. Retail writers earn positive (insignificant) net returns. — [BPS 2023](https://doi.org/10.1111/jofi.13285)

### Inferences
- **For retail-app design:** buying options into earnings faces a structural IV markup plus wide pre-announcement spreads. The evidence suggests the default expectation is negative after costs, especially for high-EAV names. Holding after the announcement adds further losses.
- **The edge sits with sellers, but it is fragile.** The variance premium accrues to sellers, but in short-dated SPX it is small relative to spreads and fees. A short-premium strategy needs execution at or near mid to survive costs.

### Gaps
- No verified numeric IV-minus-RV markup (vol points) for retail-traded earnings options. De Silva et al.'s tables are paywalled.
- The Dim, Eraker & Vilkov 0DTE paper (VRP size, retail flows) was not retrieved. One blog claims an intraday 0DTE VRP of about 0.001% that transaction costs fully absorb, but I could not verify the source or authors, so it is excluded from findings.

---

## 6. Implications for the profitability of systematic retail option strategies

### Takeaway
Realistic retail execution costs of about 4-7% of premium per round trip at the ATM, 10-30% for OTM and short-dated contracts, and higher for small tickets are large relative to the documented gross edges of option strategies. Academic strategy returns can collapse or become insignificant once quoted spreads are applied. Viable systematic retail strategies need to (a) trade liquid ETF/index or large-cap ATM contracts, (b) use limit orders near mid rather than marketable orders, (c) avoid micro-sized OTM weeklies, and (d) generally be on the premium-selling side.

### Cited Findings
- Goyal & Saretto's (2009) long-short decile straddle returns fall from **22.7% to 3.9% per month** when options are assumed to trade at quoted spreads. The alpha in Driessen, Maenhout & Vilkov (2009) becomes insignificant at quoted bid/ask. Both are as cited by Muravyev & Pearson. — [MP 2015 WP](https://c.mql5.com/forextsd/forum/209/Option%20Trading%20Costs%20Are%20Lower%20than%20You%20Think.pdf)
- Muravyev & Pearson argue that low costs from execution timing "likely make profitable some trading strategies that would otherwise not be profitable". Retail traders who cannot time executions pay the full conventional effective spread. — [MP 2015 WP](https://c.mql5.com/forextsd/forum/209/Option%20Trading%20Costs%20Are%20Lower%20than%20You%20Think.pdf); [MP 2020 RFS abstract](https://ideas.repec.org/a/oup/rfinst/v33y2020i11p4973-5014..html)
- Christoffersen et al. find that illiquid equity options earn higher risk-adjusted returns than liquid ones, a premium compensating market makers for bearing illiquidity. The published version reports an illiquid-minus-liquid spread of 3.4%/day for ATM calls and 2.5%/day for ATM puts, while the working paper reports 23 bps/day (calls) and 13 bps/day (puts). The versions conflict, so cite carefully. — [CBS research record](https://research.cbs.dk/en/publications/illiquidity-premia-in-the-equity-options-market-2/); [CXO summary of WP](https://www.cxoadvisory.com/?p=13300)
- BPS: the retail sell portfolio is positive net of observed costs but not statistically significant (except intraday). The retail buy portfolio is negative even gross. — [BPS 2023](https://doi.org/10.1111/jofi.13285)
- Ernst & Spatt: about 1% of premium extra cost per trade when the executing DMM pays PFOF, on top of the spread. — [Ernst & Spatt NBER w29883](https://www.nber.org/papers/w29883)

### Inferences
- **Worked cost budget.** For a strategy rebalancing weekly options round trip every week with marketable orders, a 6.6% effective spread implies about 6.6% of premium per week in friction. Annualized against premium deployed, that is hundreds of percent, so any edge must be measured in premium terms, not notional.
- **Cost-aware backtests are required.** A retail app's backtests should model at least:
  - fills at effective spread ≈ 50% of quoted for retail-routed marketable orders;
  - quoted-spread fills as a conservative case;
  - mid-fill as an upper bound;
  - per-contract fees of $0-$0.65 plus about $0.04 regulatory pass-through;
  - SPX/NDX exchange fees of about $0.5-0.75.
- **The cheapest segments are ATM ETF options and larger tickets.** ATM ETF options (about 4% effective) and tickets above $1,000 (about 2-3% effective) are roughly 3-6x cheaper than micro-ticket OTM weeklies (11-28% effective).

### Gaps
- I found no published study of after-cost returns for retail-executable systematic option strategies (for example covered calls, cash-secured puts or iron condors on SPY/QQQ) using actual retail execution data from 2022 to 2026.
