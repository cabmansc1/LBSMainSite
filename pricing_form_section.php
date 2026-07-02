<?php
/**
 * PRICING FORM SECTION - Modular pricing and form component
 * Usage: Set $location variable before including this file
 */

// Don't reload pricing_config if already loaded
if (!isset($pricing) || !isset($location_data)) {
    require_once 'pricing_config.php';
}

// Generate CSRF token if not already set
if (!isset($csrf_token)) {
    require_once 'config.php';
    $csrf_token = generateCSRFToken();
}

// Validate location is set and exists in data
if (!isset($location) || !isset($location_data[$location])) {
    error_log("Pricing form section error: Invalid or missing location - " . ($location ?? 'not set'));
    echo '<div style="background: #fee2e2; padding: 20px; margin: 20px; border-radius: 8px; color: #991b1b;">Configuration error. Please contact support.</div>';
    return;
}

// Get location-specific data
$loc = $location_data[$location];
$bundle = $bundle_text[$location];
?>

<!-- Pricing Section -->
<section class="section light">
    <div class="container">
        <div class="section-header">
            <h2>Ad Sizes & Pricing</h2>
            <p>Choose the perfect size for your marketing goals</p>
        </div>
        
        <!-- Pricing Toggle -->
        <div style="text-align: center; margin-bottom: 40px;">
            <div style="background: white; border-radius: 50px; display: inline-flex; padding: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
                <button id="pricing-5k" class="pricing-toggle active" onclick="showPricing('5k')" type="button"
                        style="padding: 12px 24px; border: none; border-radius: 50px; background: #38b6ff; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                    <?php echo htmlspecialchars($loc['households_5k']); ?> Households
                </button>
                <button id="pricing-10k" class="pricing-toggle" onclick="showPricing('10k')" type="button"
                        style="padding: 12px 24px; border: none; border-radius: 50px; background: transparent; color: #64748b; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                    <?php echo htmlspecialchars($loc['households_10k']); ?> Households
                </button>
            </div>
            <p style="margin-top: 15px; color: #64748b; font-size: 0.95rem;">
                Select your desired reach to see pricing
            </p>
        </div>
        
        <!-- 5K Pricing Grid -->
        <div id="pricing-grid-5k" class="pricing-grid">
            <?php foreach($pricing['5k'] as $key => $tier): ?>
            <div class="pricing-card <?php echo $key === 'medium' ? 'featured' : ''; ?>">
                <?php if($key === 'medium'): ?>
                <div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: #ff8c00; color: white; padding: 8px 20px; border-radius: 20px; font-size: 0.875rem; font-weight: 600;">MOST POPULAR</div>
                <?php endif; ?>
                <h3><?php echo htmlspecialchars($tier['size']); ?> Ad</h3>
                <div class="price">$<?php echo htmlspecialchars($tier['price']); ?></div>
                <p style="color: #64748b; margin-bottom: 20px;"><?php echo htmlspecialchars($tier['description']); ?></p>
                <ul>
                    <li>Great for brand awareness</li>
                    <li>Logo + offer + QR code</li>
                    <li>Free ad design</li>
                    <li><?php echo htmlspecialchars($loc['households_5k']); ?> household reach</li>
                </ul>
                <a href="#reserve" class="btn-primary" onclick="selectPackage('5k', '<?php echo htmlspecialchars($key); ?>', '<?php echo htmlspecialchars($tier['size']); ?>', <?php echo htmlspecialchars($tier['price']); ?>); return false;">Reserve <?php echo htmlspecialchars($tier['size']); ?></a>
            </div>
            <?php endforeach; ?>
        </div>
        
        <!-- 10K Pricing Grid -->
        <div id="pricing-grid-10k" class="pricing-grid" style="display: none;">
            <?php foreach($pricing['10k'] as $key => $tier): ?>
            <div class="pricing-card <?php echo $key === 'medium' ? 'featured' : ''; ?>">
                <?php if($key === 'medium'): ?>
                <div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: #ff8c00; color: white; padding: 8px 20px; border-radius: 20px; font-size: 0.875rem; font-weight: 600;">MOST POPULAR</div>
                <?php endif; ?>
                <h3><?php echo htmlspecialchars($tier['size']); ?> Ad</h3>
                <div class="price">$<?php echo htmlspecialchars($tier['price']); ?></div>
                <p style="color: #64748b; margin-bottom: 20px;"><?php echo htmlspecialchars($tier['description']); ?></p>
                <ul>
                    <li>Maximum market coverage</li>
                    <li>Logo + offer + QR code</li>
                    <li>Free ad design</li>
                    <li><?php echo htmlspecialchars($loc['households_10k']); ?> household reach</li>
                </ul>
                <a href="#reserve" class="btn-primary" onclick="selectPackage('10k', '<?php echo htmlspecialchars($key); ?>', '<?php echo htmlspecialchars($tier['size']); ?>', <?php echo htmlspecialchars($tier['price']); ?>); return false;">Reserve <?php echo htmlspecialchars($tier['size']); ?></a>
            </div>
            <?php endforeach; ?>
        </div>
        
        <p style="text-align:center; margin-top:20px; color:#64748b;">
            <?php echo htmlspecialchars($bundle); ?>
        </p>
    </div>
