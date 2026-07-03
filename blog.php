<?php
require_once 'config.php';
require_once 'admin/blog_functions.php';

// Ensure tables exist
try {
    ensureBlogTables();
} catch (Exception $e) {
    error_log("Blog tables error: " . $e->getMessage());
}

// Auto-publish any scheduled posts whose time has arrived
publishScheduledPosts();

// Pagination
$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = 12;
$offset = ($page - 1) * $perPage;

// Category filter
$categoryFilter = isset($_GET['category']) ? sanitizeInput($_GET['category']) : null;

$result = getBlogPosts([
    'status'   => 'published',
    'category' => $categoryFilter,
    'limit'    => $perPage,
    'offset'   => $offset,
]);

$posts = $result['posts'];
$totalPosts = $result['total'];
$totalPages = ceil($totalPosts / $perPage);
$categories = getBlogCategories();

$pageTitle = 'Blog';
if ($categoryFilter) {
    foreach ($categories as $cat) {
        if ($cat['slug'] === $categoryFilter) {
            $pageTitle = $cat['name'] . ' - Blog';
            break;
        }
    }
}

// Shared SEO head include — dynamic title/canonical for category filter and pagination
$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
$seo['title']     = $pageTitle . ' | ' . SITE_NAME;
$seo['canonical'] = SITE_URL . '/blog.php'
    . ($categoryFilter ? '?category=' . urlencode($categoryFilter) : '')
    . ($page > 1 ? ($categoryFilter ? '&' : '?') . 'page=' . $page : '');
$seo['og_title']        = $pageTitle . ' | ' . SITE_NAME;
$seo['og_description']  = 'Direct mail marketing tips, local business insights, and community news from Lowcountry Business Spotlight.';
$seo['og_image_width']  = 1200;
$seo['og_image_height'] = 630;
$seo['og_image_alt']    = $pageTitle . ' | ' . SITE_NAME;
include __DIR__ . '/seo_head.php';
?>
<?php
  $paginationBase = SITE_URL . '/blog.php' . ($categoryFilter ? '?category=' . urlencode($categoryFilter) : '');
  $pageSep = $categoryFilter ? '&' : '?';
  if ($page > 1): ?>
  <link rel="prev" href="<?php echo $paginationBase . ($page > 2 ? $pageSep . 'page=' . ($page - 1) : ''); ?>">
<?php endif;
  if ($page < $totalPages): ?>
  <link rel="next" href="<?php echo $paginationBase . $pageSep . 'page=' . ($page + 1); ?>">
