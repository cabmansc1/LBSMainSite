<?php
  $currentPage = basename($_SERVER['PHP_SELF']);
  $summervillePage = 'summerville-direct-mail-marketing.php';
  function active($file, $current){ return $current === $file ? 'active' : ''; }
  $serviceAreaFiles = [
    $summervillePage,
    'mount-pleasant-direct-mail-marketing.php',
    'daniel-island-direct-mail-marketing.php',
    'north-charleston-direct-mail-marketing.php',
    'moncks-corner-direct-mail-marketing.php',
    'goose-creek-direct-mail-marketing.php',
    'sullivans-island-direct-mail-marketing.php',
    'isle-of-palms-direct-mail-marketing.php',
    'james-island-direct-mail-marketing.php',
    'johns-island-direct-mail-marketing.php'
  ];
  $isServiceArea = in_array($currentPage, $serviceAreaFiles, true);
  $advertiseFiles = ['advertise.php','roi-calculator.php','pricing.php'];
  $isAdvertise = in_array($currentPage, $advertiseFiles, true);
?>

<nav class="main-nav" role="navigation" aria-label="Main">
  <div class="nav-container">
    <!-- Contact Info -->
    <div class="nav-contact">
      <a href="tel:843-212-2969" class="contact-link">
        <span class="contact-icons">📞</span>
        <span class="contact-text">843-212-2969</span>
      </a>
      <a href="mailto:hello@lbspotlight.com" class="contact-link">
        <span class="contact-icons">✉️</span>
        <span class="contact-text contact-email-text">hello@lbspotlight.com</span>
      </a>
    </div>

    <!-- Hamburger -->
    <button class="hamburger" aria-label="Toggle menu" aria-expanded="false" aria-controls="primary-menu">
      <span></span><span></span><span></span>
    </button>

    <!-- Primary Menu -->
    <ul id="primary-menu" class="nav-links">
      <li><a href="/index.php" class="<?php echo active('index.php',$currentPage); ?>">Home</a></li>

      <!-- Service Areas DROPDOWN -->
      <li class="has-dropdown">
        <button class="dropdown-toggle <?php echo $isServiceArea?'active':''; ?>" aria-haspopup="true" aria-expanded="false">
          Service Areas
          <svg class="caret" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <ul class="dropdown" aria-label="Service Areas submenu">
          <li><a href="/<?php echo $summervillePage; ?>" class="<?php echo active($summervillePage,$currentPage); ?>">Summerville</a></li>
          <li><a href="/mount-pleasant-direct-mail-marketing.php" class="<?php echo active('mount-pleasant-direct-mail-marketing.php',$currentPage); ?>">Mount Pleasant</a></li>
          <li><a href="/daniel-island-direct-mail-marketing.php" class="<?php echo active('daniel-island-direct-mail-marketing.php',$currentPage); ?>">Daniel Island</a></li>
          <li><a href="/north-charleston-direct-mail-marketing.php" class="<?php echo active('north-charleston-direct-mail-marketing.php',$currentPage); ?>">North Charleston</a></li>
          <li><a href="/moncks-corner-direct-mail-marketing.php" class="<?php echo active('moncks-corner-direct-mail-marketing.php',$currentPage); ?>">Moncks Corner</a></li>
          <li><a href="/goose-creek-direct-mail-marketing.php" class="<?php echo active('goose-creek-direct-mail-marketing.php',$currentPage); ?>">Goose Creek</a></li>
          <li><a href="/sullivans-island-direct-mail-marketing.php" class="<?php echo active('sullivans-island-direct-mail-marketing.php',$currentPage); ?>">Sullivans Island</a></li>
          <li><a href="/isle-of-palms-direct-mail-marketing.php" class="<?php echo active('isle-of-palms-direct-mail-marketing.php',$currentPage); ?>">Isle of Palms</a></li>
          <li><a href="/james-island-direct-mail-marketing.php" class="<?php echo active('james-island-direct-mail-marketing.php',$currentPage); ?>">James Island</a></li>
          <li><a href="/johns-island-direct-mail-marketing.php" class="<?php echo active('johns-island-direct-mail-marketing.php',$currentPage); ?>">Johns Island</a></li>
        </ul>
      </li>

      <!-- Advertise DROPDOWN -->
      <li class="has-dropdown">
        <button class="dropdown-toggle <?php echo $isAdvertise?'active':''; ?>" aria-haspopup="true" aria-expanded="false">
          Advertise
          <svg class="caret" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <ul class="dropdown" aria-label="Advertise submenu">
          <li><a href="/pricing/" class="<?php echo active('pricing.php',$currentPage); ?>">Pricing</a></li>
          <li><a href="/advertise.php" class="<?php echo active('advertise.php',$currentPage); ?>">Spotlight Postcards</a></li>
          <li><a href="/roi-calculator.php" class="<?php echo active('roi-calculator.php',$currentPage); ?>">ROI Calculator</a></li>
        </ul>
      </li>

      <!-- Directory -->
      <li><a href="/directory/" class="<?php echo active('directory.php',$currentPage); ?>">Directory</a></li>

      <!-- Blog -->
      <li><a href="/blog.php" class="<?php echo active('blog.php',$currentPage) ?: active('blog-post.php',$currentPage); ?>">Blog</a></li>

      <li><a href="/contact.php" class="<?php echo active('contact.php',$currentPage); ?>">Contact</a></li>
    </ul>
  </div>
