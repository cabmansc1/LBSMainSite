<?php
/**
 * Dynamic XML Sitemap Generator
 * Accessed via /sitemap.xml (rewritten by .htaccess)
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/admin/blog_functions.php';

header('Content-Type: application/xml; charset=UTF-8');
header('Cache-Control: public, max-age=3600');

$db = getDB();
ensureDirectoryTaxonomyTables();

// Emit a static URL with <lastmod> derived from the source file's mtime when available.
// $loc may be a path ("/foo.php"), an absolute URL, or empty (homepage).
$emitStatic = function($loc, $changefreq, $priority, $sourceFile = null) {
    $url = preg_match('#^https?://#', $loc) ? $loc : SITE_URL . $loc;
    $lastmodTag = '';
    if ($sourceFile) {
        $path = __DIR__ . '/' . ltrim($sourceFile, '/');
        if (file_exists($path)) {
            $lastmodTag = '<lastmod>' . date('Y-m-d', filemtime($path)) . '</lastmod>';
        }
    }
    echo '    <url><loc>' . htmlspecialchars($url) . '</loc>' . $lastmodTag
        . '<changefreq>' . $changefreq . '</changefreq><priority>' . $priority . "</priority></url>\n";
};

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
echo "\n    <!-- Static pages -->\n";
$emitStatic('/',                          'weekly',  '1.0', 'index.php');
$emitStatic('/directory',                 'daily',   '0.9', 'directory.php');
$emitStatic('/advertise.php',             'monthly', '0.6', 'advertise.php');
$emitStatic('/contact.php',               'monthly', '0.5', 'contact.php');
$emitStatic('/blog.php',                  'weekly',  '0.7', 'blog.php');
$emitStatic('/roi-calculator.php',        'monthly', '0.5', 'roi-calculator.php');
$emitStatic('/find-your-ad.php',          'monthly', '0.5', 'find-your-ad.php');
$emitStatic('/directory-signup.php',      'monthly', '0.6', 'directory-signup.php');
$emitStatic('/pricing',                   'monthly', '0.8', 'pricing.php');
$emitStatic('/compare',                   'monthly', '0.6', 'compare-products.php');
$emitStatic('/privacy.php',               'yearly',  '0.3', 'privacy.php');
$emitStatic('/terms.php',                 'yearly',  '0.3', 'terms.php');

echo "\n    <!-- Location landing pages -->\n";
foreach ([
    'charleston', 'mount-pleasant', 'north-charleston', 'summerville',
    'daniel-island', 'goose-creek', 'moncks-corner',
    'sullivans-island', 'isle-of-palms', 'james-island', 'johns-island',
] as $loc) {
    $emitStatic("/{$loc}-direct-mail-marketing.php", 'monthly', '0.8', "{$loc}-direct-mail-marketing.php");
}
$emitStatic('/coming-soon-service-areas.php', 'monthly', '0.5', 'coming-soon-service-areas.php');
?>

    <!-- Category pages -->
<?php
$categories = $db->query("SELECT slug FROM directory_categories WHERE is_active = 1 ORDER BY display_order")->fetchAll(PDO::FETCH_COLUMN);
foreach ($categories as $catSlug):
?>
    <url><loc><?= categoryUrl($catSlug) ?></loc><changefreq>daily</changefreq><priority>0.8</priority></url>
<?php endforeach; ?>

    <!-- Tag pages -->
<?php
$tags = $db->query("SELECT slug FROM directory_tags WHERE is_active = 1 ORDER BY display_order")->fetchAll(PDO::FETCH_COLUMN);
foreach ($tags as $tagSlug):
?>
    <url><loc><?= tagUrl($tagSlug) ?></loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
<?php endforeach; ?>

    <!-- Business pages -->
<?php
$businesses = $db->query("SELECT slug, updated_at, created_at FROM directory_businesses WHERE is_active = 1 AND is_verified = 1 AND is_hidden = 0 ORDER BY business_name")->fetchAll(PDO::FETCH_ASSOC);
foreach ($businesses as $biz):
    $lastmod = $biz['updated_at'] ?? $biz['created_at'];
    $lastmodDate = $lastmod ? date('Y-m-d', strtotime($lastmod)) : date('Y-m-d');
?>
    <url><loc><?= businessUrl($biz['slug']) ?></loc><lastmod><?= $lastmodDate ?></lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>
<?php endforeach; ?>

    <!-- Blog posts -->
<?php
try {
    ensureBlogTables();
    $blogPosts = $db->query("SELECT slug, updated_at, published_at FROM " . getTable('blog_posts') . " WHERE status = 'published' ORDER BY published_at DESC")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($blogPosts as $post):
        $lastmod = $post['updated_at'] ?? $post['published_at'];
        $lastmodDate = $lastmod ? date('Y-m-d', strtotime($lastmod)) : date('Y-m-d');
?>
    <url><loc><?= SITE_URL ?>/blog/<?= urlencode($post['slug']) ?></loc><lastmod><?= $lastmodDate ?></lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
<?php
    endforeach;
} catch (Exception $e) {
    // Blog tables may not exist yet
}
?>

</urlset>
