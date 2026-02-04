// Dark mode toggle functionality
(function() {
  // Check for saved theme preference, then system preference, default to light
  function getPreferredTheme() {
    const savedTheme = localStorage.getItem('sbs-theme');
    if (savedTheme) {
      return savedTheme;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  // Apply theme to document
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  // Toggle between light and dark
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('sbs-theme', newTheme);
    applyTheme(newTheme);
  }

  // Apply theme immediately on page load (before DOM ready)
  applyTheme(getPreferredTheme());

  // Listen for system theme changes (only applies when no saved preference)
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      if (!localStorage.getItem('sbs-theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Expose toggle function globally
  window.toggleSbsTheme = toggleTheme;
})();

$(document).ready(function() {
  var icon = function($icon, $class, $id) {
    if ($id) {
      $id = ' id="'+$id+'"';
    } else {
      $id = '';
    }
    return '<svg'+ $id + ' class="icon icon-' + $icon + ' ' + $class +'"><use xlink:href="symbol-defs.svg#icon-'+$icon+'"></use></svg>'
  };

  // Attach click handler to theme toggle
  $(document).on('click', '.theme-toggle', function() {
    if (window.toggleSbsTheme) {
      window.toggleSbsTheme();
    }
  });

  // Mobile menu toggle
  $("#toc-toggle").click(function() {
    $("nav.toc").toggle();
  });

  // Initialize all expand-proof spans with chevron on page load
  $("span.expand-proof").each(function() {
    var text = $(this).text().trim();
    // Convert legacy [show]/[hide] to chevron, or set chevron if empty
    if (text === "[show]" || text === "" || text === "\u25BC") {
      $(this).html("\u25BC"); // Down-pointing triangle
    } else if (text === "[hide]") {
      $(this).html("\u25BC");
      $(this).closest('.proof_wrapper').addClass('expanded');
    }
  });

  $("div.proof_heading").click(
    function() {
      var proofWrapper = $(this).closest('.proof_wrapper');
      var sbsContainer = $(this).closest('.sbs-container');

      // Toggle expanded state (CSS handles chevron rotation)
      if (proofWrapper.hasClass('expanded')) {
        proofWrapper.removeClass('expanded');
        // Also hide the Lean proof body
        sbsContainer.find('.lean-proof-body').slideUp();
      } else {
        proofWrapper.addClass('expanded');
        // Also show the Lean proof body
        sbsContainer.find('.lean-proof-body').slideDown();
      };
      $(this).siblings("div.proof_content").slideToggle()
    })

  $("a.proof").click(
    function() {
      var ref= $(this).attr('href').split('#')[1];
      var proof = $('#'+ref)
      proof.show()
      proof.children('.proof_content').each(
        function() {
          var proof_content = $(this)
          proof_content.show().addClass('hilite')
          setTimeout(function(){
            proof_content.removeClass('hilite')
          }, 1000);
        })
      var expand_icon = proof.find('svg.expand-proof');
      expand_icon.replaceWith(icon('cross', 'expand-proof'));
    })

  // Wrap "-- See:" reference comments in .line-comment spans for styling
  // These appear in .hl.lean code blocks that contain only a reference comment
  // with no syntax highlighting spans from the build pipeline.
  $("code.hl.lean").each(function() {
    var $code = $(this);
    // Only process code elements that have no child spans (plain text only)
    if ($code.children('span').length > 0) return;
    var text = $code.text();
    // Match lines starting with "-- " (Lean line comment syntax)
    if (/^\s*--\s/.test(text)) {
      $code.html('<span class="line-comment">' + $('<span>').text(text).html() + '</span>');
    }
  });

  // SBS container expand/collapse toggle
  // Makes theorem/definition headers clickable to show/hide the Lean column
  $(".sbs-container").each(function() {
    var $container = $(this);
    var $heading = $container.find("div[class$='_thmheading']").first();
    var $leanCol = $container.find(".sbs-lean-column").first();

    if (!$heading.length || !$leanCol.length) return;

    // Add toggle indicator to the heading's thm_header_extras
    var $extras = $heading.find(".thm_header_extras").first();
    if ($extras.length) {
      $extras.append('<span class="sbs-toggle-indicator" title="Toggle Lean code">&#x25BC;</span>');
    }

    // Start expanded
    $container.addClass('sbs-expanded');

    // Make heading clickable to toggle Lean column
    $heading.css('cursor', 'pointer');
    $heading.on('click', function(e) {
      // Don't toggle if clicking a link
      if ($(e.target).is('a') || $(e.target).closest('a').length) return;

      if ($container.hasClass('sbs-expanded')) {
        $container.removeClass('sbs-expanded').addClass('sbs-collapsed');
        $leanCol.slideUp(200);
      } else {
        $container.removeClass('sbs-collapsed').addClass('sbs-expanded');
        $leanCol.slideDown(200);
      }
    });
  });

  // Blueprint chapter toggle
  (function() {
    var $group = $('.sidebar-blueprint-group');
    if (!$group.length) return;
    var $toggle = $group.find('.sidebar-blueprint-toggle');
    if (document.body.hasAttribute('data-blueprint-page')) {
      $group.addClass('expanded');
    }
    $toggle.on('click', function() {
      $group.toggleClass('expanded');
    });
  })();

  $("button.modal").click(
    function() {
      $(this).next("div.modal-container").css('display', 'flex');
    })
  $("button.closebtn").click(
    function() {
      $(this).parent().parent().parent().hide();
    })
});
