<?php
/**
 * One-time script to generate thumb and medium sizes for existing business photos.
 * Run via CLI:  php /home/cabmansc1/public_html/admin/generate_photo_sizes.php
 */
require_once __DIR__ . '/../config.php';

$baseDir = UPLOAD_DIR . 'business_photos';
$sourceDir = $baseDir . '/';

$files = glob($sourceDir . 'business_photos_*');
$total = count($files);
$generated = 0;
$skipped = 0;
$errors = 0;

echo "Found {$total} photos to process.\n";

foreach ($files as $sourcePath) {
    $filename = basename($sourcePath);

    foreach (IMAGE_SIZES as $sizeName => $dims) {
        $destPath = $baseDir . '/' . $sizeName . '/' . $filename;

        if (file_exists($destPath)) {
            $skipped++;
            continue;
        }

        $result = resizeImage($sourcePath, $destPath, $dims['width'], $dims['height'], $dims['crop']);
        if ($result) {
            $generated++;
            echo "  [{$sizeName}] {$filename}\n";
        } else {
            $errors++;
            echo "  ERROR [{$sizeName}] {$filename}\n";
        }
    }
}

echo "\nDone. Generated: {$generated}, Skipped (already exist): {$skipped}, Errors: {$errors}\n";
