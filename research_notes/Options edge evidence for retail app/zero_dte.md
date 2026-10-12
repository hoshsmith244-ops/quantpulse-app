# 0DTE (Same-Day-Expiry) Options on SPX/SPY: Buyer vs Seller Returns, Retail Outcomes, Variance Premium, Market Impact, Volume Share

Notes compiled 2026-10-12. Versions used: most recent accessible full text for each working paper (version dates noted inline). Where a claim comes only from a search-result summary and the primary page was not read, it is flagged "(unverified summary)".

**Most important caveat:** Vilkov's "0DTE Trading Rules" replication repo has a correction log dated **August 2026**. It says the bid-ask half-spread was charged at 1/100 of its true size. After the fix, **no 0DTE structure keeps a materially positive net Sharpe ratio**, and the conditional 10:00 ET rules turn negative too. The SSRN abstract (rev. March 2026) and the paper's annotated markdown still show the older, too-favorable numbers. Details are in section 1.

---

## 1. Returns to buying vs selling 0DTE options (Beckmeyer-Branger-Gayda; Bandi-Fusari-Renò; Dim-Eraker-Vilkov; Vilkov; Almeida-Freire-Hizmeri)

### Takeaway
All the major academic studies agree that buying 0DTE SPX options loses money on average. ATM calls, puts and straddles held to the 16:00 expiry all have negative mean returns, with very wide, right-skewed outcomes. Sellers earn a positive variance risk premium, but it is tiny in daily terms (about 0.01% of spot per day), comes with heavy tail risk, and in the most recent corrected evidence it does not survive realistic bid-ask costs. Any mispricing edge (Almeida et al.) was profitable before 2022 and faded after daily expirations arrived.

