<?php
// admin/manage_blog.php - Blog post management listing
require_once '../config.php';
require_once 'campaign_functions.php';
require_once 'blog_functions.php';

requireCampaignAdminLogin();
$currentAdmin = getCurrentCampaignAdmin();

ensureBlogTables();

$message = '';
$messageType = '';

// Handle delete
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete') {
    $postId = (int)($_POST['id'] ?? 0);
    if ($postId) {
        deleteBlogPost($postId);
        $message = 'Post deleted successfully.';
        $messageType = 'success';
    }
}

// Auto-publish any scheduled posts whose time has arrived
publishScheduledPosts();

// Get all posts (admin sees all statuses)
$result = getBlogPosts(['limit' => 100]);
$posts = $result['posts'];
$categories = getBlogCategories();

// Message from redirect
if (isset($_GET['message'])) {
    switch ($_GET['message']) {
        case 'saved': $message = 'Post saved successfully.'; $messageType = 'success'; break;
        case 'published': $message = 'Post published!'; $messageType = 'success'; break;
        case 'scheduled': $message = 'Post scheduled!'; $messageType = 'success'; break;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Blog | <?php echo SITE_NAME; ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #334155; }
        .navbar { background: linear-gradient(135deg, #1f2937, #111827); color: white; padding: 1rem 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .navbar .container { max-width: 1400px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; }
        .navbar-brand { font-size: 1.5rem; font-weight: 800; text-decoration: none; color: white; }
        .navbar-nav { display: flex; align-items: center; gap: 1rem; }
        .nav-link { color: white; text-decoration: none; font-weight: 500; padding: .5rem 1rem; border-radius: 8px; transition: background-color .3s ease; }
        .nav-link:hover { background-color: rgba(255,255,255,.1); }
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem 20px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .page-title { font-size: 2rem; font-weight: 800; color: #1e293b; }
        .btn { padding: .75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all .3s ease; border: none; cursor: pointer; font-size: .9rem; display: inline-flex; align-items: center; gap: .5rem; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-secondary { background: #64748b; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-sm { padding: .4rem .8rem; font-size: .8rem; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
        .alert { padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-success { background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
        .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; overflow: hidden; }
        .card-header { background: #f8fafc; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f8fafc; font-weight: 600; color: #374151; font-size: .85rem; text-transform: uppercase; }
        tr:hover { background: #f9fafb; }
        .status-badge { display: inline-block; padding: .25rem .75rem; border-radius: 20px; font-size: .75rem; font-weight: 600; text-transform: uppercase; }
        .status-published { background: #dcfce7; color: #166534; }
        .status-draft { background: #fef3c7; color: #92400e; }
        .status-scheduled { background: #ede9fe; color: #5b21b6; }
        .action-btns { display: flex; gap: .5rem; }
        .post-thumb { width: 60px; height: 40px; object-fit: cover; border-radius: 6px; background: #e2e8f0; }
        .empty-state { text-align: center; padding: 3rem; color: #64748b; }
        .view-link { color: #38b6ff; text-decoration: none; font-weight: 500; }
        .view-link:hover { text-decoration: underline; }
        @media (max-width: 768px) {
            .navbar .container { flex-direction: column; gap: 1rem; }
            .page-header { flex-direction: column; align-items: stretch; }
            table { font-size: .85rem; }
            th, td { padding: .75rem .5rem; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'blog'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="page-header">
            <h1 class="page-title">Blog Posts</h1>
            <a href="edit_blog_post.php" class="btn btn-primary">+ Add New Post</a>
        </div>

        <?php if ($message): ?>
            <div class="alert alert-<?php echo $messageType; ?>"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>

        <div class="card">
            <div class="card-header">
                <span>All Posts (<?php echo count($posts); ?>)</span>
                <a href="../blog.php" class="view-link" target="_blank">View Public Blog &rarr;</a>
            </div>

            <?php if (empty($posts)): ?>
                <div class="empty-state">
                    <p style="font-size: 2rem; margin-bottom: 1rem;">📝</p>
                    <h3>No blog posts yet</h3>
                    <p>Create your first blog post to boost SEO and engage visitors.</p>
                    <a href="edit_blog_post.php" class="btn btn-primary" style="margin-top: 1rem;">Create First Post</a>
                </div>
            <?php else: ?>
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($posts as $post): ?>
                                <tr>
                                    <td>
                                        <?php if ($post['featured_image']): ?>
                                            <img src="/uploads/blog/<?php echo htmlspecialchars($post['featured_image']); ?>" class="post-thumb" alt="">
                                        <?php else: ?>
                                            <div class="post-thumb" style="display:flex;align-items:center;justify-content:center;font-size:.7rem;color:#94a3b8;">No img</div>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <strong><?php echo htmlspecialchars($post['title']); ?></strong>
                                        <br><small style="color:#64748b;">/blog-post.php?slug=<?php echo htmlspecialchars($post['slug']); ?></small>
                                    </td>
                                    <td><?php echo htmlspecialchars($post['category_name'] ?? '—'); ?></td>
                                    <td>
                                        <span class="status-badge status-<?php echo $post['status']; ?>">
                                            <?php echo ucfirst($post['status']); ?>
                                        </span>
                                    </td>
                                    <td>
                                        <?php if ($post['status'] === 'scheduled' && $post['published_at']): ?>
                                            <span style="color:#7c3aed;font-weight:500;"><?php echo date('M j, Y g:i A', strtotime($post['published_at'])); ?></span>
                                        <?php elseif ($post['published_at']): ?>
                                            <?php echo date('M j, Y', strtotime($post['published_at'])); ?>
                                        <?php else: ?>
                                            <span style="color:#94a3b8;">—</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <div class="action-btns">
                                            <a href="edit_blog_post.php?id=<?php echo $post['id']; ?>" class="btn btn-secondary btn-sm">Edit</a>
                                            <?php if ($post['status'] === 'published'): ?>
                                                <a href="../blog-post.php?slug=<?php echo htmlspecialchars($post['slug']); ?>" class="btn btn-sm" style="background:#06b6d4;color:white;" target="_blank">View</a>
                                            <?php endif; ?>
                                            <form method="POST" style="display:inline;" onsubmit="return confirm('Delete this post?');">
                                                <input type="hidden" name="action" value="delete">
                                                <input type="hidden" name="id" value="<?php echo $post['id']; ?>">
                                                <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <script>
        setTimeout(function() {
            document.querySelectorAll('.alert').forEach(function(el) {
                el.style.opacity = '0';
                el.style.transition = 'opacity .3s';
                setTimeout(() => el.remove(), 300);
            });
        }, 5000);
    </script>
</body>
</html>
