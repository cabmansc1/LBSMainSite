<?php
/**
 * Shared admin navigation
 * Include on all admin pages: require_once __DIR__ . '/includes/nav.php';
 * Set $currentPage before including to highlight the active nav item.
 *
 * Expected: $currentPage = 'dashboard' | 'directory' | 'campaigns' | 'pipeline' | 'leads' | 'blog'
 *           $currentAdmin (from getCurrentCampaignAdmin())
 */
$currentPage = $currentPage ?? '';
?>
<nav class="admin-nav">
    <div class="admin-nav-inner">
        <a href="dashboard.php" class="admin-nav-brand">LBS Admin</a>
        <button class="admin-nav-toggle" aria-label="Toggle menu" aria-expanded="false">
            <span></span><span></span><span></span>
        </button>
        <div class="admin-nav-links">
            <a href="dashboard.php" class="admin-nav-link <?= $currentPage === 'dashboard' ? 'active' : '' ?>">Dashboard</a>
            <a href="manage_directory.php" class="admin-nav-link <?= $currentPage === 'directory' ? 'active' : '' ?>">Directory</a>
            <a href="dashboard.php#campaigns" class="admin-nav-link <?= $currentPage === 'campaigns' ? 'active' : '' ?>">Campaigns</a>
            <a href="pipeline.php" class="admin-nav-link <?= $currentPage === 'pipeline' ? 'active' : '' ?>">Pipeline</a>
            <a href="leads.php" class="admin-nav-link <?= $currentPage === 'leads' ? 'active' : '' ?>">Leads</a>
            <a href="inquiries.php" class="admin-nav-link <?= $currentPage === 'inquiries' ? 'active' : '' ?>">Inquiries</a>
            <a href="manage_blog.php" class="admin-nav-link <?= $currentPage === 'blog' ? 'active' : '' ?>">Blog</a>
            <a href="manage_cards.php" class="admin-nav-link <?= $currentPage === 'cards' ? 'active' : '' ?>">Cards</a>
            <a href="site_stats.php" class="admin-nav-link <?= $currentPage === 'site_stats' ? 'active' : '' ?>">Stats Bar</a>
            <div class="admin-nav-right">
                <span class="admin-nav-user"><?= htmlspecialchars($currentAdmin['username'] ?? 'Admin') ?></span>
                <a href="logout.php" class="admin-nav-link admin-nav-logout">Logout</a>
            </div>
        </div>
    </div>
</nav>

<style>
/* ── Admin Nav ── */
.admin-nav {
    background: linear-gradient(135deg, #1f2937, #111827);
    padding: 0 20px;
    position: sticky; top: 0; z-index: 3000;
    box-shadow: 0 4px 12px rgba(0,0,0,.15);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
.admin-nav-inner {
    max-width: 1400px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
    height: 56px;
}
.admin-nav-brand {
    font-size: 1.15rem; font-weight: 800; color: #38b6ff;
    text-decoration: none; letter-spacing: -0.5px; white-space: nowrap;
}
.admin-nav-links {
    display: flex; align-items: center; gap: 4px;
}
.admin-nav-link {
    color: #cbd5e1; text-decoration: none; font-weight: 500;
    font-size: .85rem; padding: 6px 12px; border-radius: 6px;
    transition: color .2s, background .2s; white-space: nowrap;
}
.admin-nav-link:hover { color: #fff; background: rgba(255,255,255,.08); }
.admin-nav-link.active { color: #38b6ff; background: rgba(56,182,255,.12); }
.admin-nav-logout { color: #f87171; }
.admin-nav-logout:hover { color: #fca5a5; background: rgba(248,113,113,.1); }
.admin-nav-right {
    display: flex; align-items: center; gap: 8px;
    margin-left: 16px; padding-left: 16px;
    border-left: 1px solid rgba(255,255,255,.12);
}
.admin-nav-user { color: #94a3b8; font-size: .8rem; font-weight: 500; }
.admin-nav-toggle { display: none; background: none; border: none; cursor: pointer; padding: 4px; }
.admin-nav-toggle span { display: block; width: 22px; height: 2px; background: #fff; margin: 5px 0; transition: transform .3s, opacity .3s; }

@media (max-width: 768px) {
    .admin-nav-inner { flex-wrap: wrap; height: auto; padding: 12px 0; }
    .admin-nav-toggle { display: block; }
    .admin-nav-links {
        display: none; flex-direction: column; width: 100%;
        padding: 8px 0 4px; gap: 2px;
    }
    .admin-nav-links.show { display: flex; }
    .admin-nav-link { display: block; padding: 10px 12px; width: 100%; }
    .admin-nav-right {
        margin-left: 0; padding-left: 0; border-left: none;
        width: 100%; padding-top: 8px; margin-top: 4px;
        border-top: 1px solid rgba(255,255,255,.1);
        justify-content: space-between;
    }
}
</style>

<script>
(function(){
    var toggle = document.querySelector('.admin-nav-toggle');
    var links = document.querySelector('.admin-nav-links');
    if (toggle && links) {
        toggle.addEventListener('click', function() {
            links.classList.toggle('show');
            var open = links.classList.contains('show');
            toggle.setAttribute('aria-expanded', String(open));
            var bars = toggle.querySelectorAll('span');
            if (open) {
                bars[0].style.transform = 'translateY(7px) rotate(45deg)';
                bars[1].style.opacity = '0';
                bars[2].style.transform = 'translateY(-7px) rotate(-45deg)';
            } else {
                bars[0].style.transform = '';
                bars[1].style.opacity = '1';
                bars[2].style.transform = '';
            }
        });
    }
})();
</script>