</nav>

<style>
/* NAV fully scoped */
.main-nav{background:#000;padding:12px 0;position:relative;z-index:3000;
  font-family:'Inter',system-ui,-apple-system,Segoe UI,Arial,sans-serif;}
.main-nav *{box-sizing:border-box}
.main-nav .nav-container{max-width:1200px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;}

/* Contact info styling */
.main-nav .nav-contact{display:flex;gap:14px;align-items:center;flex-shrink:0;}
.main-nav .contact-link{
  color:#ff8c00;text-decoration:none;display:flex;align-items:center;gap:5px;
  font-size:.82rem;font-weight:600;transition:color .25s;white-space:nowrap;
}
.main-nav .contact-link:hover{color:#ff6b00;}
.main-nav .contact-icons{font-size:.9rem;}
.main-nav .contact-text{display:inline;}
.main-nav .contact-email-text{display:inline;}
@media (min-width:769px) and (max-width:1100px){
  .main-nav .contact-email-text{display:none;}
}

/* reset lists inside nav */
.main-nav ul,.main-nav li{list-style:none;margin:0;padding:0;border:0}
.main-nav li::before{content:none !important}

/* nav links */
.main-nav .nav-links{display:flex;gap:16px;align-items:center}

/* links/buttons */
.main-nav a:not(.contact-link),.main-nav .dropdown-toggle{
  color:#fff;text-decoration:none !important;border:0 !important;
  font-weight:600;font-size:.88rem;background:transparent;cursor:pointer;
  transition:color .25s,border-bottom .25s; padding:0;white-space:nowrap;
}
.main-nav a:not(.contact-link):hover{color:#38b6ff}
.main-nav a:not(.contact-link).active{color:#38b6ff;border-bottom:2px solid #38b6ff;padding-bottom:4px}

/* hamburger */
.main-nav .hamburger{display:none;background:transparent;border:0;cursor:pointer;}
.main-nav .hamburger span{display:block;width:26px;height:2px;background:#fff;margin:6px 0;transition:transform .3s,opacity .3s}

/* dropdown */
.main-nav .has-dropdown{position:relative}
.main-nav .dropdown-toggle{display:flex;align-items:center;gap:6px;padding:6px 0}
.main-nav .dropdown-toggle.active{color:#38b6ff}
.main-nav .caret{transition:transform .2s}

.main-nav .dropdown{
  position:absolute; left:0; top:calc(100% + 5px);
  background:#11161f; border:1px solid #1f2a3a;
  border-radius:12px; min-width:230px; padding:10px;
  display:none; box-shadow:0 16px 40px rgba(0,0,0,.4);
  z-index:3100;
}

/* Create hover bridge - invisible area between button and dropdown */
.main-nav .has-dropdown::after{
  content:"";
  position:absolute;
  top:100%;
  left:0;
  right:0;
  height:15px;
  background:transparent;
  z-index:3099;
}

.main-nav .dropdown::before{
  content:""; position:absolute; top:-8px; left:18px;
  border-width:0 8px 8px 8px; border-style:solid;
  border-color:transparent transparent #11161f transparent;
}
.main-nav .dropdown li + li{margin-top:4px}
.main-nav .dropdown li a{display:block;padding:10px 14px;border-radius:8px}
.main-nav .dropdown li a:hover{background:#1a2332;color:#38b6ff}

/* desktop: open on hover - include the bridge in hover area */
@media (min-width:769px){
  .main-nav .has-dropdown:hover>.dropdown{display:block}
  .main-nav .has-dropdown:hover .caret{transform:rotate(180deg)}
}

/* mobile */
@media (max-width:768px){
  .main-nav .nav-container{flex-wrap:wrap;}
  .main-nav .nav-contact{order:1;width:100%;justify-content:center;padding:8px 0;border-bottom:1px solid #333;}
  .main-nav .contact-link{font-size:.85rem;}
  .main-nav .contact-text{display:none;} /* Hide text on mobile, show icons only */
  .main-nav .hamburger{display:block;order:2;}
  .main-nav .nav-links{
    order:3;position:absolute; left:0; right:0; top:100%;
    background:#000; border-top:1px solid #222;
    display:none; flex-direction:column; gap:0; padding:10px 16px;
    z-index:3050; width:100%;
  }
  .main-nav .nav-links.show{display:flex}
  .main-nav .nav-links>li{width:100%}
  .main-nav a:not(.contact-link),.main-nav .dropdown-toggle{display:block;padding:14px 4px;text-align:left}
  .main-nav .dropdown{position:static; display:none; background:#0d1320; border:0px solid #1b2636; margin:0px 0 1px; box-shadow:none}
  .main-nav .dropdown.show{display:block}
  .main-nav .dropdown::before{display:none}
}

/* focus */
.main-nav a:focus-visible,.main-nav .dropdown-toggle:focus-visible{outline:2px solid #38b6ff; outline-offset:3px; border-radius:4px}
</style>

<script>
(function(){
  const hamburger = document.querySelector('.main-nav .hamburger');
  const menu = document.getElementById('primary-menu');
  const ddToggles = document.querySelectorAll('.main-nav .dropdown-toggle');

  // Mobile menu toggle
  if (hamburger && menu) {
    hamburger.addEventListener('click', function(){
      const open = menu.classList.toggle('show');
      this.setAttribute('aria-expanded', String(open));
      this.classList.toggle('open');
      const bars = this.querySelectorAll('span');
      if (this.classList.contains('open')) {
        bars[0].style.transform='translateY(8px) rotate(45deg)';
        bars[1].style.opacity='0';
        bars[2].style.transform='translateY(-8px) rotate(-45deg)';
      } else {
        bars[0].style.transform='';
        bars[1].style.opacity='1';
        bars[2].style.transform='';
      }
    });
  }

  // Open dropdowns on click/tap — supports multiple dropdowns
  ddToggles.forEach(function(toggle){
    var ddMenu = toggle.nextElementSibling;
    if (!ddMenu) return;
    toggle.addEventListener('click', function(e){
      e.preventDefault();
      var isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (!isMobile) {
        // Close other desktop dropdowns first
        ddToggles.forEach(function(other){
          if (other !== toggle && other.nextElementSibling) {
            other.nextElementSibling.style.display = '';
            other.setAttribute('aria-expanded','false');
          }
        });
        ddMenu.style.display = (ddMenu.style.display === 'block') ? '' : 'block';
        toggle.setAttribute('aria-expanded', ddMenu.style.display === 'block');
      } else {
        ddMenu.classList.toggle('show');
        toggle.setAttribute('aria-expanded', ddMenu.classList.contains('show'));
      }
    });
  });

  // Close on resize up
  window.addEventListener('resize', function(){
    if (window.innerWidth > 768 && menu){
      menu.classList.remove('show');
      if (hamburger){
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded','false');
        var bars = hamburger.querySelectorAll('span');
        bars[0].style.transform=''; bars[1].style.opacity='1'; bars[2].style.transform='';
      }
      ddToggles.forEach(function(toggle){
        var dd = toggle.nextElementSibling;
        if (dd) { dd.classList.remove('show'); dd.style.display=''; }
        toggle.setAttribute('aria-expanded','false');
      });
    }
  });
})();
</script>