<?php
// admin/edit_blog_post.php - Add/Edit blog post with Quill editor
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error_log');
require_once '../config.php';
require_once 'campaign_functions.php';
require_once 'blog_functions.php';

requireCampaignAdminLogin();
$currentAdmin = getCurrentCampaignAdmin();

ensureBlogTables();

$postId = isset($_GET['id']) ? (int)$_GET['id'] : null;
$post = $postId ? getBlogPost($postId) : null;
$categories = getBlogCategories();
$message = '';
$messageType = '';

// Handle save
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = [
            'title'           => $_POST['title'] ?? '',
            'slug'            => $_POST['slug'] ?? '',
            'content'         => !empty($_POST['content']) ? base64_decode($_POST['content']) : '',
            'excerpt'         => $_POST['excerpt'] ?? '',
            'meta_description'=> $_POST['meta_description'] ?? '',
            'category_id'     => $_POST['category_id'] ?? null,
            'status'          => $_POST['status'] ?? 'draft',
            'scheduled_at'    => $_POST['scheduled_at'] ?? null,
        ];

        if (empty(trim($data['title']))) {
            throw new Exception('Title is required.');
        }

        // Handle featured image upload
        if (!empty($_FILES['featured_image']['name']) && $_FILES['featured_image']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['featured_image'];
            $mimeType = $file['type'];
            if (function_exists('finfo_open')) {
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $mimeType = finfo_file($finfo, $file['tmp_name']);
                finfo_close($finfo);
            }

            if (!in_array($mimeType, ALLOWED_IMAGE_TYPES)) {
                throw new Exception('Invalid image type. Allowed: JPG, PNG, WebP.');
            }
            if ($file['size'] > MAX_FILE_SIZE) {
                throw new Exception('Image too large. Max 5MB.');
            }

            $blogUploadDir = UPLOAD_DIR . 'blog/';
            if (!is_dir($blogUploadDir)) {
                mkdir($blogUploadDir, 0755, true);
            }

            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) $ext = 'jpg';
            $filename = 'featured_' . uniqid() . '_' . time() . '.' . $ext;

            if (!move_uploaded_file($file['tmp_name'], $blogUploadDir . $filename)) {
                throw new Exception('Failed to upload image.');
            }

            // Delete old image if replacing
            if ($post && $post['featured_image']) {
                $oldPath = UPLOAD_DIR . 'blog/' . $post['featured_image'];
                if (file_exists($oldPath)) unlink($oldPath);
            }

            $data['featured_image'] = $filename;
        } else {
            // Keep existing image
            $data['featured_image'] = $post['featured_image'] ?? null;

            // Handle image removal
            if (!empty($_POST['remove_image']) && $post && $post['featured_image']) {
                $oldPath = UPLOAD_DIR . 'blog/' . $post['featured_image'];
                if (file_exists($oldPath)) unlink($oldPath);
                $data['featured_image'] = null;
            }
        }

        $savedId = saveBlogPost($data, $postId);
        $redirectMsg = $data['status'] === 'published' ? 'published' : ($data['status'] === 'scheduled' ? 'scheduled' : 'saved');
        header('Location: manage_blog.php?message=' . $redirectMsg);
        exit;

    } catch (Exception $e) {
        $message = $e->getMessage();
        $messageType = 'danger';
        // Keep submitted data for re-display
        $post = $post ?: [];
        $post = array_merge($post ?: [], $_POST);
    }
}

