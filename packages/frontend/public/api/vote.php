<?php
/**
 * Vote API — handles upvotes for living listicle pages.
 * POST /api/vote.php
 * Body: { "model_username": "xxx", "category_slug": "asian-cams", "visitor_token": "xxx" }
 * Returns: { "success": true, "votes": 42 } or { "success": false, "error": "..." }
 */
require_once __DIR__ . '/_config.php';
require_once __DIR__ . '/_db.php';

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Parse JSON body
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON body']);
    exit;
}

$modelUsername = trim($input['model_username'] ?? '');
$categorySlug = trim($input['category_slug'] ?? '');
$visitorToken = trim($input['visitor_token'] ?? '');

// Validate required fields
if (!$modelUsername || !$categorySlug || !$visitorToken) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields: model_username, category_slug, visitor_token']);
    exit;
}

// Validate field lengths
if (strlen($modelUsername) > 100 || strlen($categorySlug) > 100 || strlen($visitorToken) > 64) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Field too long']);
    exit;
}

// Validate visitor_token format (hex string)
if (!preg_match('/^[a-f0-9]{16,64}$/i', $visitorToken)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid visitor_token format']);
    exit;
}

// Validate category_slug format (lowercase, hyphens, no weird chars)
if (!preg_match('/^[a-z0-9-]{2,100}$/', $categorySlug)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid category_slug format']);
    exit;
}

try {
    $db = getDB();

    // Insert vote (UNIQUE KEY prevents duplicates — same visitor can't vote twice for same model in same category)
    $stmt = $db->prepare(
        "INSERT IGNORE INTO user_votes (model_username, category_slug, visitor_token) VALUES (?, ?, ?)"
    );
    $stmt->execute([$modelUsername, $categorySlug, $visitorToken]);

    $wasInserted = $stmt->rowCount() > 0;

    // Get total vote count for this model in this category
    $countStmt = $db->prepare(
        "SELECT COUNT(*) as votes FROM user_votes WHERE model_username = ? AND category_slug = ?"
    );
    $countStmt->execute([$modelUsername, $categorySlug]);
    $votes = (int) $countStmt->fetchColumn();

    echo json_encode([
        'success' => true,
        'voted' => $wasInserted,
        'votes' => $votes,
        'message' => $wasInserted ? 'Vote recorded' : 'Already voted',
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
    error_log('[vote] DB error: ' . $e->getMessage());
}
