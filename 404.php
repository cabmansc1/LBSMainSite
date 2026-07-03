<?php
require_once __DIR__ . '/config.php';
http_response_code(404);

$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
include __DIR__ . '/seo_head.php';
?>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; }
        .error-page {
            min-height: 60vh; display: flex; align-items: center; justify-content: center;
            text-align: center; padding: 60px 20px;
        }
        .error-content { max-width: 560px; }
        .error-code {
            font-size: 6rem; font-weight: 900; line-height: 1;
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            background-clip: text; margin-bottom: 16px;
        }
        .error-content h1 { font-size: 1.75rem; font-weight: 800; color: #1e293b; margin-bottom: 12px; }
        .error-content p { font-size: 1.05rem; color: #64748b; line-height: 1.6; margin-bottom: 32px; }
        .error-links { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .error-links a {
            padding: 12px 24px; border-radius: 10px; text-decoration: none;
            font-weight: 600; font-size: .95rem; transition: all .2s;
        }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(56,182,255,.4); }
        .btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .btn-secondary:hover { background: #e2e8f0; }
        @media (max-width: 480px) {
            .error-code { font-size: 4rem; }
            .error-links { flex-direction: column; }
            .error-links a { width: 100%; text-align: center; }
        }
    </style>
</head>
<body>
    <?php include 'header.php'; ?>

    <div class="error-page">
        <div class="error-content">
            <div class="error-code">404</div>
            <h1>Page Not Found</h1>
            <p>Sorry, the page you're looking for doesn't exist or has been moved. Try one of the links below to get back on track.</p>
            <div class="error-links">
                <a href="/" class="btn-primary">Go Home</a>
                <a href="/directory/" class="btn-secondary">Business Directory</a>
                <a href="/advertise.php" class="btn-secondary">Advertise With Us</a>
                <a href="/contact.php" class="btn-secondary">Contact Us</a>
            </div>
        </div>
    </div>

    <?php include 'footer.php'; ?>
</body>
</html>
