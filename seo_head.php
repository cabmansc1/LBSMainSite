<?php
/**
 * Shared SEO <head> include.
 *
 * Usage: set $seo array, then `include 'seo_head.php';`
 * Each page is responsible for outputting its own <style> blocks and the closing </head>.
 *
 * $seo keys (all optional, sensible defaults applied):
 *   title, description, canonical, robots,
 *   og_type, og_title, og_description, og_image,
 *   og_image_width, og_image_height, og_image_alt,
 *   twitter_card, twitter_title, twitter_description, twitter_image,
 *   extra_jsonld (array of JSON-LD blocks; each may be a string or array)
 */

require_once __DIR__ . '/config.php';

$seo = array_merge([
    'title'              => SITE_NAME,
    'description'        => '',
    'canonical'          => SITE_URL . strtok($_SERVER['REQUEST_URI'] ?? '/', '?'),
    'robots'             => 'index,follow',
    'og_type'            => 'website',
    'og_title'           => null,
    'og_description'     => null,
    'og_image'           => SITE_URL . '/images/og-image.jpg',
    'og_image_width'     => null,
    'og_image_height'    => null,
    'og_image_alt'       => null,
    'twitter_card'       => 'summary_large_image',
    'twitter_title'      => null,
    'twitter_description'=> null,
    'twitter_image'      => null,
    'extra_jsonld'       => [],
], $seo ?? []);

// Resolve fallbacks
$_seo_og_title    = $seo['og_title']    ?? $seo['title'];
$_seo_og_desc     = $seo['og_description']    ?? $seo['description'];
$_seo_tw_title    = $seo['twitter_title']     ?? $_seo_og_title;
$_seo_tw_desc     = $seo['twitter_description'] ?? $_seo_og_desc;
$_seo_tw_image    = $seo['twitter_image']     ?? $seo['og_image'];

// Tracker IDs (single source of truth — change here to update sitewide once all pages migrate)
$GA4_ID         = 'G-38313KT3XE';
$GTM_ID         = 'GTM-5ZP4TT23';
$META_PIXEL_ID  = '629481023248934';
$GOOGLE_ADS_ID  = 'AW-18077746446';

// GSC verification: replace with actual code when verifying domain
$GSC_VERIFICATION = ''; // e.g. 'abc123XYZ_yourVerificationCode'
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title><?= htmlspecialchars($seo['title'], ENT_QUOTES, 'UTF-8') ?></title>
<meta name="description" content="<?= htmlspecialchars($seo['description'], ENT_QUOTES, 'UTF-8') ?>">
<?php if (!empty($seo['canonical'])): // null = deliberately no canonical (noindex pages) ?>
<link rel="canonical" href="<?= htmlspecialchars($seo['canonical'], ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>
<meta name="robots" content="<?= htmlspecialchars($seo['robots'], ENT_QUOTES, 'UTF-8') ?>">

<?php if ($GSC_VERIFICATION): ?>
<meta name="google-site-verification" content="<?= htmlspecialchars($GSC_VERIFICATION, ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>

<meta name="theme-color" content="#38b6ff">
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Shadows+Into+Light+Two&display=swap" rel="stylesheet">

<!-- Open Graph -->
<meta property="og:type" content="<?= htmlspecialchars($seo['og_type'], ENT_QUOTES, 'UTF-8') ?>">
<?php if (!empty($seo['canonical'])): ?>
<meta property="og:url" content="<?= htmlspecialchars($seo['canonical'], ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>
<meta property="og:title" content="<?= htmlspecialchars($_seo_og_title, ENT_QUOTES, 'UTF-8') ?>">
<meta property="og:description" content="<?= htmlspecialchars($_seo_og_desc, ENT_QUOTES, 'UTF-8') ?>">
<meta property="og:image" content="<?= htmlspecialchars($seo['og_image'], ENT_QUOTES, 'UTF-8') ?>">
<?php if (!empty($seo['og_image_width'])): ?>
<meta property="og:image:width" content="<?= (int)$seo['og_image_width'] ?>">
<?php endif; ?>
<?php if (!empty($seo['og_image_height'])): ?>
<meta property="og:image:height" content="<?= (int)$seo['og_image_height'] ?>">
<?php endif; ?>
<?php if (!empty($seo['og_image_alt'])): ?>
<meta property="og:image:alt" content="<?= htmlspecialchars($seo['og_image_alt'], ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>
<meta property="og:site_name" content="<?= htmlspecialchars(SITE_NAME, ENT_QUOTES, 'UTF-8') ?>">

<!-- Twitter -->
<meta name="twitter:card" content="<?= htmlspecialchars($seo['twitter_card'], ENT_QUOTES, 'UTF-8') ?>">
<?php if (!empty($seo['canonical'])): ?>
<meta name="twitter:url" content="<?= htmlspecialchars($seo['canonical'], ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>
<meta name="twitter:title" content="<?= htmlspecialchars($_seo_tw_title, ENT_QUOTES, 'UTF-8') ?>">
<meta name="twitter:description" content="<?= htmlspecialchars($_seo_tw_desc, ENT_QUOTES, 'UTF-8') ?>">
<meta name="twitter:image" content="<?= htmlspecialchars($_seo_tw_image, ENT_QUOTES, 'UTF-8') ?>">
<?php if (!empty($seo['og_image_alt'])): ?>
<meta name="twitter:image:alt" content="<?= htmlspecialchars($seo['og_image_alt'], ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>

<!-- Page-specific JSON-LD -->
<?php foreach ((array)$seo['extra_jsonld'] as $_seo_jsonld): ?>
<script type="application/ld+json"><?= is_string($_seo_jsonld) ? $_seo_jsonld : json_encode($_seo_jsonld, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?></script>
<?php endforeach; ?>

<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=<?= $GA4_ID ?>"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '<?= $GA4_ID ?>');
  gtag('config', '<?= $GOOGLE_ADS_ID ?>');
</script>

<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','<?= $GTM_ID ?>');</script>

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
fbq('init', '<?= $META_PIXEL_ID ?>');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=<?= $META_PIXEL_ID ?>&ev=PageView&noscript=1"
/></noscript>
<!-- End trackers -->
