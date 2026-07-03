<?php
require_once 'config.php';
require_once 'pricing_config.php';

$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
include __DIR__ . '/seo_head.php';
?>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; color: #334155; background: #f8fafc; }
        a { text-decoration: none; }

        /* Page Header */
        .page-header {
            background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
            padding: 50px 20px;
            text-align: center;
            color: white;
        }
        .page-header h1 {
            font-size: clamp(2rem, 5vw, 2.75rem);
            font-weight: 800;
            margin-bottom: 12px;
        }
        .page-header p {
            font-size: 1.15rem;
            opacity: 0.85;
            max-width: 600px;
            margin: 0 auto;
        }

        /* Calculator Container */
        .calc-container {
            max-width: 800px;
            margin: -30px auto 40px;
            padding: 0 20px;
            position: relative;
            z-index: 1;
        }
        .calc-card {
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            padding: 40px;
        }
        @media (max-width: 600px) {
            .calc-card { padding: 24px 18px; }
        }

        /* Section Headers */
        .section-title {
            font-size: 0.85rem;
            font-weight: 700;
            color: #38b6ff;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f1f5f9;
        }

        /* Inputs */
        .input-group { margin-bottom: 24px; }
        .input-group label {
            display: block;
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 8px;
            color: #334155;
        }
        .input-group .hint {
            font-size: 0.8rem;
            color: #94a3b8;
            margin-bottom: 6px;
        }
        .dollar-input {
            position: relative;
            display: inline-block;
            width: 100%;
            max-width: 220px;
        }
        .dollar-input span {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #64748b;
            font-weight: 600;
            font-size: 1.05rem;
        }
        .dollar-input input {
            width: 100%;
            padding: 12px 14px 12px 28px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 1.05rem;
            font-family: 'Inter', sans-serif;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .dollar-input input:focus {
            outline: none;
            border-color: #38b6ff;
            box-shadow: 0 0 0 4px rgba(56, 182, 255, 0.1);
        }
        select {
            width: 100%;
            max-width: 220px;
            padding: 12px 14px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 1rem;
            font-family: 'Inter', sans-serif;
            background: white;
            cursor: pointer;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        select:focus {
            outline: none;
            border-color: #38b6ff;
            box-shadow: 0 0 0 4px rgba(56, 182, 255, 0.1);
        }

        /* Toggle Buttons */
        .toggle-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .toggle-btn {
            padding: 10px 18px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            background: white;
            font-family: 'Inter', sans-serif;
            font-size: 0.9rem;
            font-weight: 500;
            color: #64748b;
            cursor: pointer;
            transition: all 0.2s;
        }
        .toggle-btn:hover { border-color: #38b6ff; color: #38b6ff; }
        .toggle-btn.active {
            background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 100%);
            color: white;
            border-color: transparent;
            font-weight: 600;
        }
        .toggle-btn .price-tag {
            display: block;
            font-size: 0.75rem;
            opacity: 0.8;
            margin-top: 2px;
        }

        /* Divider */
        .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
            margin: 32px 0;
        }

        /* Results */
        .results-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        @media (max-width: 500px) {
            .results-grid { grid-template-columns: 1fr; }
        }
        .result-item {
            padding: 16px;
            border-radius: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
        }
        .result-item .label {
            font-size: 0.8rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .result-item .value {
            font-size: 1.35rem;
            font-weight: 700;
            color: #0f172a;
        }
        .result-highlight {
            background: linear-gradient(135deg, #eff6ff, #e0f2fe);
            border-color: #38b6ff;
        }
        .result-highlight .value { color: #0284c7; }
        .result-roi {
            grid-column: 1 / -1;
            background: linear-gradient(135deg, #0f172a, #1e293b);
            border: none;
            text-align: center;
            padding: 24px;
        }
        .result-roi .label { color: #94a3b8; font-size: 0.85rem; }
        .result-roi .value {
            font-size: 2.2rem;
            font-weight: 800;
            color: #4ade80;
        }
        .result-roi .value.negative { color: #f87171; }
        .result-roi .sub { color: #94a3b8; font-size: 0.85rem; margin-top: 4px; }

        /* Comparison Table */
        .comparison-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 0.9rem;
        }
        .comparison-table th {
            text-align: left;
            padding: 12px;
            font-weight: 600;
            color: #64748b;
            border-bottom: 2px solid #e2e8f0;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .comparison-table td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
        }
        .comparison-table tr.highlight-row {
            background: #eff6ff;
            font-weight: 600;
        }
        .comparison-table tr.highlight-row td { color: #0284c7; }
        .comparison-table .channel-name { font-weight: 600; }
        @media (max-width: 500px) {
            .comparison-table { font-size: 0.8rem; }
            .comparison-table th, .comparison-table td { padding: 8px 6px; }
        }

        /* CTA Section */
        .cta-section {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            padding: 60px 20px;
            text-align: center;
            color: white;
        }
        .cta-section h2 {
            font-size: clamp(1.5rem, 4vw, 2rem);
            font-weight: 800;
            margin-bottom: 12px;
        }
        .cta-section p {
            color: #94a3b8;
            font-size: 1.05rem;
            margin-bottom: 28px;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
        }
        .cta-buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .btn-primary {
            display: inline-block;
            background: linear-gradient(135deg, #ff8c00, #ff6b00);
            color: white;
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 1.05rem;
            font-weight: 700;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(255, 140, 0, 0.35); }
        .btn-secondary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #38b6ff;
            padding: 16px 32px;
            border-radius: 12px;
            border: 2px solid #38b6ff;
            font-size: 1.05rem;
            font-weight: 600;
            transition: background 0.2s;
        }
        .btn-secondary:hover { background: rgba(56, 182, 255, 0.1); }

        /* Footer */
        .page-footer {
            background: #1e293b;
            color: white;
            text-align: center;
            padding: 30px 20px;
            font-size: 0.9rem;
        }
        .page-footer a { color: #38b6ff; }
        .page-footer a:hover { text-decoration: underline; }
    </style>
</head>
<body>

    <?php include 'header.php'; ?>

    <!-- Page Header -->
    <div class="page-header">
        <h1>Calculate Your Direct Mail ROI</h1>
        <p>See exactly what a postcard campaign can return for your business</p>
    </div>

    <!-- Calculator -->
    <div class="calc-container">
        <div class="calc-card">
            <div class="section-title">Your Business</div>

            <div class="input-group">
                <label for="customer-value">Average Customer Value</label>
                <div class="hint">How much does a typical customer spend per visit?</div>
                <div class="dollar-input">
                    <span>$</span>
                    <input type="number" id="customer-value" value="150" min="1" max="100000">
                </div>
            </div>

            <div class="input-group">
                <label for="lifetime-visits">Estimated Lifetime Visits</label>
                <div class="hint">How many times does a customer typically return?</div>
                <select id="lifetime-visits">
                    <option value="1">1 visit (one-time)</option>
                    <option value="2" selected>2 visits</option>
                    <option value="5">5 visits</option>
                    <option value="10">10+ visits</option>
                </select>
            </div>

            <div class="divider"></div>
            <div class="section-title">Your Campaign</div>

            <div class="input-group">
                <label>Distribution Reach</label>
                <div class="toggle-group">
                    <button class="toggle-btn active" data-reach="5k" onclick="setReach(this)">5,000 households</button>
                    <button class="toggle-btn" data-reach="10k" onclick="setReach(this)">10,000 households</button>
                </div>
            </div>

            <div class="input-group">
                <label>Ad Size</label>
                <div class="toggle-group" id="size-toggles">
                    <button class="toggle-btn active" data-size="small" onclick="setSize(this)">
                        Small (3&times;2)
                        <span class="price-tag" id="price-small">$199</span>
                    </button>
                    <button class="toggle-btn" data-size="medium" onclick="setSize(this)">
                        Medium (3&times;4)
                        <span class="price-tag" id="price-medium">$299</span>
                    </button>
                    <button class="toggle-btn" data-size="large" onclick="setSize(this)">
                        Large (4&times;6)
                        <span class="price-tag" id="price-large">$549</span>
                    </button>
                </div>
            </div>

            <div class="input-group">
                <label>Expected Response Rate</label>
                <div class="hint">Industry average for direct mail is 0.5% &ndash; 2%</div>
                <div class="toggle-group">
                    <button class="toggle-btn" data-rate="0.0025" onclick="setRate(this)">0.25%</button>
                    <button class="toggle-btn" data-rate="0.005" onclick="setRate(this)">0.5%</button>
                    <button class="toggle-btn active" data-rate="0.0075" onclick="setRate(this)">0.75%</button>
                    <button class="toggle-btn" data-rate="0.01" onclick="setRate(this)">1%</button>
                    <button class="toggle-btn" data-rate="0.02" onclick="setRate(this)">2%</button>
                    <button class="toggle-btn" data-rate="0.025" onclick="setRate(this)">2.5%</button>
                </div>
            </div>

            <div class="divider"></div>
            <div class="section-title">Your Results</div>

            <div class="results-grid">
                <div class="result-item">
                    <div class="label">Your Investment</div>
                    <div class="value" id="r-investment">$199</div>
                </div>
                <div class="result-item">
                    <div class="label">Households Reached</div>
                    <div class="value" id="r-households">5,000</div>
                </div>
                <div class="result-item">
                    <div class="label">Cost Per Household</div>
                    <div class="value" id="r-cost-per">$0.04</div>
                </div>
                <div class="result-item result-highlight">
                    <div class="label" id="r-customers-label">New Customers (0.75% response)</div>
                    <div class="value" id="r-customers">38</div>
                </div>
                <div class="result-item result-highlight">
                    <div class="label">Estimated Revenue</div>
                    <div class="value" id="r-revenue">$22,500</div>
                </div>
                <div class="result-item">
                    <div class="label">Cost Per New Customer</div>
                    <div class="value" id="r-cpc">$5.24</div>
                </div>
                <div class="result-roi">
                    <div class="label">Estimated Return on Investment</div>
                    <div class="value" id="r-roi">11,206%</div>
                    <div class="sub" id="r-roi-sub">Based on a 0.75% response rate</div>
                </div>
            </div>

            <div class="divider"></div>
            <div class="section-title">How Direct Mail Compares</div>

            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Channel</th>
                        <th>Cost / 1,000 Impressions</th>
                        <th>Cost / New Customer</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="highlight-row">
                        <td class="channel-name">Direct Mail (LBS)</td>
                        <td id="cmp-dm-cpm">$39.80</td>
                        <td id="cmp-dm-cpc">$5.24</td>
                    </tr>
                    <tr>
                        <td class="channel-name">Google Ads</td>
                        <td>$20 &ndash; $50</td>
                        <td>$50 &ndash; $150</td>
                    </tr>
                    <tr>
                        <td class="channel-name">Facebook Ads</td>
                        <td>$10 &ndash; $30</td>
                        <td>$30 &ndash; $100</td>
                    </tr>
                    <tr>
                        <td class="channel-name">Local Newspaper</td>
                        <td>$30 &ndash; $80</td>
                        <td>$75 &ndash; $200+</td>
                    </tr>
                </tbody>
            </table>
            <p style="font-size:0.75rem; color:#94a3b8; margin-top:10px;">* Digital ad estimates based on industry averages for local service businesses. Direct mail uses your selected response rate.</p>
        </div>
    </div>

    <!-- CTA -->
    <div class="cta-section">
        <h2>Ready to See These Results?</h2>
        <p>Lock in your spot on the next Lowcountry Business Spotlight mailing.</p>
        <div class="cta-buttons">
            <a href="advertise.php" class="btn-primary">Reserve Your Spot</a>
            <a href="tel:843-212-2969" class="btn-secondary">&#x1f4de; (843) 212-2969</a>
        </div>
    </div>

    <?php include 'footer.php'; ?>

    <script>
        const pricingData = <?php echo json_encode($pricing); ?>;

        let currentReach = '5k';
        let currentSize = 'small';
        let currentRate = 0.0075;

        const reachValues = { '5k': 5000, '10k': 10000 };
        const reachLabels = { '5k': '5,000', '10k': '10,000' };

        function setReach(btn) {
            btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentReach = btn.dataset.reach;
            updateSizePrices();
            calculate();
        }

        function setSize(btn) {
            btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSize = btn.dataset.size;
            calculate();
        }

        function setRate(btn) {
            btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRate = parseFloat(btn.dataset.rate);
            calculate();
        }

        function updateSizePrices() {
            ['small', 'medium', 'large'].forEach(function(size) {
                var el = document.getElementById('price-' + size);
                if (pricingData[currentReach] && pricingData[currentReach][size]) {
                    el.textContent = '$' + pricingData[currentReach][size].price;
                }
            });
        }

        function formatMoney(n) {
            if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
            if (n >= 1) return '$' + n.toFixed(2);
            return '$' + n.toFixed(4);
        }

        function calculate() {
            var customerValue = parseFloat(document.getElementById('customer-value').value) || 0;
            var visits = parseInt(document.getElementById('lifetime-visits').value) || 1;
            var lifetimeValue = customerValue * visits;

            var price = pricingData[currentReach][currentSize].price;
            var households = reachValues[currentReach];
            var responseRate = currentRate;
            var newCustomers = Math.round(households * responseRate);
            var rateLabel = parseFloat((responseRate * 100).toFixed(2)) + '%';
            var revenue = newCustomers * lifetimeValue;
            var costPerHousehold = price / households;
            var costPerCustomer = newCustomers > 0 ? price / newCustomers : 0;
            var roi = price > 0 ? ((revenue - price) / price * 100) : 0;

            document.getElementById('r-investment').textContent = '$' + price;
            document.getElementById('r-households').textContent = reachLabels[currentReach];
            document.getElementById('r-cost-per').textContent = '$' + costPerHousehold.toFixed(4);
            document.getElementById('r-customers').textContent = newCustomers.toLocaleString();
            document.getElementById('r-revenue').textContent = formatMoney(revenue);
            document.getElementById('r-cpc').textContent = '$' + costPerCustomer.toFixed(2);

            document.getElementById('r-customers-label').textContent = 'New Customers (' + rateLabel + ' response)';

            var roiEl = document.getElementById('r-roi');
            roiEl.textContent = roi.toLocaleString('en-US', { maximumFractionDigits: 0 }) + '%';
            roiEl.className = 'value' + (roi < 0 ? ' negative' : '');
            document.getElementById('r-roi-sub').textContent = 'Based on a ' + rateLabel + ' response rate';

            // Update comparison table
            var cpm = (price / households * 1000);
            document.getElementById('cmp-dm-cpm').textContent = '$' + cpm.toFixed(2);
            document.getElementById('cmp-dm-cpc').textContent = '$' + costPerCustomer.toFixed(2);
        }

        document.getElementById('customer-value').addEventListener('input', calculate);
        document.getElementById('lifetime-visits').addEventListener('change', calculate);

        // Init
        updateSizePrices();
        calculate();
    </script>
</body>
</html>
