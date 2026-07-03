<?php
require_once __DIR__ . '/config.php';
$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
include __DIR__ . '/seo_head.php';
?>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; color: #334155; background: #f8fafc; line-height: 1.7; }
        .page-header { background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%); padding: 50px 20px; text-align: center; color: white; }
        .page-header h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 8px; }
        .page-header p { opacity: 0.7; font-size: 0.95rem; }
        .content { max-width: 800px; margin: 0 auto; padding: 40px 20px 60px; }
        .content h2 { font-size: 1.3rem; font-weight: 700; color: #1e293b; margin: 32px 0 12px; }
        .content h2:first-of-type { margin-top: 0; }
        .content p, .content li { font-size: 0.95rem; color: #475569; margin-bottom: 12px; }
        .content ul { padding-left: 24px; margin-bottom: 16px; }
        .content li { margin-bottom: 6px; }
        .content a { color: #38b6ff; text-decoration: none; }
        .content a:hover { text-decoration: underline; }
        .last-updated { background: #e0f2fe; color: #0369a1; padding: 12px 20px; border-radius: 8px; font-size: 0.9rem; font-weight: 500; margin-bottom: 32px; }
        .page-footer { background: #1e293b; color: white; text-align: center; padding: 30px 20px; font-size: 0.9rem; }
        .page-footer a { color: #38b6ff; }
        .page-footer a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <?php include 'header.php'; ?>

    <div class="page-header">
        <h1>Terms and Conditions</h1>
        <p><?= SITE_NAME ?></p>
    </div>

    <div class="content">
        <div class="last-updated">Last updated: <?= date('F j, Y') ?></div>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using the Lowcountry Business Spotlight website ("Site") at <?= SITE_URL ?>, including our business directory, advertising services, and related tools, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the Site.</p>

        <h2>2. Description of Services</h2>
        <p>Lowcountry Business Spotlight provides:</p>
        <ul>
            <li><strong>Online Business Directory</strong> — Free and paid business listings for local businesses in the Charleston, SC area.</li>
            <li><strong>Direct Mail Advertising</strong> — Postcard-based marketing campaigns mailed to households in the Lowcountry region.</li>
            <li><strong>Related Services</strong> — Ad design, campaign management, and digital marketing tools.</li>
        </ul>

        <h2>3. User Accounts</h2>
        <p>To create a business listing, you must register for an account. You agree to:</p>
        <ul>
            <li>Provide accurate and complete information during registration.</li>
            <li>Keep your login credentials secure and confidential.</li>
            <li>Notify us immediately of any unauthorized use of your account.</li>
            <li>Be responsible for all activity under your account.</li>
        </ul>
        <p>We reserve the right to suspend or terminate accounts that violate these terms.</p>

        <h2>4. Business Listings</h2>
        <p>By submitting a business listing, you represent that:</p>
        <ul>
            <li>You are authorized to represent the business being listed.</li>
            <li>All information provided is accurate and not misleading.</li>
            <li>Your listing does not contain illegal, defamatory, or offensive content.</li>
        </ul>
        <p>We reserve the right to edit, remove, or refuse any listing at our sole discretion, with or without notice.</p>

        <h2>5. Advertising Services</h2>
        <p>For businesses participating in our direct mail postcard campaigns:</p>
        <ul>
            <li>Ad placement is subject to availability and our approval.</li>
            <li>We provide exclusive category placement per postcard — no direct competitors on the same mailing.</li>
            <li>Payment is due prior to the print deadline. Unpaid reservations may be released.</li>
            <li>We offer free ad design, but the final design must be approved before printing.</li>
            <li>Once a mailing is sent to print, cancellations and refunds are not available.</li>
        </ul>

        <h2>6. SMS and Text Messaging Communications</h2>
        <p>The Site offers a chat widget powered by LeadConnector that may collect your phone number when you initiate a conversation. By providing your phone number through the chat widget, you expressly consent to receive SMS text messages from Lowcountry Business Spotlight related to your inquiry, advertising campaigns, account, or business listing.</p>
        <ul>
            <li>SMS communications are not a condition of any purchase.</li>
            <li>Message and data rates may apply. Message frequency varies.</li>
            <li>You may opt out at any time by replying <strong>STOP</strong> to any text message. Reply <strong>HELP</strong> for assistance.</li>
            <li>The chat widget is the only mechanism by which we collect SMS opt-in. Phone numbers entered into business listing forms or directory account profiles are for public listing display purposes only and do not constitute SMS opt-in.</li>
        </ul>
        <p>For details on how we handle your data, see our <a href="/privacy.php">Privacy Policy</a>.</p>

        <h2>7. Fees and Payment</h2>
        <ul>
            <li>Basic directory listings are free. Premium features may require a paid subscription.</li>
            <li>Advertising fees are based on location, reach, and ad size as quoted at the time of reservation.</li>
            <li>All prices are in US dollars. Fees are non-refundable once services have been rendered or materials sent to print.</li>
        </ul>

        <h2>8. Intellectual Property</h2>
        <p>All content on this Site — including text, graphics, logos, images, and software — is the property of Lowcountry Business Spotlight or its content suppliers and is protected by copyright law.</p>
        <p>By uploading content (logos, photos, descriptions), you grant us a non-exclusive, royalty-free license to use that content in connection with our services, including online display and printed materials.</p>

        <h2>9. Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul>
            <li>Use the Site for any unlawful purpose.</li>
            <li>Submit false, misleading, or fraudulent information.</li>
            <li>Scrape, harvest, or collect data from the Site without permission.</li>
            <li>Interfere with the security or functionality of the Site.</li>
            <li>Impersonate another person or business.</li>
        </ul>

        <h2>10. Disclaimer of Warranties</h2>
        <p>The Site and all services are provided "as is" without warranties of any kind, either express or implied. We do not guarantee that the Site will be uninterrupted, error-free, or that any particular advertising campaign will achieve specific results.</p>

        <h2>11. Limitation of Liability</h2>
        <p>To the fullest extent permitted by law, Lowcountry Business Spotlight shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Site or services, including loss of profits, data, or business opportunities.</p>

        <h2>12. Indemnification</h2>
        <p>You agree to indemnify and hold harmless Lowcountry Business Spotlight, its owners, employees, and agents from any claims, losses, or damages arising from your use of the Site, violation of these terms, or infringement of any third-party rights.</p>

        <h2>13. Changes to Terms</h2>
        <p>We may update these Terms at any time. Changes will be posted on this page with an updated date. Continued use of the Site after changes constitutes acceptance of the revised terms.</p>

        <h2>14. Governing Law</h2>
        <p>These Terms are governed by the laws of the State of South Carolina. Any disputes shall be resolved in the courts of Charleston County, South Carolina.</p>

        <h2>15. Contact Us</h2>
        <p>If you have questions about these Terms, contact us at:</p>
        <p>
            Lowcountry Business Spotlight<br>
            PO Box 357<br>
            Huger, SC 29450<br>
            Email: <a href="mailto:<?= ADMIN_EMAIL ?>"><?= ADMIN_EMAIL ?></a><br>
            Phone: <a href="tel:8432122969">(843) 212-2969</a>
        </p>
    </div>

    <?php include 'footer.php'; ?>
</body>
</html>