### Cited Findings
**Dim, Eraker & Vilkov, "0DTEs: Trading, Gamma Risk and Volatility Propagation" (SSRN 4692190; posted Feb 5, 2024, last revised Jun 6, 2025; full text read: May 14, 2024 version)**
- Sample: SPXW (and SPY) options, **01/2012 to 14/06/2023**. 0DTEs had about 50% of SPX index option volume in August 2023, up from 5% in 2016 — [DEV May 2024 PDF (WFA portal)](https://westernfinance-portal.org/viewpaper?n=950096)
- 0DTE options show "negative average returns, Sharpe ratios, extreme volatility, and positive skewness ... all intensifying as the expiration approaches" — [DEV 2024](https://westernfinance-portal.org/viewpaper?n=950096)
- The annualized 0DTE VRP is roughly **5x that of 11-22 DTE options** and orders of magnitude larger than 1-22 DTE buckets in every sample year. In daily terms, though, the 0DTE VRP is **only about 0.01%**, "which makes it hardly profitable given the required delta-hedging intensity for high-gamma instruments and realistic transaction costs" — [DEV 2024](https://westernfinance-portal.org/viewpaper?n=950096)
- The annualized 0DTE VRP climbs through the day and rises sharply in the last few 30-minute bars before 16:00. It stayed highly positive even in 2020, when every other expiry bucket turned negative — [DEV 2024](https://westernfinance-portal.org/viewpaper?n=950096)
- ATM 0DTE calls, puts and delta-neutral straddles bought at each 30-minute bar and held to 16:00 all have **negative average returns**. The straddle's average loss is "an order of magnitude larger in the last to-expiration bar compared to the noon". Return volatility roughly doubles in the last bar — [DEV 2024](https://westernfinance-portal.org/viewpaper?n=950096)
- The authors argue that VRP, returns, skewness and Sharpe ratios line up closely with realized risks. They say 0DTE demand can be partly explained by lottery-type preferences for positive skew — [DEV 2024](https://westernfinance-portal.org/viewpaper?n=950096)

**Vilkov, "0DTE Trading Rules" (SSRN 4641356; first version 2023; last revised Mar 18, 2026; replication repo corrected Aug 2026)**
- Current SSRN abstract: SPX 0DTE options, **Sep 2016 to early Feb 2026**. A positive 0DTE VRP exists, but at same-day horizons "its economic magnitude is small and difficult to monetize after realistic frictions". Net P&L is wide, state-dependent and "dominated by tail risk rather than by stable mean carry" — [SSRN 4641356](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4641356)
- Jan 2024 version, unconditional static rules held to expiry: the VRP is significant over the whole sample. At the median, buying deep ITM calls and selling OTM calls and puts can be statistically profitable, but return distributions are so wide that mean returns are insignificant — [SSRN 4641356 (search summary of Jan 2024 version)](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4641356)
- From the annotated paper: the median realized VRP from 10:00 ET to expiry is about **0.0011% of the underlying**. Most ATM-to-OTM calls and puts lose money on average when bought at 10:00. Selling slightly OTM calls and puts is profitable in up to about 75% of observations. Risk reversals were the only structure with positive mean, median and 25th-percentile P&L, and the mean was only about 0.01% of spot. The 1% expected shortfall of daily net P&L was **about 0.58% to 1.58% of the underlying** across strategies. Realized variance explains at most about 4.5% of P&L (R²); realized skewness is the main driver — [vilkovgr/0dte-strategies paper-annotated.md](https://github.com/vilkovgr/0dte-strategies/blob/main/docs/paper/paper-annotated.md). The tail-risk numbers were computed before the Aug 2026 cost correction.
- **August 2026 correction (KNOWN-ISSUES.md):** the half-spread was charged at 1/100 of its true size (it averages about 2.2 bp of spot). Corrected unconditional net Sharpe ratios (2024-05-01 panel):

  | Structure | Before | After |
  |---|---|---|
  | Put ratio spread | +0.84 | **−0.61** |
  | Risk reversal | +0.44 | **+0.10** |
  | Bear put spread | +0.30 | **−0.73** |
  | Strangle/straddle | −0.51 | **−0.97** |
  | Iron butterfly/condor | −0.96 | **−2.67** |

  Conditional out-of-sample results moved the same way: the put-ratio conditional net Sharpe went from **+0.93 to −0.75**, and the top-three basket from **+0.82 to −0.82**. The log concludes "No structure retains a materially positive net Sharpe ratio." The "model zoo" net figures use only a flat 0.5 bp cost, so they are upper bounds — [KNOWN-ISSUES.md](https://github.com/vilkovgr/0dte-strategies/blob/main/KNOWN-ISSUES.md); [repo README](https://github.com/vilkovgr/0dte-strategies)
  - This conflicts with the Mar 2026 SSRN abstract, which says 10:00 ET conditional rules "deliver economically meaningful net performance for selected strategies and diversified baskets" — [SSRN 4641356](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4641356). The Aug 2026 correction supersedes it.

**Almeida, Freire & Hizmeri, "0DTE Asset Pricing" (SSRN 4701401; first draft Jan 20, 2024; full text read: May 23, 2025 draft)**
- Sample: SPXW 1-minute CBOE data, **Jan 6, 2012 to Mar 18, 2025** (1,815 0DTE dates, about 40% of them after May 11, 2022) — [Almeida et al. 2025 (FMA PDF)](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf)
- ATM delta-hedged calls and straddles have significantly negative average returns, so 0DTE buyers pay a large premium for intraday variance protection. The annualized 0DTE VRP "can be up to four times larger" than at longer horizons — [Almeida et al. 2025](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf)
- Table 1 (0DTE VRP by entry time, annualized, in percentage points as reported): mean **1.80 at 10:00**, 1.54 at 11:00, rising to **2.96 at 14:00**. Standard deviations are about 7.6 to 14.4, and p-values are about 0. Table 2 (by maturity): 1DTE mean **0.56**, 22DTE 0.81 — [Almeida et al. 2025, Tables 1-2](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf)
- Unlike monthly options, the 0DTE VRP is driven mainly by **upside ("good") variance**: investors demand compensation for positive market-return states — [Almeida et al. 2025](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf)
- Only about 30% of 0DTE options (6% of ATM options) satisfy stochastic-dominance price bounds for risk-averse investors, versus about 97% of one-month options. A strategy that buys or writes delta-hedged ATM options when they violate those bounds was "highly profitable, even after transaction costs", with a Sharpe ratio about 10x that of always writing the delta-hedged ATM option, **up to 2022**. "After the daily availability of 0DTEs ... the profitability dissipates" — [Almeida et al. 2025](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf)

**Bandi, Fusari & Renò, "0DTE Option Pricing" (SSRN 4503344; first draft Jul 7, 2023; full text read: Feb 19, 2024 draft)**
- This is a pricing and hedging paper, not a strategy-return paper. It derives closed-form Edgeworth-type expansions with skewness and kurtosis corrections. Search summary: pricing RMSE improves by about **54% to 64%** relative to state-of-the-art models, depending on the IV quantile — [SSRN 4503344](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4503344); [BFR Feb 2024 draft](https://westernfinance-portal.org/viewpaper?n=915376) (the 54-64% figure is an unverified summary)
- Risk-premium section: sample **Jan 2, 2014 to May 11, 2023**, excess returns measured 10:30 to 16:00. The volatility risk premium regression (vol-of-vol plus leverage) has R² of **21.2%** univariate and **34.81%** joint. The return premium regression has R² of **1.58%**, and the authors call it "suggestive" evidence of near-instantaneous predictability — [BFR Feb 2024, Table 4](https://westernfinance-portal.org/viewpaper?n=915376)
- Renò's faculty page lists the paper as forthcoming in the *Journal of Finance* — [Renò research page](https://roberto-reno.faculty.essec.edu/research) (unverified summary)

**Beckmeyer, Branger & Gayda (retail returns by strategy; detail in section 2)**
- Positions that need an upfront premium (net option buying) earn significantly negative returns, "which reflects the average additional compensation for the option seller". Multi-leg positions earn on average **0.17%** more than single-leg positions. Median margin-adjusted returns on retail put (call) spreads are **3% (3.3%)**, against negative medians for single-leg positions — [Beckmeyer et al., Dec 15, 2023 version (FoFI 2024)](https://wp.lancs.ac.uk/fofi2024/files/2024/04/FoFI-2024-146-Leander-Gayda.pdf)

**BIS (Todorov & Vilkov, Box B, BIS Quarterly Review, Mar 2024)**
- 0DTE leverage ratios can exceed **400**. 0DTEs average annualized returns of **−32,000%** (max 79,000%), against −550% (max 2,500%) for one-month options — [BIS QR Mar 2024](https://www.bis.org/publications/what-could-explain-recent-drop-vix)

### Inferences
- The evidence agrees that buyers lose on average and sellers earn the premium. It disagrees on whether sellers net anything after real costs: DEV (2024) and Vilkov's corrected repo (Aug 2026) both say the same-day VRP is too small relative to spreads, hedging and tail losses to monetize reliably. Retail users should treat "sell 0DTE premium" as at best roughly zero-edge net of costs, with crash-tail exposure.
- Edges in 0DTE seem to decay as the market matures: Almeida et al.'s pre-2022 mispricing profits disappear after daily expiries.
- The large annualized VRP figures (up to ~5x longer maturities) are misleading for sizing. In per-trade terms the premium is on the order of 0.001% to 0.01% of spot per day, against half-spreads of about 2 bp of spot.

### Gaps
- I could not access the latest SSRN PDF of Vilkov (Mar 2026) or check whether it has been re-revised after the Aug 2026 correction. The repo says the paper revision was "still in progress".
- I did not read the Jun 2025 revision of DEV in full; the findings above come from the May 2024 full text plus the current abstract.
- I did not locate the final *Journal of Finance* version of Bandi-Fusari-Renò or confirm whether its numbers changed.
- No study found reports SPY-only 0DTE buyer/seller returns. All the evidence is on SPX/SPXW.

---

## 2. Retail trader outcomes in 0DTE: losses, spreads paid, net long or short

### Takeaway
Under the most-cited retail proxy (Cboe price-improvement auction trades, Feb 2021 to Sep 2023), retail lost more than $125M in SPX 0DTE: about $241k per day, rising to about $350k per day after daily expiries began. More than $90M of that was transaction costs, and the losses were concentrated in single-leg, premium-paying (long) positions. Trader-level broker data agree that retail 0DTE trades are mostly purchases (93%) and lose about 4.6% per trade. Counter-evidence (SEC DERA economists; a Cboe-funded paper) says customer limit orders trade cheaply and that proxy-based loss estimates are overstated. Estimates of retail's share of 0DTE volume range from about 6% to about 50-60%, depending on the definition.

### Cited Findings
**Beckmeyer, Branger & Gayda, "Retail Traders Love 0DTE Options... But Should They?" (SSRN 4404704; first version Mar 30, 2023; full text read: Dec 15, 2023 version)**
- Data: Cboe Open/Close data plus trades flagged in Cboe's Automated Price Improvement Mechanism (SPX AIM retail proxy). Retail identification covers **Feb 2021 to Sep 2023** — [Beckmeyer et al. 2023](https://wp.lancs.ac.uk/fofi2024/files/2024/04/FoFI-2024-146-Leander-Gayda.pdf)
- Retail lost **more than $125 million** in total, **more than $90 million** of it from transaction costs and the rest from "poor positioning". Single-leg positions lost **more than $100 million** — [Beckmeyer et al. 2023](https://wp.lancs.ac.uk/fofi2024/files/2024/04/FoFI-2024-146-Leander-Gayda.pdf)
- Average daily losses were **$241,000** over the full sample and **$350,000** after May 16, 2022 (daily expirations). Roughly 60% of daily losses came from transaction costs and 60% from 0DTE puts, and "retail buys show particularly poor performance" — [Beckmeyer et al. 2023](https://wp.lancs.ac.uk/fofi2024/files/2024/04/FoFI-2024-146-Leander-Gayda.pdf); [SSRN abstract](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4404704)
  - An earlier Mar 2023 version reportedly gave about $358k per day after May 2022 (Feb 2021 to Feb 2023 sample) — [Beckmeyer X post](https://twitter.com/beckmeyerheiner/status/1642068464859848704) (unverified summary)
- Gross-of-fee cumulative losses have been "relatively constant since November of 2022", while cost-driven losses keep growing. Retail profits were significantly negatively related to 0DTE expensiveness (a VIX-formula measure at 9:30-9:40) before May 2022, but not afterwards — [Beckmeyer et al. 2023](https://wp.lancs.ac.uk/fofi2024/files/2024/04/FoFI-2024-146-Leander-Gayda.pdf)
- Risk compensation: a 1 SD increase in Gamma (Vega) exposure raises the rest-of-day return by **0.019%-0.045%** (**0.018%-0.094%**) — [Beckmeyer et al. 2023](https://wp.lancs.ac.uk/fofi2024/files/2024/04/FoFI-2024-146-Leander-Gayda.pdf)
- Market structure:
  - About **75%** of retail SPX option trades are 0DTE (up from about 30% in early 2021).
  - Retail's share of 0DTE volume was about **4% in 2021** and **more than 6% in 2022**, against about 2% in non-0DTE.
  - Single-leg share of retail 0DTE volume went from under 20% (2021) to **60-80% since mid-2022**.
  - **72%** of retail orders are for a single contract.
  - Source: [Beckmeyer et al. 2023](https://wp.lancs.ac.uk/fofi2024/files/2024/04/FoFI-2024-146-Leander-Gayda.pdf)
- **Net direction:** "end consumers buy more 0DTE options than they sell", which "leaves the option market maker with a net-short position", and that net short "has grown considerably in recent months". However, retail and non-retail "buy and sell options with roughly equal frequency, slightly favor puts over calls" — [Beckmeyer et al. 2023](https://wp.lancs.ac.uk/fofi2024/files/2024/04/FoFI-2024-146-Leander-Gayda.pdf)
- Price improvement works: effective spreads on retail AIM orders are smaller than on other 0DTE trades, but costs still dominate losses — [SSRN 4404704](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4404704)

**Bogousslavsky & Muravyev, "An Anatomy of Retail Option Trading" (Aug 29, 2024 version)**
- Trader-level data on **$15B** of retail stock and option trades; option sample **1/2020 to 12/2022**. 0DTE is **23%** of option trades, and median maturity fell from 4 days (2020) to under 1 day (2022) — [Bogousslavsky & Muravyev 2024](https://www.lsu.edu/business/files/event-files/2025-finance-mardi-gras/retail_option_trading_v2.pdf)
- **93.3%** of retail 0DTE trades start with a purchase; option purchases outnumber sales 7-to-1 overall. A typical retail option trade is a purchase of a one-day SPX call or put held for about an hour — [Bogousslavsky & Muravyev 2024](https://www.lsu.edu/business/files/event-files/2025-finance-mardi-gras/retail_option_trading_v2.pdf)
- 0DTE trades lose **4.6% per trade** on average while other trades earn about zero. 0DTE trades underperform by 4.7% (t = −10), or −2.95% with full controls and fixed effects. "Losses in retail options are predominantly concentrated in 0DTE options." Naked option sales (13% of trades) earn **+20%**, while purchases lose 3.95%. Average 0DTE trade size is **$1,068** — [Bogousslavsky & Muravyev 2024](https://www.lsu.edu/business/files/event-files/2025-finance-mardi-gras/retail_option_trading_v2.pdf)

**Fu, Li, Musto & Pearson, "Hope at a Reasonable Price: Customer Use of Limit Orders in the 0DTE Market" (SEC DERA Working Paper, Mar 2025)**
- Sample: SPXW limit order book, **Jul 1, 2020 to Sep 28, 2023**, split at Apr 25, 2022 — [SEC DERA 2025](https://www.sec.gov/files/dera-hope-reasonable-prc-2503.pdf)
- Customers frequently quote at the BBO: slightly OTM options have customer interest at the best bid more than half the time, and far-OTM options at the best offer more than 80% of the time. **A quarter of all 0DTE trades** are filled customer market-turning or pick-off limit orders, mostly 1 to a few contracts — [SEC DERA 2025](https://www.sec.gov/files/dera-hope-reasonable-prc-2503.pdf)
- Example: buying calls under $3 with a 2-tick ($0.10) spread. MTO fill rates were 50% (early) and 62% (late). All-in expected cost was **$0.028 / $0.021** against **$0.05** for a marketable order. The counterparty's realized spread one second after fill was about 2.5 cents (early) and half that later — [SEC DERA 2025](https://www.sec.gov/files/dera-hope-reasonable-prc-2503.pdf)
- They identify an OPRA sequencing issue (post-trade BBOs time-stamped before the trade) that affects comparisons such as Beckmeyer et al.'s, and conclude "any exploitation of customers by market makers is much less than first appears" — [SEC DERA 2025](https://www.sec.gov/files/dera-hope-reasonable-prc-2503.pdf)

**Amaya, Garcia-Ares, Pearson & Vasquez, "New Evidence on the Performance of Customer Options Trades" (Apr 2025; funded by a Cboe Options Institute data grant)**
- Using Cboe data with trade direction and open/close flags (**Jan 2020 to Jun 2023**) and expiration values, **Cboe customer SLIM trades are on average profitable**, contradicting Bryzgalova-Pavlova-Sikorskaya. That paper had estimated retail losses of −$5.03M per day ($2.1B total, Nov 2019 to Jun 2021) at a 10-day horizon, or −$1.63M per day held to expiry. Not 0DTE-specific — [Amaya et al. 2025 (Cboe)](https://cdn.cboe.com/resources/education/research_publications/Retail_Profitability.pdf)
- They argue Beckmeyer et al.'s auction proxy covers only 4-6% of SPX option trading, "an implausible low estimate of retail trading", so it captures only a small part of retail — [Amaya et al. 2025](https://cdn.cboe.com/resources/education/research_publications/Retail_Profitability.pdf)

**Cboe industry estimates (not peer-reviewed; Cboe has a commercial interest)**
- Retail is an estimated **50-60%** of SPX 0DTE trading (57% → 47% in early Apr 2025 → about 60%). Customer activity is "extremely balanced", **more than 95%** of 0DTE trades are limited-risk (long options or spreads), and only **4%** is naked short options — [Cboe, "0DTEs Decoded", May 2, 2025](https://www.cboe.com/insights/posts/0-dt-es-decoded-positioning-trends-and-market-impact)
- Retail share was 54% of SPX 0DTE volume in May 2025 — [Cboe, Jun 2, 2025](https://www.cboe.com/insights/posts/spx-0-dte-options-jump-to-61-share-on-retail-resurgence) — and about 53% in Aug 2025 — [Cboe, Sep 2, 2025](https://www.cboe.com/insights/posts/spx-0-dte-options-jump-to-record-62-share-in-august)
- Almeida et al. (citing Beckmeyer) say "the vast majority of 0DTE S&P 500 trading (around 94%) is still attributable to institutional investors" — [Almeida et al. 2025, fn. 3](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf). This contradicts Cboe's 50-60%.

### Inferences
- Net long or short: the retail evidence points to retail being **net long premium in single-leg 0DTE**: purchases are 93% of trader-level 0DTE trades, and the loss-making trades are single-leg buys. Retail also runs a material share of short-premium spreads (iron condors, verticals). Cboe's view that flow is "balanced" applies to all customers, not retail alone.
- The size of retail losses depends heavily on how retail is defined (auction-flag proxy versus broker data versus Cboe's "retail" estimate) and on how spreads are measured. Order type matters: limit orders at or inside mid can roughly halve cost relative to marketable orders, per SEC DERA. That is a concrete, evidence-backed point for a retail app (default to limit orders at mid).

### Gaps
- No study found gives retail 0DTE P&L after Sep 2023 (Beckmeyer) or after 2022 (Bogousslavsky-Muravyev), even though retail share reportedly reached 50-60% in 2025.
- Cboe's retail-share methodology is not public in the posts read.
- I found no SPY-specific retail 0DTE profitability study.

---

## 3. Is there a 0DTE variance premium? Magnitude. VIX1D vs realized volatility

### Takeaway
Yes. Same-day implied variance exceeds realized intraday variance on average, and annualized it is several times larger than at 1-22 DTE. In absolute terms per day it is tiny (about 0.001% to 0.01% of spot). Cboe's VIX1D (launched Apr 24, 2023) systematically overstates realized next-day/same-day S&P 500 volatility and has a built-in intraday-up, overnight-down pattern caused by its methodology.

### Cited Findings
- 0DTE VRP is about 5x the 11-22 DTE VRP when annualized, but about **0.01% in daily terms**; sample 2012 to Jun 2023 — [DEV 2024](https://westernfinance-portal.org/viewpaper?n=950096)
- Median realized VRP from 10:00 ET to expiry is about **0.0011% of spot**; sample Sep 2016 to Jan 2026 — [Vilkov annotated paper](https://github.com/vilkovgr/0dte-strategies/blob/main/docs/paper/paper-annotated.md)
- Annualized 0DTE VRP (percentage points) averages **1.54-2.96** depending on entry time, against **0.56** at 1DTE and 0.81 at 22DTE; driven mostly by upside variance; Jan 2012 to Mar 2025. The VRP (its "good" component) **negatively** predicts intraday market returns — [Almeida et al. 2025](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf)
- **VIX1D definition:** launched **Apr 24, 2023** by Cboe Labs. It measures expected S&P 500 volatility over the **current trading day**, using PM-settled SPXW options with **0 and 1 day to expiry** with VIX-style strike aggregation. It is non-tradable. In a back-test over the March 2023 bank failures, VIX rose 38.8% and VIX1D 162.7% — [Cboe, "What the VIX and VIX1D Indices Attempt to Measure"](https://www.cboe.com/insights/posts/what-the-vix-and-vix-1-d-indices-attempt-to-measure-and-how-they-differ); [tastylive](https://www.tastylive.com/news-insights/what-is-vix1d-how-does-it-work) (unverified summary)
- **Overnight bias:** Albers & Kestner (Finance Research Letters 62, 2024, 105186) find VIX1D consistently **rises during trading hours and falls overnight**. They attribute this to business-time weighting and dynamic weighting of next-term options that "include overnight variance risk premiums", an effect "more pronounced than the day-of-the-week effect". They propose data filtering or a forward-starting variance fix — [RePEc listing](https://ideas.repec.org/a/eee/finlet/v62y2024ipas1544612324002162.html); [TU Dresden record](https://fis.tu-dresden.de/portal/en/publications/the-daily-rise-and-fall-of-the-vix1d-causes-and-solutions-of-its-overnight-bias(416336ff-f4f0-468f-a9cd-2877ae8ffdcd).html)
- **VIX1D overestimates realized volatility:** Albers (Journal of Futures Markets 45(11), 2025, pp. 2092-2108) finds VIX1D "overestimates S&P 500 volatility". It is generally lower and more volatile than longer VIX indices and trends upward within the day. A premium-adjusted VIX1D beats HAR and HAR-VIX1D as a 1-day forecast — [RePEc: Albers 2025](https://ideas.repec.org/a/wly/jfutmk/v45y2025i11p2092-2108.html); [Wiley](https://onlinelibrary.wiley.com/doi/full/10.1002/fut.70023). The in-sample slope on VIX1D in that regression is **0.85** (unverified summary of the paper text).

### Inferences
- Comparing raw VIX1D readings to realized volatility will overstate the "premium" in the morning and understate it late in the day, because of the methodology bias. Any app signal built on VIX1D-minus-RV needs an adjustment for intraday seasonality and the overnight component.

### Gaps
- I found no source giving the average VIX1D minus realized intraday volatility spread in vol points over a defined sample. The Albers papers' full numeric tables were not accessible (ScienceDirect returned 403).
- I did not find Cboe publishing a VIX1D vs realized-volatility comparison.

---

## 4. 0DTE share of SPX options volume (2022-2025/26) and which products have daily expirations

### Takeaway
SPX 0DTE grew from about 5% of SPX volume (2016) to about 43% (2023) and **59% for full-year 2025** (2.3M contracts ADV), with monthly records of 61% (May 2025) and 62.4% (Aug 2025). Daily (Mon-Fri) expirations exist for SPX/SPXW, XSP, SPY, QQQ and IWM. Single stocks do **not** have daily expirations. In Jan 2026 the SEC approved Nasdaq Monday/Wednesday expirations for the Magnificent 7, Broadcom and XLF.

### Cited Findings
- SPXW expiry timeline: Friday weeklies from Oct 28, 2005; Wednesday Feb 23, 2016; Monday Aug 15, 2016; Tuesday Apr 18, 2022; Thursday May 11, 2022 (daily from then on) — [Almeida et al. 2025](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf). Beckmeyer et al. date the daily calendar to May 16, 2022 — [Beckmeyer et al. 2023](https://wp.lancs.ac.uk/fofi2024/files/2024/04/FoFI-2024-146-Leander-Gayda.pdf). Fu et al. date the first Tuesday-expiry week to Apr 25, 2022 — [SEC DERA 2025](https://www.sec.gov/files/dera-hope-reasonable-prc-2503.pdf)
- 0DTE was about 2% of SPX volume in 2012 — [Almeida et al. 2025](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf) — about 5% in 2016 and about 50% in Aug 2023 — [BIS QR Mar 2024](https://www.bis.org/publications/what-could-explain-recent-drop-vix); [DEV 2024](https://westernfinance-portal.org/viewpaper?n=950096)
- **2023:** about **43%** of SPX ADV — [Cboe, "The Evolution of Same Day Options Trading", Aug 3, 2023](https://www.cboe.com/insights/posts/the-evolution-of-same-day-options-trading/). SPX 0DTE put/call ratio is about 1; single-leg is about 45-50% of volume and spreads about 50-55% — same source
- **2024:** a Cboe executive cited about 45% at end-2023 and about 47% in 2024, not as a full-year average — [Benzinga, Sep 2024](https://benzinga.com/news/events/24/09/41074042/zero-dte-options-fuel-record-spx-trading-volumes-with-no-signs-of-slowing-down-expert) (unverified summary)
- **2025 monthly:** record 56% (Feb) — [Cboe](https://www.cboe.com/insights/posts/spx-0-dte-options-jumped-to-record-56-share-in-feb/); 61%+ (May) — [Cboe, Jun 2, 2025](https://www.cboe.com/insights/posts/spx-0-dte-options-jump-to-61-share-on-retail-resurgence); **62.4%**, about 2.4M contracts per day (Aug) — [Cboe, Sep 2, 2025](https://www.cboe.com/insights/posts/spx-0-dte-options-jump-to-record-62-share-in-august)
- **Full year 2025:** SPX 0DTE ADV was a record **2.3M contracts**, **59%** of SPX volume; total SPX ADV was 3.9M — [Markets Media](https://www.marketsmedia.com/cboe-reports-record-trading-volume-for-2025/); [Barchart (Cboe release)](https://www.barchart.com/story/news/36914849/cboe-global-markets-reports-trading-volume-for-december-and-full-year-2025) (unverified summary of release)
- 0DTE across **all US-listed options** was 24.1% in 2025, up from 21.5% in 2024 (OCC/Cboe data) — [Traders Magazine](https://www.tradersmagazine.com/departments/options/vol-report-0dte-flex-options-are-2025-heroes/) (unverified summary)
- **2026:** on a record day (Apr 14, 2026), SPX 0DTE traded 3.12M contracts, about 49.7% of SPX volume — [Markets Media](https://www.marketsmedia.com/cboe-reports-record-daily-volume-in-proprietary-index-options/) (unverified summary)
- Daily-expiry products: SPY, QQQ and IWM are the ETFs with daily expiries. Single-stock options had mostly been limited to Friday expirations. On **Jan 16, 2026** the SEC approved **Nasdaq** listing **Monday and Wednesday** expirations for GOOG, AMZN, AAPL, META, MSFT, NVDA, TSLA, Broadcom and the Financial Select Sector SPDR (XLF). This moves the market "closer to daily expiries in single-stock options" but is not daily — [Yahoo Finance, Jan 19, 2026](https://finance.yahoo.com/news/sec-approves-expanded-option-expirations-113650138.html); [Bloomberg, Jan 16, 2026](https://www.bloomberg.com/news/articles/2026-01-16/mag-7-stock-options-get-sec-nod-for-monday-wednesday-expiries)
- XSP (mini-SPX) trades 0DTE; about 32% of XSP volume is 0DTE (undated) — [Cboe 0DTE resources](https://www.cboe.com/tradable-products/0dte/) (unverified summary)
- Separate from expiries: Cboe got SEC approval (May 2026) for extended trading hours on about 20 large single-stock option classes, with a planned Jul 13, 2026 start — [Cboe IR](https://ir.cboe.com/news/news-details/2026/Cboe-Receives-SEC-Approval-to-Offer-Extended-Trading-Hours-for-Select-Multi-Listed-Single-Stock-Options/default.aspx)
- A trading-education site claims daily expiries for TSLA, AAPL, NVDA and AMZN since early 2025 — [TradeAlgo](https://www.tradealgo.com/trading-guides/options/0dte-options-list-guide). This **conflicts** with Bloomberg/Yahoo (Jan 2026) and is not supported by exchange sources. Treat it as unreliable.

### Inferences
- Single stocks with weekly Friday options are "0DTE" only on Friday expiry days (and, after Nasdaq's rollout, Mon/Wed for the 9 approved names). SPX/XSP/SPY/QQQ/IWM are the only broadly available daily-0DTE underlyings.

### Gaps
- I found no exchange-published full-year 0DTE share for 2022 or 2024, and no 0DTE share for SPY, QQQ or IWM.
- I could not confirm whether Nasdaq's Mon/Wed single-stock expirations have actually launched as of Oct 2026, or whether 2026 YTD SPX 0DTE share is above or below 59%.

---

## 5. Overnight vs intraday: what a 0DTE opened at the open prices vs an option bought at the prior close

### Takeaway
An option bought at the prior close (a 1DTE that becomes 0DTE overnight) pays for overnight variance. The classic SPX evidence (2004-2013) says overnight variance is where the short-vol premium is earned: long delta-hedged options lose about 1% close-to-open and gain about 0.3% open-to-close. A 0DTE bought after the open prices only intraday variance. More recent 0DTE-specific studies (2012-2025) still find a positive intraday 0DTE VRP: long ATM straddles bought at 10:00 or later lose on average. The intraday-long-vol profit from older data does not appear to carry over to modern 0DTEs.

### Cited Findings
- Muravyev & Ni, "Why do option returns change sign from day to night?" (JFE 136(1), 2020, 219-238): average SPX delta-hedged option returns are **−0.7% per day**, made up of **−1% close-to-open** and **+0.3% open-to-close**. The pattern holds across maturities, moneyness and equity options; sample Jan 2004 to Apr 2013. The explanation is that option prices fail to reflect that volatility is much higher intraday than overnight — [RePEc](https://ideas.repec.org/a/eee/jfinec/v136y2020i1p219-238.html)
- VIX1D's 1DTE component carries the overnight VRP. That causes the index to rise during the day and fall overnight — [Albers & Kestner 2024](https://ideas.repec.org/a/eee/finlet/v62y2024ipas1544612324002162.html)
- 0DTE studies measure from intraday entries (10:00 to 16:00) and find a positive VRP that rises toward the close, with negative long straddle returns — [DEV 2024](https://westernfinance-portal.org/viewpaper?n=950096); [Almeida et al. 2025](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf). DEV computes overnight variance (16:00 close to 9:31 open) separately from intraday — same source
- The 1DTE annualized VRP (0.56) is well below the 0DTE intraday VRP (1.54-2.96) — [Almeida et al. 2025](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf)
- Related paper not read: Johannes, Kaeck, Seeger & Shah (2024), "Expected 1DTE option returns" (SSRN), on 1DTE returns around macro announcements — cited in [Almeida et al. 2025](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf)

### Inferences
- For a retail user, buying a same-day option at the prior close adds exposure to the overnight variance premium, which has historically been the most expensive part of the day for option buyers. Buying after the open avoids that, but the evidence says the intraday 0DTE premium is still positive (still expensive for buyers) in 2012-2025 data. The Muravyev-Ni sample predates the 0DTE era, so it should not be relied on to claim intraday long-vol pays today.

### Gaps
- I found no paper that directly compares holding-period returns for the same 0DTE contract bought at the prior close versus at the open in the post-2022 daily-expiry era.
- I did not read Johannes et al. (2024).

---

## 6. Can daily-bar (end-of-day) stock signals predict next-day intraday moves well enough to trade 0DTE?

### Takeaway
I found **no credible evidence** that end-of-day signals predict next-day intraday index moves strongly enough to profit from 0DTE after costs. The closest direct test, Vilkov's out-of-sample 10:00 ET conditional rules, showed apparent net Sharpe ratios near 1. After the Aug 2026 cost correction they are **negative** (e.g., the top-3 basket is −0.82). Documented intraday predictability is intraday-to-intraday (first half-hour or rest-of-day → last half-hour) and option-implied, not daily-bar.

### Cited Findings
- Vilkov's conditional out-of-sample protocol (forecasts from Apr 2019, 10:00 ET entries): before the correction, the put-ratio net Sharpe was 0.93 and the top-3 basket 0.82. Binary direction classification beat direct return prediction — [annotated paper](https://github.com/vilkovgr/0dte-strategies/blob/main/docs/paper/paper-annotated.md). **After the correction:** −0.75 and −0.82 respectively — [KNOWN-ISSUES.md](https://github.com/vilkovgr/0dte-strategies/blob/main/KNOWN-ISSUES.md). The repo lists inputs including intraday VIX and moment series, intraday surface slopes, flow and liquidity features and EOD reference prices; the exact predictor set was not documented on the page read — [repo](https://github.com/vilkovgr/0dte-strategies)
- Option-implied predictability: the 0DTE VRP (its upside component) **negatively** predicts same-day excess market returns. Of VRP, risk-neutral moments and the Martin bound, only the VRP is significant — [Almeida et al. 2025](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf). In BFR, the return-premium regression R² is only 1.58% — [BFR 2024](https://westernfinance-portal.org/viewpaper?n=915376)
- Mispricing-based 0DTE trading worked before 2022 and dissipated afterwards — [Almeida et al. 2025](https://www.fma.org/assets/docs/Derivatives2025/Almeida.pdf)
- Intraday momentum: the first half-hour SPY return predicts the last half-hour return (Feb 1993 to Dec 2013), more strongly on volatile, high-volume and news days — Gao, Han, Li & Zhou, JFE 2018, via [Alpha Architect summary](https://alphaarchitect.com/2014/08/attention-prop-traders-the-first-half-hour-of-trading-predicts-the-last-half-hour/) (unverified summary). Across 60+ futures (1974-2020), the rest-of-day return predicts the last 30 minutes, linked to short-gamma hedging, and the effect reverts over following days — Baltussen, Da, Lammers & Martens, JFE 2021, [EUR record](https://pure.eur.nl/en/publications/hedging-demand-and-market-intraday-momentum/); [Da intramom PDF](https://www3.nd.edu/~zda/intramom.pdf) (unverified summary)
- Market-maker net gamma conditions intraday dynamics: positive (negative) dealer gamma goes with stronger intraday reversal (momentum) — [DEV SSRN abstract, rev. Jun 2025](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4692190)

### Inferences
- An app that turns daily-bar stock signals into 0DTE trades has no published academic support. The bar is high: a signal must overcome half-spreads of about 2 bp of spot per leg, a negative-carry premium on long options, and 1% expected-shortfall days of about 0.6-1.6% of spot for short structures. Regime and gamma conditioning (DEV) and intraday momentum are the more plausible information sources, and even those are unproven net of 0DTE costs.

### Gaps
- No study found tests EOD single-stock or cross-sectional signals against next-day SPX/SPY 0DTE P&L.
- The precise predictor set and post-correction feature-level results from Vilkov were not available.

---

## Appendix-style notes on market impact (part of the objective; kept here for the report writer)

### Takeaway
Most evidence finds 0DTE does **not** destabilize the index on average. Dealers are on average net long gamma, which dampens volatility. One instrumented study (Brogaard-Han-Won) finds a positive volatility effect driven by retail.

### Cited Findings
- **Dim, Eraker & Vilkov** (rev. Jun 2025 abstract): market makers' net gamma is on average **positive** and negatively related to future intraday volatility; the evidence fits delta-hedging, not informed trading — [SSRN 4692190](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4692190). The May 2024 version finds that the correlation of 0DTE and underlying intraday volume rose from **0.25-0.30 (pre-2021) to 0.59 (2023)**, but the change in volatility response is only **0.15 SD**, "economically negligible". High 0DTE open-interest gamma does not propagate past volatility — [DEV 2024](https://westernfinance-portal.org/viewpaper?n=950096)
- **Adams, Fontaine & Ornthanalai**, "The Market for 0DTE: The Role of Liquidity Providers in Volatility Attenuation" (SSRN 4881008; 2019-2023 intraday data): index volatility is **60-90 annualized bp lower** on days with 0DTE trading, using expiration-day variation — [SSRN 4881008](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4881008) (unverified summary)
- **Brogaard, Han & Won**, "Does 0DTE Options Trading Increase Volatility?" (SSRN 4426358; Apr 2023): using staggered weekly-option introductions as an instrument, a **1 SD increase in 0DTE trading raises volatility by 9.10%** of its mean, mainly from speculative retail, even after controlling for dealer gamma hedging — [SSRN 4426358](https://papers.ssrn.com/sol3/Delivery.cfm/4426358.pdf?abstractid=4426358&mirid=1&type=2) (unverified summary)
- **Cboe (Mandy Xu, 2023):** market-maker SPX 0DTE net gamma is **$170mm-$670mm** through the day, about **0.04%-0.17%** of S&P futures daily liquidity (about $400bn). The median at 3:30pm is +$173mm, with an IQR of −$1.1bn to +$2.4bn — [Cboe, "Much Ado About 0DTEs"](https://www.cboe.com/insights/posts/volatility-insights-evaluating-the-market-impact-of-spx-0-dte-options) (unverified summary). In 2025, net market-maker gamma hedging was at most **0.2%** of SPX daily liquidity — [Cboe, May 2, 2025](https://www.cboe.com/insights/posts/0-dt-es-decoded-positioning-trends-and-market-impact)
- **BIS (Todorov & Vilkov, Mar 2024):** 0DTE growth "did not, on net, lure activity away from one-month options" and is unlikely to explain the low 2023 VIX. Dealer hedging of structured products is the suggested explanation — [BIS QR Mar 2024, Box B](https://www.bis.org/publications/what-could-explain-recent-drop-vix)

### Gaps
- No dedicated BIS Quarterly Review special feature on 0DTE retail and market makers was found; the BIS item is a box focused on VIX.
- I found no Federal Reserve (FEDS Notes) 0DTE study in the searches run.
