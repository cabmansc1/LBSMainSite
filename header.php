<meta name="theme-color" content="#38b6ff">
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Shadows+Into+Light+Two&display=swap" rel="stylesheet">
<div class="logo-header">
  <div class="logo-header-inner">
    <p class="brand-wordmark">
      <a href="/">
        <span class="lowcountry">Lowcountry</span>
        <span class="business">Business</span>
        <span class="spotlight">Spotlight</span>
      </a>
    </p>
    <p class="brand-tagline">Bringing Local Businesses Together To Share The Cost of Advertising</p>
  </div>
</div>

<?php include __DIR__ . '/nav.php'; ?>

<style>
/* ===== SHARED LOGO HEADER ===== */
.logo-header {
  background: #000;
  padding: 15px 0;
  border-bottom: 1px solid #1a1a1a;
}
.logo-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
  text-align: center;
}
.brand-wordmark {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-weight: 800;
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  margin: 0;
  line-height: 1.2;
}
.brand-wordmark a {
  text-decoration: none;
}
.brand-wordmark .lowcountry { color: #38b6ff; }
.brand-wordmark .business { color: white; margin: 0 8px; }
.brand-wordmark .spotlight { color: #38b6ff; }
.brand-tagline {
  font-family: 'Shadows Into Light Two', cursive;
  font-size: clamp(12px, 1.8vw, 16px);
  color: #94a3b8;
  margin-top: 6px;
  font-weight: 400;
}

@media (max-width: 768px) {
  .logo-header { padding: 10px 0; }
  .logo-header-inner { padding: 0 16px; }
  .brand-wordmark { font-size: 1.5rem; line-height: 1.1; }
  .brand-tagline { font-size: 11px; margin-top: 4px; }
}
</style>