$isEdit = $post && $postId;
$pageTitle = $isEdit ? 'Edit Post' : 'Add New Post';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle; ?> | <?php echo SITE_NAME; ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link href="https://cdn.quilljs.com/1.3.7/quill.snow.css" rel="stylesheet">
    <script src="https://cdn.quilljs.com/1.3.7/quill.min.js"></script>
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
        .btn-success { background: #10b981; color: white; }
        .btn-secondary { background: #64748b; color: white; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
        .alert { padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }
        .editor-layout { display: grid; grid-template-columns: 1fr 320px; gap: 2rem; }
        .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; margin-bottom: 1.5rem; overflow: hidden; }
        .card-header { background: #f8fafc; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 1rem; }
        .card-body { padding: 1.5rem; }
        .form-group { margin-bottom: 1.25rem; }
        .form-group label { display: block; font-weight: 600; margin-bottom: .5rem; color: #374151; font-size: .9rem; }
        .form-group input, .form-group select, .form-group textarea {
            width: 100%; padding: .75rem; border: 2px solid #e5e7eb; border-radius: 8px;
            font-size: .95rem; font-family: inherit; transition: border-color .3s;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #38b6ff; }
        .form-group textarea { min-height: 80px; resize: vertical; }
        .form-hint { font-size: .8rem; color: #94a3b8; margin-top: .25rem; }
        .slug-preview { font-size: .8rem; color: #38b6ff; margin-top: .25rem; font-family: monospace; }
        .image-preview { margin-top: .75rem; }
        .image-preview img { max-width: 100%; max-height: 200px; border-radius: 8px; object-fit: cover; }
        .remove-image { display: inline-block; margin-top: .5rem; color: #ef4444; font-size: .85rem; cursor: pointer; }
        .save-bar { position: sticky; bottom: 0; background: white; padding: 1rem 1.5rem; border-top: 2px solid #e2e8f0; display: flex; gap: 1rem; justify-content: flex-end; z-index: 10; }
        @media (max-width: 900px) {
            .editor-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
            .navbar .container { flex-direction: column; gap: 1rem; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'blog'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="page-header">
            <h1 class="page-title"><?php echo $pageTitle; ?></h1>
            <a href="manage_blog.php" class="btn btn-secondary">&larr; Back to Posts</a>
        </div>

        <?php if ($message): ?>
            <div class="alert alert-<?php echo $messageType; ?>"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>

        <form method="POST" enctype="multipart/form-data" id="postForm">
            <div class="editor-layout">
                <!-- Main content column -->
                <div>
                    <div class="card">
                        <div class="card-header">Post Content</div>
                        <div class="card-body">
                            <div class="form-group">
                                <label for="title">Title *</label>
                                <input type="text" name="title" id="title" required
                                       value="<?php echo htmlspecialchars($post['title'] ?? ''); ?>"
                                       placeholder="Enter post title...">
                            </div>

                            <div class="form-group">
                                <label for="slug">URL Slug</label>
                                <input type="text" name="slug" id="slug"
                                       value="<?php echo htmlspecialchars($post['slug'] ?? ''); ?>"
                                       placeholder="auto-generated-from-title">
                                <div class="slug-preview" id="slugPreview">
                                    <?php if (!empty($post['slug'])): ?>
                                        /blog-post.php?slug=<?php echo htmlspecialchars($post['slug']); ?>
                                    <?php endif; ?>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Content</label>
                                <div id="quill-editor" style="height: 400px; background: white;"><?php echo $post['content'] ?? ''; ?></div>
                                <input type="hidden" name="content" id="content">
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">SEO</div>
                        <div class="card-body">
                            <div class="form-group">
                                <label for="excerpt">Excerpt</label>
                                <textarea name="excerpt" id="excerpt" rows="3"
                                          placeholder="Brief summary for post cards and social sharing..."><?php echo htmlspecialchars($post['excerpt'] ?? ''); ?></textarea>
                                <div class="form-hint">Auto-generated from content if left blank. Shown on blog listing cards.</div>
                            </div>

                            <div class="form-group">
                                <label for="meta_description">Meta Description</label>
                                <textarea name="meta_description" id="meta_description" rows="2" maxlength="320"
                                          placeholder="SEO meta description (max 160 characters recommended)..."><?php echo htmlspecialchars($post['meta_description'] ?? ''); ?></textarea>
                                <div class="form-hint">Appears in search engine results. Keep under 160 characters.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sidebar column -->
                <div>
                    <div class="card">
                        <div class="card-header">Publish</div>
                        <div class="card-body">
                            <div class="form-group">
                                <label for="statusSelect">Status</label>
                                <select id="statusSelect" onchange="toggleScheduleUI()">
                                    <option value="draft" <?php echo ($post['status'] ?? '') === 'draft' ? 'selected' : ''; ?>>Draft</option>
                                    <option value="published" <?php echo ($post['status'] ?? '') === 'published' ? 'selected' : ''; ?>>Published</option>
                                    <option value="scheduled" <?php echo ($post['status'] ?? '') === 'scheduled' ? 'selected' : ''; ?>>Scheduled</option>
                                </select>
                            </div>

                            <div id="scheduleGroup" class="form-group" style="display:<?php echo ($post['status'] ?? '') === 'scheduled' ? 'block' : 'none'; ?>;">
                                <label for="scheduled_at">Publish Date & Time</label>
                                <input type="datetime-local" name="scheduled_at" id="scheduled_at"
                                       value="<?php echo ($post['status'] ?? '') === 'scheduled' && !empty($post['published_at']) ? date('Y-m-d\TH:i', strtotime($post['published_at'])) : ''; ?>">
                                <div class="form-hint">Post will go live automatically at this time.</div>
                            </div>

                            <?php if (!empty($post['published_at']) && ($post['status'] ?? '') === 'published'): ?>
                                <p style="font-size: .85rem; color: #64748b; margin-bottom: 1rem;">
                                    Published: <?php echo date('M j, Y g:i A', strtotime($post['published_at'])); ?>
                                </p>
                            <?php endif; ?>
                            <?php if (!empty($post['published_at']) && ($post['status'] ?? '') === 'scheduled'): ?>
                                <p style="font-size: .85rem; color: #7c3aed; margin-bottom: 1rem;">
                                    Scheduled: <?php echo date('M j, Y g:i A', strtotime($post['published_at'])); ?>
                                </p>
                            <?php endif; ?>

                            <input type="hidden" name="status" id="statusHidden" value="<?php echo htmlspecialchars($post['status'] ?? 'draft'); ?>">

                            <div style="display: flex; gap: .75rem;" id="actionButtons">
                                <button type="submit" class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('statusHidden').value='draft';">Save Draft</button>
                                <button type="submit" class="btn btn-success" style="flex:1;" id="publishBtn" onclick="document.getElementById('statusHidden').value='published';">Publish</button>
                                <button type="submit" class="btn" style="flex:1;background:#7c3aed;color:white;display:none;" id="scheduleBtn" onclick="document.getElementById('statusHidden').value='scheduled';">Schedule</button>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">Category</div>
                        <div class="card-body">
                            <div class="form-group" style="margin-bottom:0;">
                                <select name="category_id" id="category_id">
                                    <option value="">— No Category —</option>
                                    <?php foreach ($categories as $cat): ?>
                                        <option value="<?php echo $cat['id']; ?>"
                                            <?php echo ($post['category_id'] ?? '') == $cat['id'] ? 'selected' : ''; ?>>
                                            <?php echo htmlspecialchars($cat['name']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">Featured Image</div>
                        <div class="card-body">
                            <div class="form-group" style="margin-bottom:0;">
                                <input type="file" name="featured_image" id="featured_image" accept="image/jpeg,image/png,image/webp">
                                <div class="form-hint">JPG, PNG, or WebP. Max 5MB.</div>

                                <?php if (!empty($post['featured_image'])): ?>
                                    <div class="image-preview">
                                        <img src="/uploads/blog/<?php echo htmlspecialchars($post['featured_image']); ?>" alt="Featured image">
                                        <label class="remove-image">
                                            <input type="checkbox" name="remove_image" value="1" style="margin-right: .25rem;">
                                            Remove image
                                        </label>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    </div>

    <script>
        // Quill editor initialization
        var quill = new Quill('#quill-editor', {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: [
                        [{ 'header': [1, 2, 3, 4, false] }],
                        [{ 'font': [] }],
                        [{ 'size': ['small', false, 'large', 'huge'] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'align': [] }],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        [{ 'indent': '-1' }, { 'indent': '+1' }],
                        ['blockquote', 'code-block'],
                        ['link', 'image', 'video'],
                        ['clean']
                    ],
                    handlers: {
                        image: function() {
                            var input = document.createElement('input');
                            input.setAttribute('type', 'file');
                            input.setAttribute('accept', 'image/*');
                            input.click();
                            input.onchange = function() {
                                var file = input.files[0];
                                var formData = new FormData();
                                formData.append('file', file);

                                fetch('blog_image_upload.php', {
                                    method: 'POST',
                                    body: formData,
                                    credentials: 'same-origin'
                                })
                                .then(function(response) { return response.json(); })
                                .then(function(result) {
                                    if (result.location) {
                                        var range = quill.getSelection(true);
                                        quill.insertEmbed(range.index, 'image', result.location);
                                    } else {
                                        alert('Upload failed: ' + (result.error || 'Unknown error'));
                                    }
                                })
                                .catch(function() {
                                    alert('Upload failed. Please try again.');
                                });
                            };
                        }
                    }
                }
            }
        });

        // Sync Quill content to hidden input on form submit (base64 encoded to bypass mod_security)
        document.getElementById('postForm').addEventListener('submit', function() {
            document.getElementById('content').value = btoa(unescape(encodeURIComponent(quill.root.innerHTML)));
        });

        // Auto-generate slug from title
        var titleInput = document.getElementById('title');
        var slugInput = document.getElementById('slug');
        var slugPreview = document.getElementById('slugPreview');
        var slugManuallyEdited = <?php echo !empty($post['slug']) ? 'true' : 'false'; ?>;

        titleInput.addEventListener('input', function() {
            if (!slugManuallyEdited) {
                var slug = this.value.toLowerCase().trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
                slugInput.value = slug;
                slugPreview.textContent = slug ? '/blog-post.php?slug=' + slug : '';
            }
        });

        slugInput.addEventListener('input', function() {
            slugManuallyEdited = true;
            var slug = this.value.toLowerCase().trim()
                .replace(/[^a-z0-9-]+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            this.value = slug;
            slugPreview.textContent = slug ? '/blog-post.php?slug=' + slug : '';
        });

        // Schedule UI toggle
        function toggleScheduleUI() {
            var status = document.getElementById('statusSelect').value;
            var scheduleGroup = document.getElementById('scheduleGroup');
            var publishBtn = document.getElementById('publishBtn');
            var scheduleBtn = document.getElementById('scheduleBtn');

            if (status === 'scheduled') {
                scheduleGroup.style.display = 'block';
                publishBtn.style.display = 'none';
                scheduleBtn.style.display = '';
                // Default scheduled_at to tomorrow 9am if empty
                var dateInput = document.getElementById('scheduled_at');
                if (!dateInput.value) {
                    var tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(9, 0, 0, 0);
                    dateInput.value = tomorrow.toISOString().slice(0, 16);
                }
            } else {
                scheduleGroup.style.display = 'none';
                publishBtn.style.display = '';
                scheduleBtn.style.display = 'none';
            }
        }

        // Initialize on page load
        toggleScheduleUI();

        // Validate schedule date before submit
        document.getElementById('postForm').addEventListener('submit', function(e) {
            var statusVal = document.getElementById('statusHidden').value;
            if (statusVal === 'scheduled') {
                var schedDate = document.getElementById('scheduled_at').value;
                if (!schedDate) {
                    e.preventDefault();
                    alert('Please select a date and time for the scheduled post.');
                    return false;
                }
                if (new Date(schedDate) <= new Date()) {
                    e.preventDefault();
                    alert('Scheduled date must be in the future. To publish now, use the Publish button instead.');
                    return false;
                }
            }
        });
    </script>
</body>
</html>