</section>

<!-- Reserve Form -->
<section id="reserve" class="section">
    <div class="container">
        <div class="section-header">
            <h2>Reserve Your Spot</h2>
            <p>Fill this short form and we'll confirm availability for your category in <?php echo htmlspecialchars($loc['name']); ?></p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start;">
            <div class="form-container">
                <form action="process_form.php" method="post" id="pricing-form">
                    <!-- CSRF Token -->
                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                    
                    <!-- Hidden field to track location -->
                    <input type="hidden" name="location" value="<?php echo htmlspecialchars($location); ?>">
                    
                    <!-- Hidden fields that will be populated by the pricing toggle -->
                    <input type="hidden" name="distribution_reach" id="selected-reach" value="5k">
                    <input type="hidden" name="ad_size" id="selected-size" value="3×2">
                    <input type="hidden" name="ad_price" id="selected-price" value="199">
                    
                    <div class="form-group">
                        <input class="form-control" name="company_name" type="text" placeholder="Business Name *" required>
                    </div>
                    <div class="form-group">
                        <input class="form-control" name="contact_name" type="text" placeholder="Your Name *" required>
                    </div>
                    <div class="form-group">
                        <input class="form-control" name="email" type="email" placeholder="Email *" required>
                    </div>
                    <!-- Phone field removed: SMS opt-in handled by chat widget only.
                    <div class="form-group">
                        <input class="form-control" name="phone" type="tel" placeholder="Phone">
                    </div>
                    -->
                    <div class="form-group">
                        <input class="form-control" name="notes" type="text" placeholder="Your Category (e.g., HVAC, Dental, Landscaping)">
                    </div>
                    
                    <!-- Display current selection -->
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                        <strong>Selected Package:</strong>
                        <div id="selection-display" style="color: #38b6ff; font-weight: 600; margin-top: 5px;">
                            3×2 Ad - <?php echo htmlspecialchars($loc['households_5k']); ?> Households ($199)
                        </div>
                        <small style="color: #64748b;">Use the pricing section above to change your selection</small>
                    </div>
                    
                    <button class="btn-primary" type="submit" style="width: 100%;">Check Availability</button>
                </form>
                <p style="color:#64748b; margin-top:15px; text-align: center;">Prefer to call? <a href="tel:843-212-2969" style="color: #38b6ff;">843-212-2969</a></p>
            </div>
            
            <div class="form-container">
                <h3 style="margin-bottom: 20px; color: #000;">What You Get</h3>
                <ul style="list-style: none; padding: 0; margin-bottom: 30px;">
                    <?php foreach($benefits as $benefit): ?>
                    <li style="padding: 8px 0; display: flex; align-items: flex-start; gap: 10px;">
                        <span style="color: #ff8c00; font-weight: bold;">✓</span>
                        <span><strong><?php echo htmlspecialchars($benefit); ?></strong></span>
                    </li>
                    <?php endforeach; ?>
                    <li style="padding: 8px 0; display: flex; align-items: flex-start; gap: 10px;">
                        <span style="color: #ff8c00; font-weight: bold;">✓</span>
                        <span><strong><span id="delivery-count"><?php echo htmlspecialchars($loc['households_5k']); ?></span> deliveries</strong> in <?php echo htmlspecialchars($loc['name']); ?></span>
                    </li>
                </ul>
                
                <h3 style="margin-bottom: 20px; color: #000;">Also Available</h3>
                <ul style="list-style: none; padding: 0; margin-bottom: 30px;">
                    <?php foreach($also_available as $item): ?>
                    <li style="padding: 8px 0; display: flex; align-items: flex-start; gap: 10px;">
                        <span style="color: #ff8c00; font-weight: bold;">✓</span>
                        <span><?php echo htmlspecialchars($item); ?></span>
                    </li>
                    <?php endforeach; ?>
                </ul>

                <h3 style="margin-bottom: 20px; color: #000;">How It Works</h3>
                <ol style="list-style: none; padding: 0; margin-bottom: 30px; counter-reset: step-counter;">
                    <li style="padding: 10px 0; display: flex; align-items: flex-start; gap: 12px;">
                        <span style="background: #38b6ff; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; flex-shrink: 0;">1</span>
                        <span><strong>Reserve your spot</strong> - Submit form, we confirm availability</span>
                    </li>
                    <li style="padding: 10px 0; display: flex; align-items: flex-start; gap: 12px;">
                        <span style="background: #38b6ff; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; flex-shrink: 0;">2</span>
                        <span><strong>We design your ad</strong> - Free professional design within 3-5 days</span>
                    </li>
                    <li style="padding: 10px 0; display: flex; align-items: flex-start; gap: 12px;">
                        <span style="background: #38b6ff; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; flex-shrink: 0;">3</span>
                        <span><strong>Print & mail</strong> - Printing, postage & delivery all included</span>
                    </li>
                </ol>

                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #38b6ff;">
                    <p style="margin: 0; color: #0369a1; font-size: 0.9rem;"><strong>No minimum commitment</strong> - Try one mailing to see results before committing to more.</p>
                </div>

                <!-- Contact Info -->
                <div class="contact-banner">
                    <h3>Ready to Get Started?</h3>
                    <div class="contact-info">
                        <div class="contact-item">
                            <span>📞</span>
                            <a href="tel:843-212-2969">843-212-2969</a>
                        </div>
                        <div class="contact-item">
                            <span>✉️</span>
                            <a href="mailto:hello@lbspotlight.com">hello@lbspotlight.com</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<script>
