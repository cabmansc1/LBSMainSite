<?php
/**
 * Upcoming Mailers - Public Page with Countdown Timers
 */
require_once 'config.php';

try {
    $db = getDB();

    // Get active mailers that haven't passed their deadline
    $stmt = $db->query("
        SELECT * FROM upcoming_mailers
        WHERE status = 'active'
        ORDER BY display_order ASC, deadline_date ASC
    ");
    $mailers = $stmt->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    $mailers = [];
    error_log("Upcoming mailers error: " . $e->getMessage());
}

$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
$seo['robots'] = 'noindex, nofollow'; // preserved from the original head
include __DIR__ . '/seo_head.php';
?>
    <style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: 'Inter', sans-serif;
        line-height: 1.6;
        color: #333;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        min-height: 100vh;
    }

    /* Page Header */
    .page-header {
        background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
        padding: 30px 20px;
        text-align: center;
        color: white;
    }

    .page-header h1 {
        font-size: clamp(1.5rem, 4vw, 2rem);
        font-weight: 800;
        margin-bottom: 8px;
    }

    .page-header p {
        font-size: 1rem;
        opacity: 0.95;
        max-width: 600px;
        margin: 0 auto;
    }

    /* Main Container */
    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 40px 20px;
    }

    /* Mailer Grid - two cards side by side */
    .mailer-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 28px;
        margin-bottom: 40px;
    }

    /* Mailer Card */
    .mailer-card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
        border: 1px solid #e2e8f0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: transform 0.25s ease, box-shadow 0.25s ease;
    }

    .mailer-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.1);
    }

    .mailer-card.urgent {
        border: 2px solid #ef4444;
    }

    .mailer-card.urgent .card-header {
        background: linear-gradient(135deg, #ef4444, #dc2626);
    }

    .card-header {
        background: linear-gradient(135deg, #38b6ff, #0ea5e9);
        padding: 22px 24px;
        color: white;
    }

    .card-header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 15px;
        flex-wrap: wrap;
    }

    .mailer-title {
        font-size: 1.35rem;
        font-weight: 800;
        margin-bottom: 4px;
        line-height: 1.25;
    }

    .mailer-subtitle {
        font-size: 0.9rem;
        opacity: 0.9;
    }

    .spots-badge {
        background: rgba(0, 0, 0, 0.2);
        padding: 6px 14px;
        border-radius: 30px;
        font-weight: 700;
        font-size: 0.85rem;
        white-space: nowrap;
    }

    .spots-badge.low {
        background: #fbbf24;
        color: #000;
    }

    .spots-badge.critical {
        background: #ef4444;
        color: white;
        animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }

    .card-body {
        padding: 24px;
        display: flex;
        flex-direction: column;
        flex: 1;
    }

    /* Countdown Timer */
    .countdown-section {
        text-align: center;
        margin-bottom: 22px;
    }

    .countdown-label {
        font-size: 0.78rem;
        color: #64748b;
        font-weight: 600;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .countdown-timer {
        display: flex;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .countdown-block {
        background: linear-gradient(135deg, #1e293b, #0f172a);
        color: white;
        padding: 12px 14px;
        border-radius: 6px;
        min-width: 64px;
        text-align: center;
    }

    .countdown-number {
        font-size: 1.5rem;
        font-weight: 800;
        line-height: 1;
        font-family: 'Inter', monospace;
        font-variant-numeric: tabular-nums;
    }

    .countdown-unit {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        opacity: 0.8;
        margin-top: 5px;
    }

    .countdown-expired {
        background: #fee2e2;
        color: #991b1b;
        padding: 15px 25px;
        border-radius: 6px;
        font-weight: 700;
        font-size: 1.1rem;
    }

    /* Info Grid */
    .info-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 22px;
    }

    .info-item {
        text-align: center;
        padding: 12px 8px;
        background: #f8fafc;
        border-radius: 6px;
    }

    .info-value {
        font-size: 1.15rem;
        font-weight: 800;
        color: #0ea5e9;
        margin-bottom: 3px;
        line-height: 1.2;
    }

    .info-label {
        font-size: 0.75rem;
        color: #64748b;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    /* Description */
    .mailer-description {
        color: #475569;
        margin-bottom: 22px;
        font-size: 0.95rem;
        line-height: 1.6;
    }

    /* Progress Bar */
    .spots-progress {
        margin-bottom: 22px;
    }

    .spots-progress-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 0.85rem;
    }

    .spots-progress-label {
        font-weight: 600;
        color: #374151;
    }

    .spots-progress-count {
        color: #64748b;
    }

    .spots-bar {
        height: 10px;
        background: #e5e7eb;
        border-radius: 3px;
        overflow: hidden;
    }

    .spots-fill {
        height: 100%;
        background: linear-gradient(135deg, #22c55e, #16a34a);
        border-radius: 3px;
        transition: width 0.5s ease;
    }

    .spots-fill.low {
        background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    .spots-fill.critical {
        background: linear-gradient(135deg, #ef4444, #dc2626);
    }

    /* CTA Button */
    .cta-button {
        display: block;
        background: linear-gradient(135deg, #ff8c00, #ff6b00);
        color: white;
        text-align: center;
        padding: 14px 24px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 700;
        font-size: 1rem;
        transition: all 0.25s ease;
        box-shadow: 0 6px 18px rgba(234, 88, 12, 0.25);
        margin-top: auto;
    }

    .cta-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 28px rgba(234, 88, 12, 0.35);
    }

    /* Empty State */
    .empty-state {
        text-align: center;
        padding: 80px 20px;
        background: white;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
    }

    .empty-state-icon {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #38b6ff, #0ea5e9);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
    }

    .empty-state-icon svg {
        width: 40px;
        height: 40px;
        fill: white;
    }

    .empty-state h2 {
        font-size: 1.5rem;
        color: #1e293b;
        margin-bottom: 10px;
    }

    .empty-state p {
        color: #64748b;
        margin-bottom: 25px;
    }

    /* Contact Section */
    .contact-section {
        text-align: center;
        padding: 40px 20px;
        background: white;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        margin-top: 40px;
        box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
    }

    .contact-section h2 {
        font-size: 1.5rem;
        margin-bottom: 15px;
        color: #1e293b;
    }

    .contact-section p {
        color: #64748b;
        margin-bottom: 20px;
    }

    .contact-links {
        display: flex;
        justify-content: center;
        gap: 20px;
        flex-wrap: wrap;
    }

    .contact-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #38b6ff;
        text-decoration: none;
        font-weight: 600;
        font-size: 1.1rem;
    }

    .contact-link:hover {
        text-decoration: underline;
    }

    /* Footer */
    .page-footer {
        text-align: center;
        padding: 30px 20px;
        color: #64748b;
        font-size: 0.9rem;
    }

    .page-footer a {
        color: #38b6ff;
        text-decoration: none;
    }

    /* Responsive */
    @media (max-width: 900px) {
        .mailer-grid {
            grid-template-columns: 1fr;
            gap: 24px;
        }
    }

    @media (max-width: 768px) {
        .card-header {
            padding: 18px 20px;
        }

        .mailer-title {
            font-size: 1.2rem;
        }

        .card-body {
            padding: 20px;
        }

        .countdown-block {
            min-width: 60px;
            padding: 10px 12px;
        }

        .countdown-number {
            font-size: 1.4rem;
        }
    }
    </style>
</head>
<body>
    <?php include 'header.php'; ?>

    <!-- Page Header -->
    <div class="page-header">
        <h1>Upcoming Spotlight Postcard Mailings</h1>
        <p>Reserve your spot on our next 9x12 postcard campaign before registration closes!</p>
    </div>

    <div class="container">
        <?php if (empty($mailers)): ?>
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                </div>
                <h2>No Upcoming Mailings Right Now</h2>
                <p>Check back soon for our next postcard campaign, or contact us to get notified!</p>
                <a href="advertise.php" class="cta-button" style="display: inline-block;">Contact Us About Advertising</a>
            </div>
        <?php else: ?>
            <div class="mailer-grid">
            <?php foreach ($mailers as $mailer):
                $deadline = new DateTime($mailer['deadline_date']);
                $now = new DateTime();
                $isPast = $deadline < $now;
                $diff = $now->diff($deadline);
                $totalHours = ($diff->days * 24) + $diff->h;
                $isUrgent = !$isPast && $totalHours < 72; // Less than 3 days

                $spotsPercent = $mailer['spots_total'] > 0 ? ($mailer['spots_remaining'] / $mailer['spots_total']) * 100 : 0;
                $spotsClass = '';
                $spotsBadgeClass = '';
                if ($spotsPercent <= 25) {
                    $spotsClass = 'critical';
                    $spotsBadgeClass = 'critical';
                } elseif ($spotsPercent <= 50) {
                    $spotsClass = 'low';
                    $spotsBadgeClass = 'low';
                }
            ?>
                <div class="mailer-card <?php echo $isUrgent ? 'urgent' : ''; ?>">
                    <div class="card-header">
                        <div class="card-header-top">
                            <div>
                                <h2 class="mailer-title"><?php echo htmlspecialchars($mailer['title']); ?></h2>
                                <?php if ($mailer['mail_date']): ?>
                                    <div class="mailer-subtitle">Mails on <?php echo date('F j, Y', strtotime($mailer['mail_date'])); ?></div>
                                <?php endif; ?>
                            </div>
                            <div class="spots-badge <?php echo $spotsBadgeClass; ?>">
                                <?php echo $mailer['spots_remaining']; ?> Spot<?php echo $mailer['spots_remaining'] != 1 ? 's' : ''; ?> Left
                            </div>
                        </div>
                    </div>

                    <div class="card-body">
                        <!-- Countdown Timer -->
                        <div class="countdown-section">
                            <div class="countdown-label"><?php echo htmlspecialchars($mailer['deadline_label']); ?></div>
                            <?php if ($isPast): ?>
                                <div class="countdown-expired">Registration Closed</div>
                            <?php else: ?>
                                <div class="countdown-timer" data-deadline="<?php echo $mailer['deadline_date']; ?>">
                                    <div class="countdown-block">
                                        <div class="countdown-number" data-days>--</div>
                                        <div class="countdown-unit">Days</div>
                                    </div>
                                    <div class="countdown-block">
                                        <div class="countdown-number" data-hours>--</div>
                                        <div class="countdown-unit">Hours</div>
                                    </div>
                                    <div class="countdown-block">
                                        <div class="countdown-number" data-minutes>--</div>
                                        <div class="countdown-unit">Minutes</div>
                                    </div>
                                    <div class="countdown-block">
                                        <div class="countdown-number" data-seconds>--</div>
                                        <div class="countdown-unit">Seconds</div>
                                    </div>
                                </div>
                            <?php endif; ?>
                        </div>

                        <!-- Info Grid -->
                        <div class="info-grid">
                            <?php if ($mailer['households']): ?>
                                <div class="info-item">
                                    <div class="info-value"><?php echo number_format($mailer['households']); ?></div>
                                    <div class="info-label">Households</div>
                                </div>
                            <?php endif; ?>
                            <div class="info-item">
                                <div class="info-value">$<?php echo number_format($mailer['price_from']); ?></div>
                                <div class="info-label">Starting At</div>
                            </div>
                            <div class="info-item">
                                <div class="info-value"><?php echo $mailer['spots_remaining']; ?>/<?php echo $mailer['spots_total']; ?></div>
                                <div class="info-label">Spots Available</div>
                            </div>
                        </div>

                        <?php if ($mailer['description']): ?>
                            <p class="mailer-description"><?php echo nl2br(htmlspecialchars($mailer['description'])); ?></p>
                        <?php endif; ?>

                        <!-- Spots Progress -->
                        <div class="spots-progress">
                            <div class="spots-progress-header">
                                <span class="spots-progress-label">Availability</span>
                                <span class="spots-progress-count"><?php echo $mailer['spots_remaining']; ?> of <?php echo $mailer['spots_total']; ?> spots remaining</span>
                            </div>
                            <div class="spots-bar">
                                <div class="spots-fill <?php echo $spotsClass; ?>" style="width: <?php echo $spotsPercent; ?>%"></div>
                            </div>
                        </div>

                        <?php if (!$isPast): ?>
                            <a href="advertise.php" class="cta-button">Reserve Your Spot Now</a>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <!-- Contact Section -->
        <div class="contact-section">
            <h2>Questions About Our Mailings?</h2>
            <p>We're here to help you choose the right advertising package for your business.</p>
            <div class="contact-links">
                <a href="tel:8432122969" class="contact-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
                    (843) 212-2969
                </a>
                <a href="mailto:hello@lbspotlight.com" class="contact-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    hello@lbspotlight.com
                </a>
            </div>
        </div>
    </div>

    <?php include 'footer.php'; ?>

    <script>
        // Countdown Timer Logic
        function updateCountdowns() {
            const timers = document.querySelectorAll('.countdown-timer');

            timers.forEach(timer => {
                const deadline = new Date(timer.dataset.deadline).getTime();
                const now = new Date().getTime();
                const diff = deadline - now;

                if (diff <= 0) {
                    timer.innerHTML = '<div class="countdown-expired">Registration Closed</div>';
                    return;
                }

                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                const daysEl = timer.querySelector('[data-days]');
                const hoursEl = timer.querySelector('[data-hours]');
                const minutesEl = timer.querySelector('[data-minutes]');
                const secondsEl = timer.querySelector('[data-seconds]');

                if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
                if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
                if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
                if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
            });
        }

        // Update immediately and then every second
        updateCountdowns();
        setInterval(updateCountdowns, 1000);
    </script>
</body>
</html>
