<?php
/**
 * Stripe Helper Layer
 * Loads Stripe PHP SDK, provides checkout/refund helpers.
 */

require_once __DIR__ . '/config.php';

// Load Stripe keys from secure config above docroot
$stripe_config_path = dirname(__DIR__) . '/secure/stripe_config.php';
if (file_exists($stripe_config_path)) {
    require_once $stripe_config_path;
} else {
    error_log("CRITICAL: stripe_config.php not found at: " . $stripe_config_path);
    throw new Exception('Stripe configuration not available.');
}

// Load Stripe PHP SDK (installed via Composer)
$autoload = __DIR__ . '/vendor/autoload.php';
if (file_exists($autoload)) {
    require_once $autoload;
} else {
    error_log("CRITICAL: Stripe SDK not installed. Run: composer require stripe/stripe-php");
    throw new Exception('Stripe SDK not installed.');
}

\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
\Stripe\Stripe::setApiVersion(STRIPE_API_VERSION);

/**
 * Create a Stripe Checkout Session for a community card spot purchase.
 */
function createCheckoutSession($order, $spotType, $card, $customerEmail) {
    // Use the order's amount_cents (per-card pricing) if available, otherwise fall back to spot type
    $unitAmount = isset($order['amount_cents']) ? (int)$order['amount_cents'] : (int)$spotType['price_cents'];

    $session = \Stripe\Checkout\Session::create([
        'payment_method_types' => ['card'],
        'mode' => 'payment',
        'customer_email' => $customerEmail,
        'line_items' => [[
            'price_data' => [
                'currency' => 'usd',
                'unit_amount' => $unitAmount,
                'product_data' => [
                    'name' => $spotType['display_name'] . ' Ad Spot',
                    'description' => 'Community Card: ' . $card['neighborhood_name'] . ' (' . $spotType['dimensions'] . ')',
                ],
            ],
            'quantity' => 1,
        ]],
        'metadata' => [
            'order_id' => $order['id'],
            'card_id' => $card['id'],
            'spot_type_id' => $spotType['id'],
        ],
        'success_url' => SITE_URL . '/neighborhood-card-success.php?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => SITE_URL . '/neighborhood-card/' . urlencode($card['slug']) . '/?cancelled=1',
    ]);

    return $session;
}

/**
 * Retrieve a Stripe Checkout Session by ID.
 */
function getStripeSession($sessionId) {
    return \Stripe\Checkout\Session::retrieve($sessionId);
}

/**
 * Construct and verify a Stripe webhook event from the raw payload.
 */
function getStripeEvent($payload, $sigHeader) {
    return \Stripe\Webhook::constructEvent($payload, $sigHeader, STRIPE_WEBHOOK_SECRET);
}

/**
 * Issue a full refund for a payment intent.
 */
function issueRefund($paymentIntentId) {
    return \Stripe\Refund::create([
        'payment_intent' => $paymentIntentId,
    ]);
}
