<?php
require_once 'config.php';
require_once 'admin/blog_functions.php';

try {
    ensureBlogTables();
} catch (Exception $e) {
    error_log("Blog tables error: " . $e->getMessage());
}

// Auto-publish any scheduled posts whose time has arrived
publishScheduledPosts();

$slug = isset($_GET['slug']) ? sanitizeInput($_GET['slug']) : '';
$post = $slug ? getBlogPostBySlug($slug) : null;

if (!$post) {
    http_response_code(404);
    header('Location: /blog.php');
    exit;
}

$relatedPosts = getRelatedPosts($post['id'], $post['category_id']);

// Build meta
$canonicalUrl = SITE_URL . '/blog/' . urlencode($post['slug']);
$featuredImageUrl = $post['featured_image'] ? SITE_URL . '/uploads/blog/' . $post['featured_image'] : '';
$publishedDate = $post['published_at'] ? date('c', strtotime($post['published_at'])) : '';
$updatedDate = $post['updated_at'] ? date('c', strtotime($post['updated_at'])) : '';

// Shared SEO head include — per-post values from the blog post record
$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
$seo['title']         = $post['title'] . ' | ' . SITE_NAME;
$seo['description']   = $post['meta_description'] ?: mb_substr(strip_tags($post['excerpt']), 0, 160);
$seo['canonical']     = $canonicalUrl;
$seo['og_type']       = 'article';
$seo['og_title']      = $post['title'];
$seo['twitter_title'] = $post['title'];
if ($featuredImageUrl) {
    $seo['og_image']        = $featuredImageUrl;
    $seo['og_image_width']  = 1200;
    $seo['og_image_height'] = 630;
    $seo['og_image_alt']    = $post['title'];
}
include __DIR__ . '/seo_head.php';
?>
  <?php if ($publishedDate): ?>
  <meta property="article:published_time" content="<?php echo $publishedDate; ?>">
  <?php endif; ?>

  <!-- BreadcrumbList Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "<?php echo SITE_URL; ?>/"},
      {"@type": "ListItem", "position": 2, "name": "Blog", "item": "<?php echo SITE_URL; ?>/blog.php"}
      <?php if ($post['category_name']): ?>
      ,{"@type": "ListItem", "position": 3, "name": <?php echo json_encode($post['category_name']); ?>, "item": "<?php echo SITE_URL; ?>/blog.php?category=<?php echo urlencode($post['category_slug']); ?>"}
      ,{"@type": "ListItem", "position": 4, "name": <?php echo json_encode($post['title']); ?>}
      <?php else: ?>
      ,{"@type": "ListItem", "position": 3, "name": <?php echo json_encode($post['title']); ?>}
      <?php endif; ?>
    ]
  }
  </script>

  <!-- Article JSON-LD Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": <?php echo json_encode($post['title']); ?>,
    "description": <?php echo json_encode(strip_tags($post['excerpt'])); ?>,
    "url": <?php echo json_encode($canonicalUrl); ?>,
    <?php if ($featuredImageUrl): ?>
    "image": <?php echo json_encode($featuredImageUrl); ?>,
    <?php endif; ?>
    <?php if ($publishedDate): ?>
    "datePublished": "<?php echo $publishedDate; ?>",
    <?php endif; ?>
    <?php if ($updatedDate): ?>
    "dateModified": "<?php echo $updatedDate; ?>",
    <?php endif; ?>
    "author": {
      "@type": "Organization",
      "name": "<?php echo SITE_NAME; ?>",
      "url": "<?php echo SITE_URL; ?>",
      "logo": {
        "@type": "ImageObject",
        "url": "<?php echo SITE_URL; ?>/images/lbs_logo.png"
      }
    },
    "publisher": {
      "@type": "Organization",
      "name": "<?php echo SITE_NAME; ?>",
      "url": "<?php echo SITE_URL; ?>",
      "logo": {
        "@type": "ImageObject",
        "url": "<?php echo SITE_URL; ?>/images/lbs_logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": <?php echo json_encode($canonicalUrl); ?>
    }
  }
  </script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; }

    /* Hero */
    .post-hero {
      position: relative; background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%); color: white; text-align: center;
      padding: 3rem 20px 2.5rem; overflow: hidden;
    }
    .post-hero-bg {
      position: absolute; inset: 0; background-size: cover; background-position: center;
      opacity: .25; filter: blur(2px);
    }
    .post-hero-content { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }
    .post-hero .breadcrumb { font-size: .85rem; color: #94a3b8; margin-bottom: 1rem; }
    .post-hero .breadcrumb a { color: #38b6ff; text-decoration: none; }
    .post-hero .breadcrumb a:hover { text-decoration: underline; }
    .post-hero h1 { font-size: 2.25rem; font-weight: 900; line-height: 1.3; margin-bottom: 1rem; }
    .post-hero .post-meta { font-size: .9rem; color: #94a3b8; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
    .post-hero .post-meta .category-badge { background: rgba(56,182,255,.2); color: #38b6ff; padding: .2rem .8rem; border-radius: 6px; font-weight: 600; }

    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

    /* Article */
    .article-wrapper { max-width: 800px; margin: 0 auto; padding: 2.5rem 0 3rem; }

    .featured-image { margin-bottom: 2rem; }
    .featured-image img { width: 100%; max-height: 450px; object-fit: cover; border-radius: 12px; }

    .article-content { font-size: 1.05rem; line-height: 1.8; color: #334155; }
    .article-content h2 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 2rem 0 1rem; }
    .article-content h3 { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 1.5rem 0 .75rem; }
    .article-content p { margin-bottom: 1.25rem; }
    .article-content ul, .article-content ol { margin: 1rem 0 1.25rem 1.5rem; }
    .article-content li { margin-bottom: .5rem; }
    .article-content blockquote { border-left: 4px solid #38b6ff; padding: 1rem 1.5rem; background: #f1f5f9; border-radius: 0 8px 8px 0; margin: 1.5rem 0; font-style: italic; color: #475569; }
    .article-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.5rem 0; }
    .article-content a { color: #38b6ff; text-decoration: underline; }
    .article-content table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
    .article-content th, .article-content td { border: 1px solid #e2e8f0; padding: .75rem; text-align: left; }
    .article-content th { background: #f8fafc; font-weight: 600; }

    /* CTA */
    .cta-section {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 16px; padding: 3rem 2rem; text-align: center; margin: 2rem 0 3rem; color: white;
    }
    .cta-section h3 { font-size: 1.75rem; font-weight: 800; margin-bottom: 1rem; }
    .cta-section p { color: #94a3b8; font-size: 1.05rem; margin-bottom: 1.5rem; max-width: 500px; margin-left: auto; margin-right: auto; }
    .cta-btn {
      display: inline-block; padding: .875rem 2rem; background: linear-gradient(135deg, #38b6ff, #0ea5e9);
      color: white; text-decoration: none; font-weight: 700; border-radius: 8px;
      transition: transform .3s, box-shadow .3s;
    }
    .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(56,182,255,.4); }

    /* Related posts */
    .related-section { padding: 2rem 0 3rem; }
    .related-section h3 { font-size: 1.5rem; font-weight: 800; color: #1e293b; margin-bottom: 1.5rem; text-align: center; }
    .related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
    .related-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; transition: transform .3s; }
    .related-card:hover { transform: translateY(-3px); }
    .related-card img { width: 100%; height: 160px; object-fit: cover; }
    .related-card-body { padding: 1.25rem; }
    .related-card-body h4 { font-size: 1rem; font-weight: 700; margin-bottom: .5rem; }
    .related-card-body h4 a { color: #1e293b; text-decoration: none; }
    .related-card-body h4 a:hover { color: #38b6ff; }
    .related-card-body .meta { font-size: .8rem; color: #94a3b8; }

    /* Footer */
    .footer { background: #0f172a; color: #94a3b8; padding: 2rem 0; margin-top: 2rem; }
    .footer-content { max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .footer-content p { font-size: .9rem; }
    .footer-content img { height: 50px; }

    @media (max-width: 768px) {
      .post-hero h1 { font-size: 1.6rem; }
      .article-wrapper { padding: 1.5rem 0 2rem; }
      .related-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <?php include 'header.php'; ?>

  <section class="post-hero">
    <?php if ($post['featured_image']): ?>
      <div class="post-hero-bg" style="background-image: url('/uploads/blog/<?php echo htmlspecialchars($post['featured_image']); ?>');"></div>
    <?php endif; ?>
    <div class="post-hero-content">
      <div class="breadcrumb">
        <a href="/index.php">Home</a> &rsaquo; <a href="/blog.php">Blog</a>
        <?php if ($post['category_name']): ?>
          &rsaquo; <a href="/blog.php?category=<?php echo urlencode($post['category_slug']); ?>"><?php echo htmlspecialchars($post['category_name']); ?></a>
        <?php endif; ?>
      </div>
      <h1><?php echo htmlspecialchars($post['title']); ?></h1>
      <div class="post-meta">
        <?php if ($post['category_name']): ?>
          <span class="category-badge"><?php echo htmlspecialchars($post['category_name']); ?></span>
        <?php endif; ?>
        <?php if ($post['published_at']): ?>
          <span><?php echo date('F j, Y', strtotime($post['published_at'])); ?></span>
        <?php endif; ?>
      </div>
    </div>
  </section>

  <div class="container">
    <div class="article-wrapper">

      <?php if ($post['featured_image']): ?>
        <div class="featured-image">
          <img src="/uploads/blog/<?php echo htmlspecialchars($post['featured_image']); ?>"
               alt="<?php echo htmlspecialchars($post['title']); ?>">
        </div>
      <?php endif; ?>

      <div class="article-content">
        <?php echo $post['content']; ?>
      </div>

      <!-- CTA -->
      <div class="cta-section">
        <h3>Ready to Grow Your Business?</h3>
        <p>Reach thousands of households in the Charleston Lowcountry with targeted direct mail marketing.</p>
        <a href="/contact.php" class="cta-btn">Get Started Today</a>
      </div>
    </div>

    <!-- Related Posts -->
    <?php if (!empty($relatedPosts)): ?>
      <div class="related-section">
        <h3>More Articles</h3>
        <div class="related-grid">
          <?php foreach ($relatedPosts as $related): ?>
            <article class="related-card">
              <?php if ($related['featured_image']): ?>
                <a href="/blog/<?php echo urlencode($related['slug']); ?>">
                  <img src="/uploads/blog/<?php echo htmlspecialchars($related['featured_image']); ?>"
                       alt="<?php echo htmlspecialchars($related['title']); ?>" loading="lazy">
                </a>
              <?php endif; ?>
              <div class="related-card-body">
                <h4><a href="/blog/<?php echo urlencode($related['slug']); ?>"><?php echo htmlspecialchars($related['title']); ?></a></h4>
                <div class="meta">
                  <?php if ($related['category_name']): ?>
                    <?php echo htmlspecialchars($related['category_name']); ?> &bull;
                  <?php endif; ?>
                  <?php if ($related['published_at']): ?>
                    <?php echo date('M j, Y', strtotime($related['published_at'])); ?>
                  <?php endif; ?>
                </div>
              </div>
            </article>
          <?php endforeach; ?>
        </div>
      </div>
    <?php endif; ?>
  </div>

  <?php include 'footer.php'; ?>
</body>
</html>