<?php endif; ?>

  <!-- Blog Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "<?php echo SITE_NAME; ?> Blog",
    "description": "Direct mail marketing tips, local business insights, and community news.",
    "url": "<?php echo SITE_URL; ?>/blog.php",
    "publisher": {
      "@type": "Organization",
      "name": "<?php echo SITE_NAME; ?>",
      "url": "<?php echo SITE_URL; ?>",
      "logo": {
        "@type": "ImageObject",
        "url": "<?php echo SITE_URL; ?>/images/lbs_logo.png"
      }
    }
  }
  </script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; }

    /* Hero */
    .blog-hero {
      background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
      color: white; text-align: center; padding: 3rem 20px 2.5rem;
    }
    .blog-hero .logo { max-width: 220px; margin-bottom: 1rem; }
    .blog-hero h1 { font-size: 2.5rem; font-weight: 900; margin-bottom: .5rem; }
    .blog-hero p { font-size: 1.1rem; color: rgba(255,255,255,0.85); max-width: 600px; margin: 0 auto; }

    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

    /* Category filters */
    .category-filters { display: flex; gap: .75rem; flex-wrap: wrap; justify-content: center; padding: 2rem 20px 0; }
    .cat-btn { padding: .5rem 1.25rem; border-radius: 20px; text-decoration: none; font-weight: 600; font-size: .875rem; transition: all .3s; border: 2px solid #e2e8f0; color: #64748b; background: white; }
    .cat-btn:hover { border-color: #38b6ff; color: #38b6ff; }
    .cat-btn.active { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; border-color: transparent; }

    /* Post grid */
    .post-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 2rem; padding: 2rem 0 3rem; }
    .post-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; transition: transform .3s, box-shadow .3s; display: flex; flex-direction: column; }
    .post-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,.1); }
    .post-card-image { width: 100%; height: 200px; object-fit: cover; background: #e2e8f0; }
    .post-card-image-placeholder { width: 100%; height: 200px; background: linear-gradient(135deg, #1e293b, #334155); display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 2rem; }
    .post-card-body { padding: 1.5rem; flex: 1; display: flex; flex-direction: column; }
    .post-card-meta { display: flex; gap: .75rem; align-items: center; margin-bottom: .75rem; font-size: .8rem; color: #94a3b8; }
    .post-card-category { background: #eff6ff; color: #2563eb; padding: .2rem .6rem; border-radius: 6px; font-weight: 600; font-size: .75rem; }
    .post-card-body h2 { font-size: 1.2rem; font-weight: 700; color: #1e293b; margin-bottom: .75rem; line-height: 1.4; }
    .post-card-body h2 a { color: inherit; text-decoration: none; }
    .post-card-body h2 a:hover { color: #38b6ff; }
    .post-card-excerpt { font-size: .9rem; color: #64748b; line-height: 1.6; margin-bottom: 1rem; flex: 1; }
    .read-more { color: #38b6ff; text-decoration: none; font-weight: 600; font-size: .9rem; }
    .read-more:hover { color: #0ea5e9; }

    /* Pagination */
    .pagination { display: flex; justify-content: center; gap: .5rem; padding: 0 0 3rem; }
    .pagination a, .pagination span { padding: .5rem 1rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: .9rem; }
    .pagination a { background: white; color: #334155; border: 1px solid #e2e8f0; }
    .pagination a:hover { background: #f1f5f9; }
    .pagination .current { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }

    .empty-state { text-align: center; padding: 4rem 2rem; color: #64748b; }
    .empty-state h3 { font-size: 1.5rem; margin-bottom: .5rem; color: #334155; }

    /* Newsletter Section */
    .newsletter-section { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 48px 20px; text-align: center; }
    .newsletter-inner { max-width: 600px; margin: 0 auto; }
    .newsletter-section h3 { color: white; font-size: 1.5rem; font-weight: 800; margin-bottom: 8px; }
    .newsletter-section p { color: #94a3b8; font-size: 1rem; margin-bottom: 24px; }
    .newsletter-form { display: flex; gap: 12px; justify-content: center; }
    .newsletter-form input[type="email"] { flex: 1; max-width: 360px; padding: 14px 18px; border: 2px solid #334155; border-radius: 10px; background: #0f172a; color: white; font-size: 1rem; font-family: inherit; }
    .newsletter-form input[type="email"]::placeholder { color: #64748b; }
    .newsletter-form input[type="email"]:focus { outline: none; border-color: #38b6ff; }
    .newsletter-form button { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; padding: 14px 28px; border: none; border-radius: 10px; font-weight: 700; font-size: 1rem; cursor: pointer; white-space: nowrap; transition: transform 0.2s; }
    .newsletter-form button:hover { transform: translateY(-2px); }
    .newsletter-msg { margin-top: 12px; font-size: 0.9rem; }
    .newsletter-msg.success { color: #10b981; }
    .newsletter-msg.error { color: #ef4444; }

    /* Footer */
    .footer { background: #0f172a; color: #94a3b8; padding: 2rem 0; margin-top: 0; }
    .footer-content { max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .footer-content p { font-size: .9rem; }
    .footer-content img { height: 50px; }

    @media (max-width: 768px) {
      .blog-hero h1 { font-size: 1.8rem; }
      .post-grid { grid-template-columns: 1fr; }
      .newsletter-form { flex-direction: column; align-items: center; }
      .newsletter-form input[type="email"] { max-width: 100%; width: 100%; }
    }
  </style>
</head>
<body>
  <?php include 'header.php'; ?>

  <section class="blog-hero">
    <a href="/index.php">
      <img src="/images/LBS_LOGO.png" alt="<?php echo SITE_NAME; ?>" class="logo"
           onerror="this.style.display='none'">
    </a>
    <h1>Blog</h1>
    <p>Marketing tips, local business insights, and community news for Charleston-area businesses.</p>
  </section>

  <div class="container">
    <!-- Category Filters -->
    <div class="category-filters">
      <a href="/blog.php" class="cat-btn <?php echo !$categoryFilter ? 'active' : ''; ?>">All</a>
      <?php foreach ($categories as $cat): ?>
        <a href="/blog.php?category=<?php echo urlencode($cat['slug']); ?>"
           class="cat-btn <?php echo $categoryFilter === $cat['slug'] ? 'active' : ''; ?>">
          <?php echo htmlspecialchars($cat['name']); ?>
        </a>
      <?php endforeach; ?>
    </div>

    <?php if (empty($posts)): ?>
      <div class="empty-state">
        <h3>No posts yet</h3>
        <p>Check back soon for marketing tips and local business news!</p>
      </div>
    <?php else: ?>
      <div class="post-grid">
        <?php foreach ($posts as $post): ?>
          <article class="post-card">
            <?php if ($post['featured_image']): ?>
              <a href="/blog/<?php echo urlencode($post['slug']); ?>">
                <img src="/uploads/blog/<?php echo htmlspecialchars($post['featured_image']); ?>"
                     alt="<?php echo htmlspecialchars($post['title']); ?>" class="post-card-image" loading="lazy">
              </a>
            <?php else: ?>
              <a href="/blog/<?php echo urlencode($post['slug']); ?>">
                <div class="post-card-image-placeholder">LBS</div>
              </a>
            <?php endif; ?>

            <div class="post-card-body">
              <div class="post-card-meta">
                <?php if ($post['category_name']): ?>
                  <span class="post-card-category"><?php echo htmlspecialchars($post['category_name']); ?></span>
                <?php endif; ?>
                <?php if ($post['published_at']): ?>
                  <span><?php echo date('M j, Y', strtotime($post['published_at'])); ?></span>
                <?php endif; ?>
              </div>

              <h2><a href="/blog/<?php echo urlencode($post['slug']); ?>"><?php echo htmlspecialchars($post['title']); ?></a></h2>

              <p class="post-card-excerpt">
                <?php echo htmlspecialchars(mb_substr(strip_tags($post['excerpt']), 0, 160)); ?>&hellip;
              </p>

              <a href="/blog/<?php echo urlencode($post['slug']); ?>" class="read-more">Read More &rarr;</a>
            </div>
          </article>
        <?php endforeach; ?>
      </div>

      <!-- Pagination -->
      <?php if ($totalPages > 1): ?>
        <div class="pagination">
          <?php if ($page > 1): ?>
            <a href="?page=<?php echo $page - 1; ?><?php echo $categoryFilter ? '&category=' . urlencode($categoryFilter) : ''; ?>">&laquo; Prev</a>
          <?php endif; ?>

          <?php for ($i = 1; $i <= $totalPages; $i++): ?>
            <?php if ($i === $page): ?>
              <span class="current"><?php echo $i; ?></span>
            <?php else: ?>
              <a href="?page=<?php echo $i; ?><?php echo $categoryFilter ? '&category=' . urlencode($categoryFilter) : ''; ?>"><?php echo $i; ?></a>
            <?php endif; ?>
          <?php endfor; ?>

          <?php if ($page < $totalPages): ?>
            <a href="?page=<?php echo $page + 1; ?><?php echo $categoryFilter ? '&category=' . urlencode($categoryFilter) : ''; ?>">Next &raquo;</a>
          <?php endif; ?>
        </div>
      <?php endif; ?>
    <?php endif; ?>
  </div>

  <?php include 'footer.php'; ?>
</body>
</html>
