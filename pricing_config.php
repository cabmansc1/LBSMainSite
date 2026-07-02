<?php
// pricing_config.php - Centralized pricing configuration

// Location-specific data
$location_data = [
    'summerville' => [
        'name' => 'Summerville',
        'households_5k' => '5,000+',
        'households_10k' => '10,000+',
        'zip_codes' => '29483, 29485, 29486'
    ],
    'mount-pleasant' => [
        'name' => 'Mount Pleasant',
        'households_5k' => '5,000+',
        'households_10k' => '10,000+',
        'zip_codes' => '29464, 29466'
    ],
    'daniel-island' => [
        'name' => 'Daniel Island & Clements Ferry',
        'households_5k' => '5,000+',
        'households_10k' => '10,000+',
        'zip_codes' => '29492'
    ],
    'north-charleston' => [
        'name' => 'North Charleston',
        'households_5k' => '5,000+',
        'households_10k' => '10,000+',
        'zip_codes' => '29405, 29406, 29418, 29420'
    ],
    'moncks-corner' => [
        'name' => 'Moncks Corner',
        'households_5k' => '5,000+',
        'households_10k' => '10,000+',
        'zip_codes' => '29461'
    ],
    'charleston' => [
        'name' => 'Charleston',
        'households_5k' => '5,000+',
        'households_10k' => '10,000+',
        'zip_codes' => '29401, 29403, 29407, 29412, 29414, 29439, 29455'
    ],
    'goose-creek' => [
        'name' => 'Goose Creek',
        'households_5k' => '5,000+',
        'households_10k' => '10,000+',
        'zip_codes' => '29445'
    ],
    'sullivans-island' => [
        'name' => 'Sullivans Island',
        'households_5k' => '5,000+',
        'households_10k' => '10,000+',
        'zip_codes' => '29482'
    ],
    'isle-of-palms' => [
        'name' => 'Isle of Palms',
        'households_5k' => '5,000+',
        'households_10k' => '10,000+',
        'zip_codes' => '29451'
    ],
    'james-island' => [
        'name' => 'James Island',
        'households_5k' => '5,000+',
        'households_10k' => '10,000+',
        'zip_codes' => '29412'
    ],
    'johns-island' => [
        'name' => 'Johns Island',
        'households_5k' => '5,000+',
        'households_10k' => '10,000+',
        'zip_codes' => '29455'
    ]
];

// Pricing structure - easy to update in one place
$pricing = [
    '5k' => [
        'small' => [
            'size' => '3×2',
            'price' => 199,
            'description' => 'Business card size'
        ],
        'medium' => [
            'size' => '3×4', 
            'price' => 299,
            'description' => '~3 inches x 4 inches'
        ],
        'large' => [
            'size' => '4×6',
            'price' => 549,
            'description' => '~4 inches x 6 inches'
        ]
    ],
    '10k' => [
        'small' => [
            'size' => '3×2',
            'price' => 299,
            'description' => 'Business card size'
        ],
        'medium' => [
            'size' => '3×4',
            'price' => 549,
            'description' => '~3 inches x 4 inches'
        ],
        'large' => [
            'size' => '4×6',
            'price' => 949,
            'description' => '~4 inches x 6 inches'
        ]
    ]
];

// Multi-zone bundle text
$bundle_text = [
    'summerville' => 'Ask about multi-zone bundles (Summerville · Mount Pleasant · Daniel Island/Clements Ferry) and multi-card commitments.',
    'mount-pleasant' => 'Ask about multi-zone bundles (Mount Pleasant · Summerville · Daniel Island/Clements Ferry) and multi-card commitments.',
    'daniel-island' => 'Ask about multi-zone bundles (Daniel Island · Mount Pleasant · Summerville) and multi-card commitments.',
    'north-charleston' => 'Ask about multi-zone bundles (North Charleston · Summerville · Mount Pleasant · Daniel Island) and multi-card commitments.',
    'moncks-corner' => 'Ask about multi-zone bundles (Moncks Corner · Summerville · North Charleston · Daniel Island) and multi-card commitments.',
    'charleston' => 'Ask about multi-zone bundles (Charleston · Mount Pleasant · Summerville · Daniel Island) and multi-card commitments.',
    'goose-creek' => 'Ask about multi-zone bundles (Goose Creek · Summerville · North Charleston · Charleston) and multi-card commitments.',
    'sullivans-island' => 'Ask about multi-zone bundles (Sullivans Island · Mount Pleasant · Isle of Palms · Daniel Island) and multi-card commitments.',
    'isle-of-palms' => 'Ask about multi-zone bundles (Isle of Palms · Mount Pleasant · Sullivans Island · Daniel Island) and multi-card commitments.',
    'james-island' => 'Ask about multi-zone bundles (James Island · Charleston · Johns Island · Sullivans Island) and multi-card commitments.',
    'johns-island' => 'Ask about multi-zone bundles (Johns Island · Charleston · James Island · Summerville) and multi-card commitments.'
];

// What's included benefits
$benefits = [
    'Exclusive placement in your category',
    'Free ad design (copy + layout)', 
    'QR/URL tracking available',
    'Spotlight post on our socials'
];

// Also available items
$also_available = [
    'Multi-zone bundles',
    'Directory & social add-ons'
];
?>