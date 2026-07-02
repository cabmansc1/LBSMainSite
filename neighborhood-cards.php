<?php
/**
 * community-cards.php - Browse all open community cards
 */
require_once 'config.php';

$pageTitle = 'Neighborhood Cards - ' . SITE_NAME;
$pageDesc = 'Advertise your business on community mailer cards delivered to thousands of homes in the Lowcountry.';

$suggestMessage = '';
$suggestMessageType = '';

// Pick up flash message from PRG redirect
if (!empty($_SESSION['suggest_flash'])) {
    $suggestMessage = $_SESSION['suggest_flash'];
    $suggestMessageType = $_SESSION['suggest_flash_type'] ?? 'success';
    unset($_SESSION['suggest_flash'], $_SESSION['suggest_flash_type']);
}

// Handle lead capture form
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'card_inquiry') {
    if (!validateCSRFToken($_POST['csrf_token'] ?? '')) {
        $suggestMessage = 'Invalid request. Please try again.';
        $suggestMessageType = 'danger';
    } else {
        $leadName = sanitizeInput($_POST['name'] ?? '');
        $leadEmail = sanitizeEmail($_POST['email'] ?? '');
        $leadPhone = sanitizePhone($_POST['phone'] ?? '');

        if (!$leadName || !$leadEmail) {
            $suggestMessage = 'Please provide your name and email.';
            $suggestMessageType = 'danger';
        } else {
            try {
                // Notify admin
                $body = "New Neighborhood Card Inquiry:\n\n";
                $body .= "Name: {$leadName}\n";
                $body .= "Email: {$leadEmail}\n";
                if ($leadPhone) $body .= "Phone: {$leadPhone}\n";
                $body .= "\nSubmitted: " . date('M j, Y g:i A');
                $body .= "\nPage: Neighborhood Cards";
                sendSecureEmail(ADMIN_EMAIL, 'Neighborhood Card Inquiry from ' . $leadName, $body, $leadEmail);

                // PRG redirect
                $_SESSION['suggest_flash'] = 'Thanks, ' . htmlspecialchars($leadName) . '! We\'ll be in touch soon with more details.';
                $_SESSION['suggest_flash_type'] = 'success';
                header('Location: /neighborhood-cards/#contact');
                exit;
            } catch (Exception $e) {
                error_log("Card inquiry error: " . $e->getMessage());
                $suggestMessage = 'Something went wrong. Please try again or email us directly.';
                $suggestMessageType = 'danger';
            }
        }
    }
}

