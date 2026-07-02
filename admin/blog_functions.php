<?php
// admin/blog_functions.php - Blog management functions

require_once __DIR__ . '/../config.php';

/**
 * Ensure blog tables exist, seed default categories
 */
function ensureBlogTables() {
    $db = getDB();

    $db->exec("CREATE TABLE IF NOT EXISTS " . getTable('blog_categories') . " (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(120) NOT NULL UNIQUE,
        display_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS " . getTable('blog_posts') . " (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(280) NOT NULL UNIQUE,
        content LONGTEXT,
        excerpt TEXT,
        meta_description VARCHAR(320),
        featured_image VARCHAR(255),
        category_id INT,
        status ENUM('draft','published','scheduled') DEFAULT 'draft',
        published_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES " . getTable('blog_categories') . "(id) ON DELETE SET NULL
    )");

    // Ensure 'scheduled' status exists (upgrade from older schema)
    try {
        $db->exec("ALTER TABLE " . getTable('blog_posts') . " MODIFY COLUMN status ENUM('draft','published','scheduled') DEFAULT 'draft'");
    } catch (Exception $e) {
        // Already has the correct ENUM, ignore
    }

    // Seed default categories if empty
    $count = (int)$db->query("SELECT COUNT(*) FROM " . getTable('blog_categories'))->fetchColumn();
    if ($count === 0) {
        $defaults = [
            ['Marketing Tips', 'marketing-tips', 1],
            ['Local Business', 'local-business', 2],
            ['Direct Mail', 'direct-mail', 3],
            ['Community News', 'community-news', 4],
            ['Success Stories', 'success-stories', 5],
        ];
        $stmt = $db->prepare("INSERT INTO " . getTable('blog_categories') . " (name, slug, display_order) VALUES (?, ?, ?)");
        foreach ($defaults as $row) {
            $stmt->execute($row);
        }
    }
}

/**
 * Auto-publish any scheduled posts whose publish time has arrived
 */
function publishScheduledPosts() {
    $db = getDB();
    $stmt = $db->prepare("UPDATE " . getTable('blog_posts') . "
        SET status = 'published'
        WHERE status = 'scheduled' AND published_at <= NOW()");
    $stmt->execute();
    return $stmt->rowCount();
}

/**
 * Get a single blog post by ID
 */
function getBlogPost($id) {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT p.*, c.name AS category_name, c.slug AS category_slug
        FROM " . getTable('blog_posts') . " p
        LEFT JOIN " . getTable('blog_categories') . " c ON p.category_id = c.id
        WHERE p.id = ?
    ");
    $stmt->execute([$id]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * Get a single blog post by slug (for public pages)
 */
function getBlogPostBySlug($slug) {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT p.*, c.name AS category_name, c.slug AS category_slug
        FROM " . getTable('blog_posts') . " p
        LEFT JOIN " . getTable('blog_categories') . " c ON p.category_id = c.id
        WHERE p.slug = ? AND p.status = 'published'
    ");
    $stmt->execute([$slug]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * Get blog posts with optional filters
 */
function getBlogPosts($options = []) {
    $db = getDB();

    $where = [];
    $params = [];
    $statusFilter = $options['status'] ?? null;
    $categorySlug = $options['category'] ?? null;
    $limit = (int)($options['limit'] ?? 12);
    $offset = (int)($options['offset'] ?? 0);

    if ($statusFilter) {
        $where[] = "p.status = ?";
        $params[] = $statusFilter;
    }

    if ($categorySlug) {
        $where[] = "c.slug = ?";
        $params[] = $categorySlug;
    }

    $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    // Count total
    $countSQL = "SELECT COUNT(*) FROM " . getTable('blog_posts') . " p
        LEFT JOIN " . getTable('blog_categories') . " c ON p.category_id = c.id $whereSQL";
    $countStmt = $db->prepare($countSQL);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    // Fetch rows
    $sql = "SELECT p.*, c.name AS category_name, c.slug AS category_slug
        FROM " . getTable('blog_posts') . " p
        LEFT JOIN " . getTable('blog_categories') . " c ON p.category_id = c.id
        $whereSQL
        ORDER BY p.published_at DESC, p.created_at DESC
        LIMIT $limit OFFSET $offset";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return ['posts' => $posts, 'total' => $total];
}

/**
 * Get all active blog categories
 */
function getBlogCategories() {
    $db = getDB();
    return $db->query("SELECT * FROM " . getTable('blog_categories') . " WHERE is_active = 1 ORDER BY display_order ASC")
              ->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Save (insert or update) a blog post
 */
function saveBlogPost($data, $id = null) {
    $db = getDB();

    $title = trim($data['title']);
    $slug = !empty($data['slug']) ? generateSlug($data['slug']) : generateSlug($title);
    $content = $data['content'] ?? '';
    $excerpt = trim($data['excerpt'] ?? '');
    $metaDescription = trim($data['meta_description'] ?? '');
    $featuredImage = $data['featured_image'] ?? null;
    $categoryId = !empty($data['category_id']) ? (int)$data['category_id'] : null;
    $status = in_array($data['status'] ?? '', ['draft', 'published', 'scheduled']) ? $data['status'] : 'draft';

    // Auto-generate excerpt from content if empty
    if (empty($excerpt) && !empty($content)) {
        $excerpt = mb_substr(strip_tags($content), 0, 300);
    }

    // Set published_at based on status
    $publishedAt = null;
    if ($status === 'scheduled') {
        // Use user-provided scheduled datetime (from datetime-local input: "2026-03-10T09:00")
        if (!empty($data['scheduled_at'])) {
            $publishedAt = date('Y-m-d H:i:s', strtotime($data['scheduled_at']));
        }
        if (!$publishedAt) {
            // No date provided — fall back to draft
            $status = 'draft';
        }
    } elseif ($status === 'published') {
        if ($id) {
            $existing = getBlogPost($id);
            $publishedAt = $existing['published_at'] ?: date('Y-m-d H:i:s');
        } else {
            $publishedAt = date('Y-m-d H:i:s');
        }
    }

    // Ensure slug uniqueness
    $slugBase = $slug;
    $slugSuffix = 1;
    while (true) {
        $checkStmt = $db->prepare("SELECT id FROM " . getTable('blog_posts') . " WHERE slug = ? AND id != ?");
        $checkStmt->execute([$slug, $id ?? 0]);
        if (!$checkStmt->fetch()) break;
        $slug = $slugBase . '-' . $slugSuffix++;
    }

    if ($id) {
        $stmt = $db->prepare("UPDATE " . getTable('blog_posts') . " SET
            title = ?, slug = ?, content = ?, excerpt = ?, meta_description = ?,
            featured_image = ?, category_id = ?, status = ?, published_at = ?
            WHERE id = ?");
        $stmt->execute([$title, $slug, $content, $excerpt, $metaDescription,
            $featuredImage, $categoryId, $status, $publishedAt, $id]);
        return $id;
    } else {
        $stmt = $db->prepare("INSERT INTO " . getTable('blog_posts') . "
            (title, slug, content, excerpt, meta_description, featured_image, category_id, status, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$title, $slug, $content, $excerpt, $metaDescription,
            $featuredImage, $categoryId, $status, $publishedAt]);
        return $db->lastInsertId();
    }
}

/**
 * Delete a blog post
 */
function deleteBlogPost($id) {
    $db = getDB();
    $post = getBlogPost($id);
    if ($post && $post['featured_image']) {
        $path = UPLOAD_DIR . 'blog/' . $post['featured_image'];
        if (file_exists($path)) {
            unlink($path);
        }
    }
    $stmt = $db->prepare("DELETE FROM " . getTable('blog_posts') . " WHERE id = ?");
    return $stmt->execute([$id]);
}

/**
 * Get related posts (same category, excluding current)
 */
function getRelatedPosts($postId, $categoryId, $limit = 3) {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT p.*, c.name AS category_name, c.slug AS category_slug
        FROM " . getTable('blog_posts') . " p
        LEFT JOIN " . getTable('blog_categories') . " c ON p.category_id = c.id
        WHERE p.id != ? AND p.status = 'published' AND p.category_id = ?
        ORDER BY p.published_at DESC
        LIMIT ?
    ");
    $stmt->execute([$postId, $categoryId, $limit]);
    $related = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // If not enough from same category, fill with recent posts
    if (count($related) < $limit) {
        $excludeIds = array_merge([$postId], array_column($related, 'id'));
        $placeholders = implode(',', array_fill(0, count($excludeIds), '?'));
        $remaining = $limit - count($related);
        $stmt = $db->prepare("
            SELECT p.*, c.name AS category_name, c.slug AS category_slug
            FROM " . getTable('blog_posts') . " p
            LEFT JOIN " . getTable('blog_categories') . " c ON p.category_id = c.id
            WHERE p.id NOT IN ($placeholders) AND p.status = 'published'
            ORDER BY p.published_at DESC
            LIMIT ?
        ");
        $stmt->execute(array_merge($excludeIds, [$remaining]));
        $related = array_merge($related, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    return $related;
}
?>
