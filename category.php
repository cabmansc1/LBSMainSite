<?php
require_once __DIR__ . '/config.php';

// Check if a category is provided; if not, redirect to the categories page.
if (isset($_GET['category'])) {
    $category = $_GET['category'];
} else {
    header("Location: categories.php");
    exit();
}

// Create database connection using secure config.
$conn = getSecureMySQLiConnection();

// Prepare a query to select all businesses that match the category.
$stmt = $conn->prepare("SELECT * FROM businesses WHERE category = ?");
if(!$stmt) {
    die("Prepare failed: " . $conn->error);
}
$stmt->bind_param("s", $category);
$stmt->execute();
$result = $stmt->get_result();

// Shared SEO head include — dynamic per-category values override the config fallback
$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
if (!empty($category)) {
    $seo['title']       = $category . ' - Business Directory';
    $seo['description'] = 'Browse ' . $category . ' businesses in the Charleston Lowcountry area in the Lowcountry Business Spotlight directory.';
    $seo['canonical']   = SITE_URL . '/category.php?category=' . urlencode($category);
    $seo['h1']          = $category . ' Businesses';
}
include __DIR__ . '/seo_head.php';
?>
  <link rel="stylesheet" href="css/main.css">
  <style>
    /* Additional styles specific to the category page */
    .business-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      padding: 20px;
    }
    .business-card {
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      transition: transform 0.3s ease;
    }
    .business-card:hover {
      transform: translateY(-5px);
    }
    .business-card h3 {
      margin-top: 0;
    }
  </style>
</head>
<body>
  <?php include 'nav.php'; ?>

  <div class="container">
    <h1><?php echo htmlspecialchars($category); ?> Businesses</h1>
    <div class="business-grid">
      <?php
      if ($result->num_rows > 0) {
          while ($row = $result->fetch_assoc()) {
              echo '<div class="business-card">';
              echo '<h3>' . htmlspecialchars($row['name']) . '</h3>';
              echo '<p><strong>Description:</strong> ' . htmlspecialchars($row['description']) . '</p>';
              echo '<p><strong>Address:</strong> ' . htmlspecialchars($row['address']) . '</p>';
              echo '<p><strong>Phone:</strong> ' . htmlspecialchars($row['phone']) . '</p>';
              if (!empty($row['website'])) {
                  echo '<p><a href="' . htmlspecialchars($row['website']) . '" target="_blank">Visit Website</a></p>';
              }
              echo '</div>';
          }
      } else {
          echo "<p>No businesses found in this category.</p>";
      }
      $stmt->close();
      $conn->close();
      ?>
    </div>
    <p><a href="categories.php">Back to Categories</a></p>
  </div>

  <?php include 'footer.php'; ?>
</body>
</html>
