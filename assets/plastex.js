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