// Pricing configuration for JavaScript
const pricingData = <?php echo json_encode($pricing); ?>;
const locationData = <?php echo json_encode($loc); ?>;

function showPricing(type) {

    // Hide all pricing grids
    const grid5k = document.getElementById('pricing-grid-5k');
    const grid10k = document.getElementById('pricing-grid-10k');

    if (!grid5k || !grid10k) {
        return;
    }

    grid5k.style.display = 'none';
    grid10k.style.display = 'none';

    // Show selected pricing grid
    document.getElementById('pricing-grid-' + type).style.display = 'grid';
    
    // Update toggle buttons
    document.querySelectorAll('.pricing-toggle').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = '#64748b';
    });
    
    const activeBtn = document.getElementById('pricing-' + type);
    if (activeBtn) {
        activeBtn.style.background = '#38b6ff';
        activeBtn.style.color = 'white';
    }
    
    // Update delivery count
    updateDeliveryCount(type);
}

function selectPackage(reachType, sizeKey, sizeDisplay, price) {
    
    // Remove selected state from all pricing cards
    document.querySelectorAll('.pricing-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected state to the clicked card - find the button's parent card
    const clickedButton = event.target;
    const parentCard = clickedButton.closest('.pricing-card');
    if (parentCard) {
        parentCard.classList.add('selected');
    }
    
    // Update hidden form fields
    document.getElementById('selected-reach').value = reachType;
    document.getElementById('selected-size').value = sizeDisplay;
    document.getElementById('selected-price').value = price;
    
    // Update display
    let households;
    if (reachType === '5k') {
        households = locationData.households_5k;
    } else {
        households = locationData.households_10k;
    }
    const displayElement = document.getElementById('selection-display');
    if (displayElement) {
        displayElement.textContent = sizeDisplay + ' Ad - ' + households + ' Households ($' + price + ')';
    }
    
    // Scroll to form
    const reserveSection = document.getElementById('reserve');
    if (reserveSection) {
        reserveSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function updateDeliveryCount(type) {
    const countElement = document.getElementById('delivery-count');
    if (countElement) {
        if (type === '5k') {
            countElement.textContent = locationData.households_5k;
        } else {
            countElement.textContent = locationData.households_10k;
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Default to 5k pricing
    showPricing('5k');
});
</script>

<style>
/* Additional styles for pricing toggle and featured cards */
.pricing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
    margin-bottom: 60px;
}

.pricing-card {
    background: white;
    padding: 40px 30px;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    border: 1px solid #e2e8f0;
    position: relative;
}

.pricing-card.featured {
    border: 2px solid #ff8c00;
    box-shadow: 0 8px 35px rgba(234, 88, 12, 0.15);
}

.pricing-card.selected {
    border: 3px solid #22c55e !important;
    box-shadow: 0 8px 35px rgba(34, 197, 94, 0.25) !important;
    transform: translateY(-5px) !important;
}

.pricing-card.selected .price {
    color: #22c55e;
}

.pricing-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
}

.pricing-card h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #000000;
    margin-bottom: 15px;
}

.price {
    font-size: 2.5rem;
    font-weight: 800;
    color: #ff8c00;
    margin-bottom: 20px;
}

.pricing-card ul {
    list-style: none;
    padding: 0;
    margin-bottom: 30px;
    text-align: left;
}

.pricing-card li {
    padding: 8px 0;
    color: #64748b;
    font-size: 1rem;
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.pricing-card li::before {
    content: "✓";
    color: #ff8c00;
    font-weight: bold;
    font-size: 14px;
    margin-top: 2px;
    flex-shrink: 0;
}

.pricing-toggle:hover {
    background: #f1f5f9 !important;
    color: #334155 !important;
}

@media (max-width: 768px) {
    .pricing-grid {
        grid-template-columns: 1fr;
    }
    
    .pricing-toggle {
        font-size: 0.9rem !important;
        padding: 10px 16px !important;
    }
    
    div[style*="grid-template-columns: 1fr 1fr"] {
        grid-template-columns: 1fr !important;
    }
}
</style>