try {
    $db = getDB();

    // Release abandoned checkouts older than 5 minutes
    expireStalePendingOrders();

    $cards = $db->query("
        SELECT c.*,
            c.total_spots - COALESCE(SUM(CASE WHEN o.status IN ('pending','paid') THEN st.spots_used ELSE 0 END), 0) AS spots_remaining,
            COUNT(CASE WHEN o.status IN ('pending','paid') THEN 1 END) AS order_count
        FROM " . getTable('cards') . " c
        LEFT JOIN " . getTable('card_orders') . " o ON o.card_id = c.id
        LEFT JOIN " . getTable('card_spot_types') . " st ON st.id = o.spot_type_id
        WHERE c.status = 'open'
        GROUP BY c.id
        ORDER BY c.display_order ASC, c.print_deadline ASC
    ")->fetchAll(PDO::FETCH_ASSOC);

    // Also get spot type pricing for display
    $spotTypes = $db->query("SELECT * FROM " . getTable('card_spot_types') . " WHERE is_active = 1 ORDER BY display_order")->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $cards = [];
    $spotTypes = [];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?></title>
    <meta name="robots" content="noindex,nofollow">
    <meta name="description" content="<?= htmlspecialchars($pageDesc) ?>">
    <!-- Open Graph -->
    <meta property="og:title" content="<?= htmlspecialchars($pageTitle) ?>">
    <meta property="og:description" content="<?= htmlspecialchars($pageDesc) ?>">
    <meta property="og:url" content="<?= SITE_URL ?>/neighborhood-cards/">
    <meta property="og:type" content="website">

    <!-- GA4 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-38313KT3XE"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-38313KT3XE');gtag('config','AW-18077746446');</script>

    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-5ZP4TT23');</script>

    <!-- Meta Pixel -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '629481023248934');
    fbq('track', 'PageView');
    </script>
    <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=629481023248934&ev=PageView&noscript=1"
    /></noscript>

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; }

        .page-header {
            background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
            padding: 50px 20px;
            text-align: center;
            color: white;
        }
        .page-header h1 { font-size: clamp(2rem, 5vw, 2.75rem); font-weight: 800; margin-bottom: 12px; }
        .page-header p { font-size: 1.15rem; opacity: 0.85; max-width: 650px; margin: 0 auto; line-height: 1.6; }

        .container { max-width: 1100px; margin: 0 auto; padding: 40px 20px; }

        .section-title { font-size: 1.4rem; font-weight: 700; margin-bottom: 8px; }
        .section-sub { color: #64748b; margin-bottom: 32px; line-height: 1.5; }

        /* ── Available Cards Section ── */
        .cards-section {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 36px;
            margin-bottom: 48px;
            box-shadow: 0 4px 20px rgba(0,0,0,.04);
        }
        .cards-section .section-title { margin-bottom: 4px; }
        .cards-section .section-sub { margin-bottom: 24px; }

        .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }

        .card {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 14px;
            overflow: hidden;
            transition: all 0.25s ease;
            position: relative;
        }
        .card:hover {
            border-color: #38b6ff;
            transform: translateY(-3px);
            box-shadow: 0 12px 32px rgba(56,182,255,.12);
        }

        .card-top {
            padding: 20px 22px 16px;
            border-bottom: 1px solid #e2e8f0;
            position: relative;
        }
        .card-neighborhood {
            font-size: 1.2rem;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 2px;
        }
        .card-homes {
            font-size: 0.85rem;
            color: #64748b;
            font-weight: 500;
        }
        .card-homes-icon {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .card-badge {
            position: absolute;
            top: 16px;
            right: 16px;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        .card-badge.hot { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .card-badge.new { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }

        .card-body { padding: 16px 22px; }

        .card-stats-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 14px;
        }
        .card-mini-stat {
            text-align: center;
            padding: 10px 4px;
            background: white;
            border-radius: 8px;
            border: 1px solid #f1f5f9;
        }
        .card-mini-stat-value {
            font-size: 1.1rem;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.2;
        }
        .card-mini-stat-value.urgency { color: #dc2626; }
        .card-mini-stat-value.ok { color: #059669; }
        .card-mini-stat-label {
            font-size: 0.68rem;
            color: #94a3b8;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.03em;
            margin-top: 2px;
        }

        .progress-bar {
            height: 6px;
            background: #e5e7eb;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 4px;
        }
        .progress-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
        .progress-fill.green { background: linear-gradient(90deg, #22c55e, #16a34a); }
        .progress-fill.yellow { background: linear-gradient(90deg, #f59e0b, #d97706); }
        .progress-fill.red { background: linear-gradient(90deg, #ef4444, #dc2626); }
        .progress-label {
            font-size: 0.75rem;
            color: #94a3b8;
            text-align: right;
            font-weight: 500;
        }

        .card-footer { padding: 0 22px 20px; }
        .btn-buy {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 13px;
            text-align: center;
            background: linear-gradient(135deg, #ff8c00, #e67700);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 0.95rem;
            font-weight: 700;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-buy:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(255,140,0,.3);
        }
        .btn-buy svg { flex-shrink: 0; }

        /* ── Pricing Section ── */
        .pricing-section {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 36px;
            margin-bottom: 48px;
            box-shadow: 0 4px 20px rgba(0,0,0,.04);
        }

        .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .price-card {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px 16px;
            text-align: center;
            transition: all 0.2s;
        }
        .price-card:hover { border-color: #38b6ff; background: #f0f9ff; }
        .price-name { font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; color: #0f172a; }
        .price-dims { font-size: 0.78rem; color: #94a3b8; margin-bottom: 10px; }
        .price-amount { font-size: 1.6rem; font-weight: 800; color: #0ea5e9; }

        /* ── How It Works ── */
        .how-section {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 36px;
            margin-bottom: 48px;
            box-shadow: 0 4px 20px rgba(0,0,0,.04);
        }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
        .step {
            text-align: center;
            padding: 8px;
            position: relative;
        }
        .step-num {
            display: inline-flex;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
            color: white;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 1.1rem;
            margin-bottom: 14px;
            box-shadow: 0 4px 12px rgba(56,182,255,.25);
        }
        .step h3 { font-size: 1rem; font-weight: 700; margin-bottom: 6px; color: #0f172a; }
        .step p { font-size: 0.88rem; color: #64748b; line-height: 1.5; }

        .empty-state { text-align: center; padding: 60px 20px; color: #64748b; }
        .empty-state h2 { font-size: 1.3rem; margin-bottom: 12px; color: #334155; }

        @media (max-width: 768px) {
            .cards-grid { grid-template-columns: 1fr; }
            .pricing-grid { grid-template-columns: repeat(2, 1fr); }
            .steps { grid-template-columns: 1fr; gap: 20px; }
            .cards-section, .pricing-section, .how-section { padding: 24px 20px; }
            .card-stats-row { grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        }
        @media (max-width: 480px) {
            .pricing-grid { grid-template-columns: 1fr 1fr; }
        }
    </style>
</head>
<body>
    <!-- GTM noscript -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5ZP4TT23"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

    <?php include 'header.php'; ?>

    <div class="page-header">
        <h1>Neighborhood Cards</h1>
        <p>Target the neighborhoods that matter most to your business with a shared mailer card — delivered directly to mailboxes at a fraction of the cost of a solo mailing.</p>
    </div>

    <div style="background: #fff7ed; border-bottom: 1px solid #fed7aa; padding: 12px 20px; text-align: center; font-size: 0.9rem; color: #9a3412;">
        Need bigger reach? Our <a href="/advertise.php" style="color: #9a3412; font-weight: 700; text-decoration: underline;">Spotlight Postcards</a> reach 5,000-10,000 homes with exclusive placement and free ad design. <a href="/compare/" style="color: #9a3412; font-weight: 600;">Compare products &rarr;</a>
    </div>

    <div class="container">

        <!-- Card Preview Carousel -->
        <div class="carousel-wrapper" style="max-width: 720px; margin: 0 auto 24px; position: relative;">
            <div class="carousel-track" style="overflow: hidden; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,.1);">
                <div class="carousel-slides" style="display: flex; transition: transform 0.4s ease;">
                    <img src="/images/Pricing%20149%20Example.png" alt="Neighborhood community card front with $149 ad spot pricing examples" style="min-width: 100%; width: 100%; height: auto; display: block;">
                    <img src="/images/Example%20Layout.png" alt="Neighborhood community card front example with sample business ads" style="min-width: 100%; width: 100%; height: auto; display: block;">
                    <img src="/images/Pricing%20and%20layout.png" alt="Neighborhood community card back showing spot sizes and pricing - Quad $469, Double $279, Single $149, Coupon $79" style="min-width: 100%; width: 100%; height: auto; display: block;">
                </div>
            </div>
            <button class="carousel-btn carousel-prev" onclick="moveCarousel(-1)" aria-label="Previous slide" style="position: absolute; top: 50%; left: -16px; transform: translateY(-50%); width: 36px; height: 36px; border-radius: 50%; border: none; background: white; box-shadow: 0 2px 8px rgba(0,0,0,.15); cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; color: #334155;">&#10094;</button>
            <button class="carousel-btn carousel-next" onclick="moveCarousel(1)" aria-label="Next slide" style="position: absolute; top: 50%; right: -16px; transform: translateY(-50%); width: 36px; height: 36px; border-radius: 50%; border: none; background: white; box-shadow: 0 2px 8px rgba(0,0,0,.15); cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; color: #334155;">&#10095;</button>
            <div class="carousel-dots" style="display: flex; justify-content: center; gap: 8px; margin-top: 12px;">
                <button onclick="goToSlide(0)" class="carousel-dot active" aria-label="Slide 1" style="width: 10px; height: 10px; border-radius: 50%; border: none; background: #38b6ff; cursor: pointer; padding: 0; transition: background 0.2s;"></button>
                <button onclick="goToSlide(1)" class="carousel-dot" aria-label="Slide 2" style="width: 10px; height: 10px; border-radius: 50%; border: none; background: #cbd5e1; cursor: pointer; padding: 0; transition: background 0.2s;"></button>
                <button onclick="goToSlide(2)" class="carousel-dot" aria-label="Slide 3" style="width: 10px; height: 10px; border-radius: 50%; border: none; background: #cbd5e1; cursor: pointer; padding: 0; transition: background 0.2s;"></button>
            </div>
        </div>
        <script>
        (function() {
            var currentSlide = 0;
            var totalSlides = 3;
            var autoTimer = setInterval(function() { moveCarousel(1); }, 5000);

            function resetTimer() { clearInterval(autoTimer); autoTimer = setInterval(function() { moveCarousel(1); }, 5000); }

            window.moveCarousel = function(dir) {
                currentSlide = (currentSlide + dir + totalSlides) % totalSlides;
                updateCarousel();
                resetTimer();
            };
            window.goToSlide = function(i) {
                currentSlide = i;
                updateCarousel();
                resetTimer();
            };

            function updateCarousel() {
                document.querySelector('.carousel-slides').style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
                document.querySelectorAll('.carousel-dot').forEach(function(dot, i) {
                    dot.style.background = i === currentSlide ? '#38b6ff' : '#cbd5e1';
                    dot.className = i === currentSlide ? 'carousel-dot active' : 'carousel-dot';
                });
            }
        })();
        </script>

        <!-- Standard Pricing for 2,500 homes -->
        <?php
            $standardTier = CARD_PRICING_TIERS[count(CARD_PRICING_TIERS) - 1]; // 2,000-2,500 tier
        ?>
        <div class="pricing-section" style="text-align: center;">
            <h2 class="section-title">Standard Pricing for a 2,500-Home Mailing</h2>
            <p class="section-sub" style="margin-bottom: 20px;">Smaller neighborhoods? Pricing adjusts based on household count — the fewer the homes, the lower the cost.</p>
            <div class="pricing-grid">
                <?php foreach ($spotTypes as $st):
                    $price = $standardTier['prices'][$st['name']] ?? $st['price_cents'];
                ?>
                <div class="price-card">
                    <div class="price-name"><?= htmlspecialchars($st['display_name']) ?></div>
                    <div class="price-dims"><?= htmlspecialchars($st['dimensions']) ?></div>
                    <div class="price-amount">$<?= number_format($price / 100) ?></div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>

        <?php /* Available Cards section hidden for now
        <?php if (!empty($cards)): ?>
            <div class="cards-section">
                <h2 class="section-title">Available Cards</h2>
                <p class="section-sub">Select a neighborhood to buy an ad spot.</p>

                <div class="cards-grid">
                    <?php foreach ($cards as $card):
                        $remaining = (float)$card['spots_remaining'];
                        $total = (float)$card['total_spots'];
                        $sold = $total - $remaining;
                        $fillPct = $total > 0 ? ($sold / $total) * 100 : 0;
                        $barClass = $fillPct >= 85 ? 'red' : ($fillPct >= 60 ? 'yellow' : 'green');
                        $deadline = new DateTime($card['print_deadline']);
                        $now = new DateTime();
                        $daysLeft = max(0, (int)$now->diff($deadline)->format('%r%a'));
                        $isHot = $fillPct >= 70 || $daysLeft <= 7;
                    ?>
                    <div class="card">
                        <div class="card-top">
                            <div class="card-neighborhood"><?= htmlspecialchars($card['neighborhood_name']) ?></div>
                            <div class="card-homes">
                                <span class="card-homes-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                    <?= number_format($card['households']) ?> households
                                </span>
                            </div>
                            <?php if ($isHot && $remaining > 0 && $daysLeft > 0): ?>
                                <span class="card-badge hot"><?= $fillPct >= 70 ? 'Filling Fast' : 'Ending Soon' ?></span>
                            <?php endif; ?>
                        </div>
                        <div class="card-body">
                            <div class="card-stats-row">
                                <div class="card-mini-stat">
                                    <div class="card-mini-stat-value <?= $remaining <= 2 ? 'urgency' : 'ok' ?>"><?= number_format($remaining, 0) ?></div>
                                    <div class="card-mini-stat-label">Spots Left</div>
                                </div>
                                <div class="card-mini-stat">
                                    <div class="card-mini-stat-value <?= $daysLeft <= 5 ? 'urgency' : '' ?>"><?= $daysLeft ?></div>
                                    <div class="card-mini-stat-label">Days Left</div>
                                </div>
                                <div class="card-mini-stat">
                                    <div class="card-mini-stat-value"><?= $deadline->format('M j') ?></div>
                                    <div class="card-mini-stat-label">Deadline</div>
                                </div>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill <?= $barClass ?>" style="width: <?= min(100, $fillPct) ?>%"></div>
                            </div>
                            <div class="progress-label"><?= round($fillPct) ?>% filled</div>
                        </div>
                        <div class="card-footer">
                            <?php if ($remaining > 0 && $daysLeft > 0): ?>
                                <a href="/neighborhood-card/<?= htmlspecialchars($card['slug']) ?>/" class="btn-buy">
                                    Buy a Spot
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                                </a>
                            <?php else: ?>
                                <span class="btn-buy" style="background: #94a3b8; cursor: default;"><?= $remaining <= 0 ? 'Sold Out' : 'Deadline Passed' ?></span>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php else: ?>
            <div class="cards-section">
                <div class="empty-state">
                    <h2>No cards available right now</h2>
                    <p>Check back soon — new neighborhood cards are added regularly.</p>
                </div>
            </div>
        <?php endif; ?>
        */ ?>

        <?php /* Pricing by Neighborhood Size table hidden for now
        <?php if (!empty($spotTypes)): ?>
        <div class="pricing-section">
            <h2 class="section-title">Pricing by Neighborhood Size</h2>
            <p class="section-sub">The fewer the homes, the lower the cost. Here's a full breakdown by tier.</p>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 12px 16px; text-align: left; font-size: 0.85rem; color: #374151; border-bottom: 1px solid #e2e8f0;">Spot Type</th>
                            <?php foreach (CARD_PRICING_TIERS as $tier): ?>
                            <th style="padding: 12px 16px; text-align: center; font-size: 0.85rem; color: #374151; border-bottom: 1px solid #e2e8f0;"><?= $tier['label'] ?></th>
                            <?php endforeach; ?>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($spotTypes as $st): ?>
                        <tr>
                            <td style="padding: 12px 16px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">
                                <?= htmlspecialchars($st['display_name']) ?>
                                <span style="display: block; font-size: 0.78rem; color: #94a3b8; font-weight: 400;"><?= htmlspecialchars($st['dimensions']) ?></span>
                            </td>
                            <?php foreach (CARD_PRICING_TIERS as $tier):
                                $price = $tier['prices'][$st['name']] ?? $st['price_cents'];
                            ?>
                            <td style="padding: 12px 16px; text-align: center; font-weight: 700; color: #0ea5e9; border-bottom: 1px solid #f1f5f9;">$<?= number_format($price / 100) ?></td>
                            <?php endforeach; ?>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        <?php endif; ?>
        */ ?>

        <!-- How It Works -->
        <div class="how-section" style="text-align: center;">
            <h2 class="section-title">How It Works</h2>
            <p class="section-sub" style="max-width: 500px; margin-left: auto; margin-right: auto;">Three simple steps to get your business on the card.</p>
            <div class="steps">
                <div class="step">
                    <div class="step-num">1</div>
                    <h3>Choose Your Spot</h3>
                    <p>Pick a neighborhood and ad size that works for your budget.</p>
                </div>
                <div class="step">
                    <div class="step-num">2</div>
                    <h3>Submit Your Ad</h3>
                    <p>Upload your logo, add a promo message, and we'll prepare your spot.</p>
                </div>
                <div class="step">
                    <div class="step-num">3</div>
                    <h3>Reach Homes</h3>
                    <p>Your ad is printed and mailed to thousands of local households.</p>
                </div>
            </div>
        </div>

        <!-- Lead Capture -->
        <div id="contact" style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,.04);">
            <h2 class="section-title">Interested in Advertising on a Neighborhood Card?</h2>
            <p class="section-sub" style="margin-bottom: 24px;">Drop your info below and we'll reach out with availability, pricing, and next steps.</p>

            <?php if ($suggestMessage): ?>
                <div style="padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-weight: 500; font-size: 0.92rem; max-width: 500px; margin-left: auto; margin-right: auto;
                    <?= $suggestMessageType === 'success' ? 'background: #dcfce7; border: 1px solid #22c55e; color: #166534;' : 'background: #fee2e2; border: 1px solid #ef4444; color: #991b1b;' ?>">
                    <?= $suggestMessage ?>
                </div>
            <?php endif; ?>

            <form method="POST" action="/neighborhood-cards/#contact" style="max-width: 500px; margin: 0 auto; text-align: left;">
                <input type="hidden" name="action" value="card_inquiry">
                <?php $csrf = generateCSRFToken(); ?>
                <input type="hidden" name="csrf_token" value="<?= $csrf ?>">

                <div style="margin-bottom: 14px;">
                    <label style="display: block; font-weight: 600; font-size: 0.88rem; margin-bottom: 4px; color: #374151;">Your Name *</label>
                    <input type="text" name="name" required placeholder="Jane Doe" style="width: 100%; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.95rem; font-family: inherit;">
                </div>
                <div style="margin-bottom: 14px;">
                    <label style="display: block; font-weight: 600; font-size: 0.88rem; margin-bottom: 4px; color: #374151;">Email *</label>
                    <input type="email" name="email" required placeholder="you@example.com" style="width: 100%; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.95rem; font-family: inherit;">
                </div>
                <!-- Phone field removed: SMS opt-in handled by chat widget only.
                <div style="margin-bottom: 14px;">
                    <label style="display: block; font-weight: 600; font-size: 0.88rem; margin-bottom: 4px; color: #374151;">Phone</label>
                    <input type="tel" name="phone" placeholder="(843) 555-1234" style="width: 100%; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.95rem; font-family: inherit;">
                </div>
                -->
                <button type="submit" style="display: block; width: 100%; padding: 14px; background: linear-gradient(135deg, #ff8c00, #e67700); color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s;">
                    Get Started
                </button>
                <p style="text-align: center; margin-top: 10px; font-size: 0.82rem; color: #94a3b8;">We'll get back to you within 1 business day.</p>
            </form>
        </div>

    </div>

    <?php include 'footer.php'; ?>
</body>
</html>
