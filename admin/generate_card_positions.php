<?php
/**
 * One-time backfill: Generate default positions for all existing cards
 * that don't have positions yet. Safe to re-run.
 */
require_once '../config.php';
require_once 'campaign_functions.php';
requireCampaignAdminLogin();

$db = getDB();
$messages = [];

try {
    // Get all cards
    $cards = $db->query("SELECT id, neighborhood_name FROM " . getTable('cards'))->fetchAll(PDO::FETCH_ASSOC);

    foreach ($cards as $card) {
        // Check if positions already exist for this card
        $stmt = $db->prepare("SELECT COUNT(*) FROM " . getTable('card_positions') . " WHERE card_id = ?");
        $stmt->execute([$card['id']]);
        $count = (int)$stmt->fetchColumn();

        if ($count > 0) {
            $messages[] = htmlspecialchars($card['neighborhood_name']) . ': already has ' . $count . ' positions, skipped.';
            continue;
        }

        generateDefaultPositions($card['id']);
        $messages[] = htmlspecialchars($card['neighborhood_name']) . ': generated 16 default positions.';
    }

    if (empty($cards)) {
        $messages[] = 'No cards found in the database.';
    }
} catch (Exception $e) {
    $messages[] = 'ERROR: ' . $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Generate Card Positions</title>
    <style>
        body { font-family: 'Inter', sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; }
        .msg { padding: 12px 16px; margin: 8px 0; border-radius: 8px; background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
        .msg.error { background: #fee2e2; border-color: #ef4444; color: #991b1b; }
        .msg.skip { background: #fef3c7; border-color: #f59e0b; color: #92400e; }
        a { color: #38b6ff; }
    </style>
</head>
<body>
    <h1>Generate Card Positions</h1>
    <p style="color: #64748b; margin-bottom: 20px;">Creates default 16-position grid (8 singles per side) for cards that don't have positions yet.</p>
    <?php foreach ($messages as $m): ?>
        <div class="msg <?= strpos($m, 'ERROR') === 0 ? 'error' : (strpos($m, 'skipped') !== false ? 'skip' : '') ?>"><?= $m ?></div>
    <?php endforeach; ?>
    <p style="margin-top: 20px;"><a href="manage_cards.php">Back to Manage Cards &rarr;</a></p>
</body>
</html>
