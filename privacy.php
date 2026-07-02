<?php require_once 'config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - <?= SITE_NAME ?></title>
    <meta name="description" content="Privacy Policy for Lowcountry Business Spotlight. Learn how we collect, use, and protect your information.">
    <link rel="canonical" href="<?= SITE_URL ?>/privacy.php">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
        <h1>Privacy Policy</h1>
        <p><?= SITE_NAME ?></p>
    </div>

    <div class="content">
        <div class="last-updated">Last updated: <?= date('F j, Y') ?></div>

        <p>Lowcountry Business Spotlight ("we," "us," or "our") operates the website at <?= SITE_URL ?> (the "Site"). This Privacy Policy explains how we collect, use, disclose, and protect your information when you visit the Site or use our services.</p>

        <h2>1. Information We Collect</h2>

        <p><strong>Information you provide directly:</strong></p>
        <ul>
            <li><strong>Account registration</strong> — Name, email address, phone number, and password.</li>
            <li><strong>Business listings</strong> — Business name, address, phone, email, website, description, photos, hours of operation, and social media links.</li>
            <li><strong>Contact forms and inquiries</strong> — Name, email, phone number, and message content.</li>
            <li><strong>Advertising reservations</strong> — Business information, contact details, and ad preferences.</li>
            <li><strong>Newsletter subscriptions</strong> — Email address.</li>
        </ul>

        <p><strong>Information collected automatically:</strong></p>
        <ul>
            <li><strong>Usage data</strong> — Pages visited, time spent on pages, referring URLs, and browser type.</li>
            <li><strong>Analytics</strong> — We use Google Analytics (GA4) to understand how visitors use the Site. Google Analytics collects information such as IP address (anonymized), device type, and browsing behavior.</li>
            <li><strong>Cookies</strong> — We use essential cookies for session management and authentication. Third-party services (Google Analytics, Facebook Pixel, Google Tag Manager) may set additional cookies for analytics and advertising purposes.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
            <li>Create and manage your account and business listings.</li>
            <li>Display your business information in our online directory.</li>
            <li>Process advertising reservations and deliver postcard campaigns.</li>
            <li>Respond to inquiries and provide customer support.</li>
            <li>Send newsletters and marketing communications (with your consent).</li>
            <li>Improve the Site, analyze usage patterns, and develop new features.</li>
            <li>Prevent fraud and ensure the security of our services.</li>
        </ul>

        <h2>3. How We Share Your Information</h2>
        <p><strong>Publicly displayed information:</strong> Business listing details (name, address, phone, email, website, photos, hours, description) are publicly visible in our directory. This is the core purpose of the service.</p>

        <p><strong>We may also share information with:</strong></p>
        <ul>
            <li><strong>Service providers</strong> — Third parties that help us operate the Site (hosting, email delivery, payment processing, printing services).</li>
            <li><strong>Analytics providers</strong> — Google Analytics and Facebook for website analytics and advertising performance.</li>
            <li><strong>Legal requirements</strong> — When required by law, court order, or to protect our rights and safety.</li>
        </ul>

        <p>We do <strong>not</strong> sell your personal information to third parties.</p>

        <h2>4. SMS and Text Messaging</h2>
        <p>We may send SMS text messages to phone numbers you provide through web forms on the Site (such as advertising inquiries, directory signup, and contact forms) or through our chat widget. SMS communications are used primarily for promotional and marketing messages about our services, account updates, and customer service replies.</p>
        <ul>
            <li><strong>Opt-in is voluntary and explicit.</strong> You are only enrolled in SMS communications when you check the SMS consent box on a web form and submit it, or when you initiate contact through the chat widget and provide your phone number. Consent is not a condition of purchase.</li>
            <li><strong>Message frequency varies.</strong> You may receive promotional messages from time to time, plus account or inquiry-related replies as needed.</li>
            <li><strong>Message and data rates may apply</strong> from your wireless carrier.</li>
            <li><strong>To opt out</strong>, reply <strong>STOP</strong> to any text message from us. You will receive a confirmation message and no further texts. For help, reply <strong>HELP</strong> or contact us using the information below.</li>
            <li><strong>No third-party sharing.</strong> SMS opt-in consent and the phone numbers collected for SMS purposes are <strong>not</strong> shared, sold, or transferred to third parties or affiliates for their marketing purposes. This includes opt-in data captured from web forms, the chat widget, and any other source on the Site.</li>
        </ul>
        <p>Information collected through web forms and the chat widget (name, email, phone number, message content) is processed and stored in our customer relationship management system, which is operated by LeadConnector (HighLevel) on our behalf. See LeadConnector's privacy policy at <a href="https://www.gohighlevel.com/privacy-policy" target="_blank" rel="noopener">gohighlevel.com/privacy-policy</a>.</p>

        <h2>5. Cookies and Tracking Technologies</h2>
        <p>The Site uses the following tracking technologies:</p>
        <ul>
            <li><strong>Google Analytics (GA4)</strong> — Website usage analytics.</li>
            <li><strong>Google Tag Manager</strong> — Tag management for analytics and marketing tools.</li>
            <li><strong>Facebook/Meta Pixel</strong> — Advertising conversion tracking and audience building.</li>
            <li><strong>Session cookies</strong> — Required for login and form functionality.</li>
        </ul>
        <p>You can control cookies through your browser settings. Disabling cookies may limit some functionality of the Site.</p>

        <h2>6. Data Security</h2>
        <p>We take reasonable measures to protect your information, including:</p>
        <ul>
            <li>Encrypted password storage (bcrypt hashing).</li>
            <li>Secure session management with HTTP-only cookies.</li>
            <li>CSRF protection on forms.</li>
            <li>Prepared database statements to prevent SQL injection.</li>
        </ul>
        <p>However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security of your data.</p>

        <h2>7. Your Rights and Choices</h2>
        <p>You have the right to:</p>
        <ul>
            <li><strong>Access</strong> your personal information through your account dashboard.</li>
            <li><strong>Update or correct</strong> your business listing and account information.</li>
            <li><strong>Delete your account</strong> — Contact us to request account deletion.</li>
            <li><strong>Unsubscribe</strong> from marketing emails at any time.</li>
            <li><strong>Opt out of analytics</strong> — Use browser settings or the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google Analytics opt-out browser add-on</a>.</li>
        </ul>

        <h2>8. Children's Privacy</h2>
        <p>The Site is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will delete it promptly.</p>

        <h2>9. Third-Party Links</h2>
        <p>The Site may contain links to third-party websites (business websites, social media profiles). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.</p>

        <h2>10. Data Retention</h2>
        <p>We retain your information for as long as your account is active or as needed to provide services. Business listing data remains in the directory until you request removal. We may retain certain information as required by law or for legitimate business purposes.</p>

        <h2>11. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Your continued use of the Site after changes constitutes acceptance of the revised policy.</p>

        <h2>12. California Privacy Rights</h2>
        <p>If you are a California resident, you may have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect and the right to request deletion. Contact us to exercise these rights.</p>

        <h2>13. Contact Us</h2>
        <p>If you have questions about this Privacy Policy or your personal data, contact us at:</p>
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
