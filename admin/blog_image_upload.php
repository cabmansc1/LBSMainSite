<?php
// admin/blog_image_upload.php - Handle image uploads from TinyMCE editor
require_once '../config.php';
require_once 'campaign_functions.php';

requireCampaignAdminLogin();

header('Content-Type: application/json');

try {
    if (empty($_FILES['file'])) {
        throw new Exception('No file uploaded');
    }

    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Upload error code: ' . $file['error']);
    }

    // Validate MIME type
    $mimeType = $file['type'];
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
    }

    if (!in_array($mimeType, ALLOWED_IMAGE_TYPES)) {
        throw new Exception('Invalid file type. Allowed: JPG, PNG, WebP.');
    }

    // Validate size
    if ($file['size'] > MAX_FILE_SIZE) {
        throw new Exception('File too large. Maximum size is 5MB.');
    }

    // Ensure blog upload directory exists
    $blogUploadDir = UPLOAD_DIR . 'blog/';
    if (!is_dir($blogUploadDir)) {
        mkdir($blogUploadDir, 0755, true);
    }

    // Generate unique filename
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp'])) {
        $extension = 'jpg';
    }
    $filename = 'blog_' . uniqid() . '_' . time() . '.' . $extension;
    $filepath = $blogUploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to save uploaded file');
    }

    echo json_encode(['location' => '/uploads/blog/' . $filename]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
