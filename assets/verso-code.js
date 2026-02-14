/**
 * Verso-style interactive code highlighting for leanblueprint
 *
 * Provides:
 * - Tippy.js-based hover tooltips with type signatures
 * - Token binding highlights (highlight all occurrences of a variable)
 * - Tactic state toggles
 * - Error/warning message popups
 *
 * Ported from Verso (https://github.com/leanprover/verso)
 */

window.addEventListener('DOMContentLoaded', () => {
    // Don't show hovers inside of closed tactic states
    function blockedByTactic(elem) {
        let parent = elem.parentNode;
        while (parent && "classList" in parent) {
            if (parent.classList.contains("tactic")) {
                const toggle = parent.querySelector("input.tactic-toggle");
                if (toggle) {
                    return !toggle.checked;
                }
            }
            parent = parent.parentNode;
        }
        return false;
    }

    // Token binding highlights
    for (const c of document.querySelectorAll(".hl.lean .token")) {
        if (c.dataset.binding != "") {
            c.addEventListener("mouseover", (event) => {
                if (blockedByTactic(c)) { return; }
                const context = c.closest(".hl.lean").dataset.leanContext;
                for (const example of document.querySelectorAll(".hl.lean")) {
                    if (example.dataset.leanContext == context) {
                        for (const tok of example.querySelectorAll(".token")) {
                            if (c.dataset.binding == tok.dataset.binding) {
                                tok.classList.add("binding-hl");
                            }
                        }
                    }
                }
            });
        }
        c.addEventListener("mouseout", (event) => {
            for (const tok of document.querySelectorAll(".hl.lean .token")) {
                tok.classList.remove("binding-hl");
            }
        });
    }

    // Render docstrings with marked.js if available
    if ('undefined' !== typeof marked) {
        for (const d of document.querySelectorAll("code.docstring, pre.docstring")) {
            const str = d.innerText;
            const html = marked.parse(str);
            const rendered = document.createElement("div");
            rendered.classList.add("docstring");
            rendered.innerHTML = html;
            d.parentNode.replaceChild(rendered, d);
        }
    }

    // Initialize Tippy.js hovers
    const codeBlockHoverData = new Map();

    document.querySelectorAll('.lean-code[data-lean-hovers]').forEach(codeBlock => {
        try {
            const hoverData = JSON.parse(codeBlock.dataset.leanHovers);
            codeBlockHoverData.set(codeBlock, hoverData);
        } catch (e) {
            console.warn('Failed to parse hover data for code block:', e);
        }
    });

    function getHoverDataForElement(element) {
        const codeBlock = element.closest('.lean-code[data-lean-hovers]');
        if (!codeBlock) return null;
        return codeBlockHoverData.get(codeBlock) || null;
    }

    const defaultTippyProps = {
        maxWidth: 600,
        appendTo: () => document.body,
        interactive: true,
        delay: [100, null],
        followCursor: 'initial',
        onShow(inst) {
            const hasVersoHover = inst.reference.dataset.versoHover !== undefined;
            const hasHoverInfo = inst.reference.querySelector(".hover-info");
            if (hasVersoHover || hasHoverInfo) {
                return;
            }
            return false;
        },
        content(tgt) {
            const content = document.createElement("span");
            if (tgt.classList.contains('tactic')) {
                const state = tgt.querySelector(".tactic-state").cloneNode(true);
                state.style.display = "block";
                content.appendChild(state);
                content.style.display = "block";
                content.className = "hl lean popup";
            } else {
                content.className = "hl lean";
                content.style.display = "block";
                content.style.maxHeight = "300px";
                content.style.overflowY = "auto";
                content.style.overflowX = "hidden";
                const hoverId = tgt.dataset.versoHover;
                const hoverInfo = tgt.querySelector(".hover-info");
                if (hoverId) {
                    const hoverData = getHoverDataForElement(tgt);
                    const data = hoverData ? hoverData[hoverId] : null;
                    if (data) {
                        const info = document.createElement("span");
                        info.className = "hover-info";
                        info.style.display = "block";
                        info.innerHTML = data;
                        content.appendChild(info);
                        if ('undefined' !== typeof marked) {
                            for (const d of content.querySelectorAll("code.docstring, pre.docstring")) {
                                const str = d.innerText;
                                const html = marked.parse(str);
                                const rendered = document.createElement("div");
                                rendered.classList.add("docstring");
                                rendered.innerHTML = html;
                                d.parentNode.replaceChild(rendered, d);
                            }
                        }
                    }
                } else if (hoverInfo) {
                    content.appendChild(hoverInfo.cloneNode(true));
                }
                const extraLinks = tgt.parentElement ? tgt.parentElement.dataset['versoLinks'] : null;
                if (extraLinks) {
                    try {
                        const extras = JSON.parse(extraLinks);
                        const links = document.createElement('ul');
                        links.className = 'extra-doc-links';
                        extras.forEach((l) => {
                            const li = document.createElement('li');
                            // Use DOM methods instead of innerHTML to prevent XSS
                            const a = document.createElement('a');
                            a.href = l['href'];
                            a.title = l.long || '';
                            a.textContent = l.short || '';
                            li.appendChild(a);
                            links.appendChild(li);
                        });
                        content.appendChild(links);
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
            return content;
        }
    };

    // Apply Tippy themes to different token types
    document.querySelectorAll('.hl.lean .const.token, .hl.lean .keyword.token, .hl.lean .literal.token, .hl.lean .option.token, .hl.lean .var.token, .hl.lean .typed.token, .hl.lean .level-var, .hl.lean .level-const, .hl.lean .level-op, .hl.lean .sort').forEach(element => {
        element.setAttribute('data-tippy-theme', 'lean');
    });
    document.querySelectorAll('.hl.lean .has-info.warning').forEach(element => {
        element.setAttribute('data-tippy-theme', 'warning message');
    });
    document.querySelectorAll('.hl.lean .has-info.information').forEach(element => {
        element.setAttribute('data-tippy-theme', 'info message');
    });
    document.querySelectorAll('.hl.lean .has-info.error').forEach(element => {
        element.setAttribute('data-tippy-theme', 'error message');
    });
    document.querySelectorAll('.hl.lean .tactic').forEach(element => {
        element.setAttribute('data-tippy-theme', 'tactic');
    });

    // Initialize Tippy on all hoverable elements
    if (typeof tippy !== 'undefined') {
        const selector = '.hl.lean .const.token, .hl.lean .keyword.token, .hl.lean .literal.token, .hl.lean .option.token, .hl.lean .var.token, .hl.lean .typed.token, .hl.lean .has-info, .hl.lean .tactic, .hl.lean .level-var, .hl.lean .level-const, .hl.lean .level-op, .hl.lean .sort';
        tippy(selector, defaultTippyProps);
    }
});

// Sync Lean proof body visibility with LaTeX proof toggle using jQuery animations
// Note: plastex.js now uses .expanded class on proof_wrapper instead of text changes
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.sbs-container').forEach(function(container) {
        var proofHeading = container.querySelector('.proof_heading');
        var leanProofBody = container.querySelector('.lean-proof-body');

        if (!proofHeading || !leanProofBody) return;

        // Listen for clicks on the proof heading
        proofHeading.addEventListener('click', function() {
            // Read toggle state after plastex.js has toggled it (setTimeout for timing)
            setTimeout(function() {
                var proofWrapper = container.querySelector('.proof_wrapper');
                // plastex.js adds .expanded class when proof is shown
                var isExpanded = proofWrapper && proofWrapper.classList.contains('expanded');
                // Use jQuery slideUp/slideDown to match LaTeX proof animation
                if (isExpanded) {
                    $(leanProofBody).slideDown(300);
                } else {
                    $(leanProofBody).slideUp(300);
                }
            }, 50);
        });
    });
});

// Dependency graph pan/zoom controls
document.addEventListener('DOMContentLoaded', function() {
    var viewport = document.getElementById('dep-graph-viewport');
    var svgContainer = document.getElementById('dep-graph');
    if (!viewport || !svgContainer) return;

    var svg = svgContainer.querySelector('svg');
    if (!svg) return;

    // Set transform origin for proper scaling behavior
    svgContainer.style.transformOrigin = '0 0';

    var scale = 1;
    var translateX = 0;
    var translateY = 0;
    var isDragging = false;
    var startX, startY;

    // Prevent all selection during drag
    function preventSelection(e) {
        e.preventDefault();
        return false;
    }

    function updateTransform() {
        svgContainer.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ')';
    }

    function fitToWindow() {
        var viewportWidth = viewport.clientWidth;
        var viewportHeight = viewport.clientHeight;

        // Get SVG content bounds
        var bbox = svg.getBBox();

        // Calculate scale to fit with padding
        var padding = 40;
        var availableWidth = viewportWidth - padding;
        var availableHeight = viewportHeight - padding;

        var scaleX = availableWidth / bbox.width;
        var scaleY = availableHeight / bbox.height;
        scale = Math.min(scaleX, scaleY, 1);  // Don't scale up

        // Calculate scaled content dimensions
        var scaledWidth = bbox.width * scale;
        var scaledHeight = bbox.height * scale;

        // Center: translate so bbox top-left maps to centered position
        // After scaling, bbox.x*scale and bbox.y*scale give the offset of content
        translateX = (viewportWidth - scaledWidth) / 2 - bbox.x * scale;
        translateY = (viewportHeight - scaledHeight) / 2 - bbox.y * scale;

        updateTransform();
    }

    // Zoom centered on cursor position
    function zoomAtPoint(delta, clientX, clientY) {
        var rect = viewport.getBoundingClientRect();
        var x = clientX - rect.left;
        var y = clientY - rect.top;

        var oldScale = scale;
        scale = Math.max(0.1, Math.min(5, scale * delta));

        // Adjust translation to keep cursor point fixed
        translateX = x - (x - translateX) * (scale / oldScale);
        translateY = y - (y - translateY) * (scale / oldScale);

        updateTransform();
    }

    // Zoom buttons
    var zoomIn = document.getElementById('graph-zoom-in');
    var zoomOut = document.getElementById('graph-zoom-out');
    var fitBtn = document.getElementById('graph-fit');

    if (zoomIn) {
        zoomIn.addEventListener('click', function() {
            scale = Math.min(scale * 1.2, 5);
            updateTransform();
        });
    }

    if (zoomOut) {
        zoomOut.addEventListener('click', function() {
            scale = Math.max(scale / 1.2, 0.1);
            updateTransform();
        });
    }

    if (fitBtn) {
        fitBtn.addEventListener('click', fitToWindow);
    }

    // Mouse wheel zoom (centered on cursor)
    viewport.addEventListener('wheel', function(e) {
        e.preventDefault();
        var delta = e.deltaY > 0 ? 0.975 : 1.025;  // 4x reduced sensitivity (was 0.9/1.1)
        zoomAtPoint(delta, e.clientX, e.clientY);
    }, { passive: false });

    // Pan with pointer drag (pointer events provide better tracking than mouse events)
    viewport.addEventListener('pointerdown', function(e) {
        if (e.button !== 0) return;  // Only left click
        // Don't start drag if clicking on a node
        if (e.target.closest('.node')) return;
        e.preventDefault();
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;

        // Disable transitions during drag
        svgContainer.classList.add('dragging');
        viewport.style.cursor = 'grabbing';
        viewport.setPointerCapture(e.pointerId);

        // Prevent all selection
        document.addEventListener('selectstart', preventSelection);
        document.addEventListener('dragstart', preventSelection);
    });

    viewport.addEventListener('pointermove', function(e) {
        if (!isDragging) return;
        e.preventDefault();
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
    });

    viewport.addEventListener('pointerup', function(e) {
        if (!isDragging) return;
        isDragging = false;

        svgContainer.classList.remove('dragging');
        viewport.style.cursor = 'grab';
        viewport.releasePointerCapture(e.pointerId);

        document.removeEventListener('selectstart', preventSelection);
        document.removeEventListener('dragstart', preventSelection);
    });

    viewport.addEventListener('pointercancel', function(e) {
        isDragging = false;
        svgContainer.classList.remove('dragging');
        viewport.style.cursor = 'grab';
        document.removeEventListener('selectstart', preventSelection);
        document.removeEventListener('dragstart', preventSelection);
    });

    // Pan step size (pixels)
    var panStep = 80;

    // Pan buttons
    var panLeft = document.getElementById('graph-pan-left');
    var panRight = document.getElementById('graph-pan-right');
    var panUp = document.getElementById('graph-pan-up');
    var panDown = document.getElementById('graph-pan-down');

    if (panLeft) {
        panLeft.addEventListener('click', function() {
            translateX += panStep;
            updateTransform();
        });
    }
    if (panRight) {
        panRight.addEventListener('click', function() {
            translateX -= panStep;
            updateTransform();
        });
    }
    if (panUp) {
        panUp.addEventListener('click', function() {
            translateY += panStep;
            updateTransform();
        });
    }
    if (panDown) {
        panDown.addEventListener('click', function() {
            translateY -= panStep;
            updateTransform();
        });
    }

    // Initial fit - use requestAnimationFrame to ensure SVG is rendered and getBBox is accurate
    requestAnimationFrame(function() {
        fitToWindow();
    });

    // Re-fit after all resources (fonts, images) are loaded for accurate getBBox
    window.addEventListener('load', function() {
        fitToWindow();
    });
});

// Initialize MathJax and Tippy.js when a modal is opened
function onModalOpen(modalElement) {
    // Move the [blueprint] link inline with the theorem header (after status dot)
    var blueprintLink = modalElement.querySelector('.modal-blueprint-link');
    var headerExtras = modalElement.querySelector('.thm_header_extras');
    if (blueprintLink && headerExtras && !headerExtras.querySelector('.modal-blueprint-link')) {
        // Clone and append the link after the status dot
        var linkClone = blueprintLink.cloneNode(true);
        linkClone.style.display = 'inline';
        headerExtras.appendChild(linkClone);
        // Hide the original
        blueprintLink.style.display = 'none';
    }

    // Render MathJax in modal content
    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
        MathJax.typesetPromise([modalElement]).catch(function(err) {
            console.warn('MathJax typeset failed:', err);
        });
    }

    // Initialize Tippy.js on hover elements within the modal
    if (typeof tippy !== 'undefined') {
        // Simple tippy props for modal elements (self-contained, no external dependencies)
        var modalTippyProps = {
            maxWidth: 600,
            appendTo: function() { return document.body; },
            interactive: true,
            delay: [100, null],
            theme: 'lean',
            content: function(tgt) {
                var hoverInfo = tgt.querySelector(".hover-info");
                if (hoverInfo) {
                    var content = document.createElement("span");
                    content.className = "hl lean";
                    content.style.display = "block";
                    content.appendChild(hoverInfo.cloneNode(true));
                    return content;
                }
                return '';
            }
        };

        // Initialize on elements that haven't been initialized yet
        var selector = '.const.token, .keyword.token, .literal.token, .option.token, .var.token, .typed.token, .has-info';
        var elements = modalElement.querySelectorAll(selector);
        elements.forEach(function(el) {
            // Only initialize if not already done
            if (!el._tippy) {
                tippy(el, modalTippyProps);
            }
        });
    }
}

// Initialize click handlers on SVG graph nodes within a container.
// Attaches click-to-open-modal behavior to all .node elements found inside `container`.
// Safe to call multiple times (e.g., after fetching a subgraph SVG).
function initNodeClickHandlers(container) {
    if (!container) return;

    var nodes = container.querySelectorAll('.node');
    nodes.forEach(function(node) {
        // Skip if already initialized
        if (node._modalClickInit) return;
        node._modalClickInit = true;

        node.style.cursor = 'pointer';
        node.addEventListener('click', function(e) {
            e.stopPropagation();
            // Get the node id from the title element
            var titleEl = node.querySelector('title');
            if (!titleEl) return;
            var nodeId = titleEl.textContent.trim();
            // Normalize ID to match Runway's format (colons become hyphens)
            var normalizedId = nodeId.replace(/:/g, '-');

            // Hide all modals first
            var allModals = document.querySelectorAll('.dep-modal-container');
            allModals.forEach(function(m) { m.style.display = 'none'; });

            // Show the corresponding modal (use normalized ID)
            var modal = document.getElementById(normalizedId + '_modal');
            if (modal) {
                // The modals are inside #statements container which starts hidden
                var statements = document.getElementById('statements');
                if (statements) {
                    statements.style.display = 'block';
                }
                modal.style.display = 'flex';
                onModalOpen(modal);
            }
        });
    });
}

// Initialize close handlers for all modals on the page (called once on DOMContentLoaded).
function initModalCloseHandlers() {
    // Close button handlers
    document.querySelectorAll('.dep-closebtn').forEach(function(btn) {
        if (btn._closeInit) return;
        btn._closeInit = true;
        btn.addEventListener('click', function() {
            var modal = btn.closest('.dep-modal-container');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Close modal when clicking outside content
    document.querySelectorAll('.dep-modal-container').forEach(function(modal) {
        if (modal._backdropInit) return;
        modal._backdropInit = true;
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Dependency graph node click modal handling
document.addEventListener('DOMContentLoaded', function() {
    // Initialize click handlers on the full graph SVG container
    var svgContainer = document.getElementById('dep-graph');
    if (svgContainer) {
        initNodeClickHandlers(svgContainer);
    }

    // Initialize close/backdrop handlers for all modals
    initModalCloseHandlers();

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.dep-modal-container').forEach(function(modal) {
                modal.style.display = 'none';
            });
        }
    });
});

// ============================================================
// Status Filter for Dependency Graph
// ============================================================
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var filterBar = document.getElementById('graph-filter-bar');
    var dataEl = document.getElementById('dep-graph-data');
    var svgContainer = document.getElementById('dep-graph');
    if (!filterBar || !dataEl || !svgContainer) return;

    var graphData;
    try {
      graphData = JSON.parse(dataEl.dataset.graph);
    } catch (e) { return; }

    // Build nodeId -> {status, envType} map
    var nodeInfo = {};
    graphData.nodes.forEach(function(n) {
      nodeInfo[n.id] = { status: n.status, envType: (n.envType || '').toLowerCase() };
    });

    // Get filter status for a node (axiom overrides status)
    function getFilterStatus(nodeId) {
      var info = nodeInfo[nodeId];
      if (!info) return null;
      if (info.envType === 'axiom') return 'axiom';
      return info.status;
    }

    var checkboxes = filterBar.querySelectorAll('input[type="checkbox"]');
    var countEl = document.getElementById('filter-count');

    function applyFilters() {
      var activeStatuses = new Set();
      checkboxes.forEach(function(cb) {
        if (cb.checked) activeStatuses.add(cb.dataset.status);
      });

      var hiddenNodes = new Set();
      var totalNodes = 0;
      var visibleNodes = 0;

      // Show/hide nodes
      svgContainer.querySelectorAll('.node').forEach(function(nodeEl) {
        var titleEl = nodeEl.querySelector('title');
        if (!titleEl) return;
        var nodeId = titleEl.textContent.trim();
        var filterStatus = getFilterStatus(nodeId);
        totalNodes++;

        if (filterStatus && !activeStatuses.has(filterStatus)) {
          nodeEl.style.display = 'none';
          hiddenNodes.add(nodeId);
        } else {
          nodeEl.style.display = '';
          visibleNodes++;
        }
      });

      // Show/hide edges based on data-from/data-to attributes
      svgContainer.querySelectorAll('path[data-from]').forEach(function(edgeEl) {
        var from = edgeEl.getAttribute('data-from');
        var to = edgeEl.getAttribute('data-to');
        if (hiddenNodes.has(from) || hiddenNodes.has(to)) {
          edgeEl.style.display = 'none';
        } else {
          edgeEl.style.display = '';
        }
      });

      // Update count display
      if (countEl) {
        if (visibleNodes < totalNodes) {
          countEl.textContent = visibleNodes + ' / ' + totalNodes;
        } else {
          countEl.textContent = '';
        }
      }
    }

    checkboxes.forEach(function(cb) {
      cb.addEventListener('change', applyFilters);
    });
  });
})();

// ============================================================
// Per-Node Dependency Subgraph Renderer (Pre-rendered SVG fetch)
// ============================================================
(function() {
  'use strict';

  var STATUS_COLORS = {
    notReady:     '#E8820C',
    ready:        '#0097A7',
    sorry:        '#C62828',
    proven:       '#66BB6A',
    fullyProven:  '#1B5E20',
    mathlibReady: '#42A5F5',
    axiom:        '#7E57C2'
  };

  var STATUS_CLASS_MAP = {
    'not-ready':     'notReady',
    'ready':         'ready',
    'sorry':         'sorry',
    'proven':        'proven',
    'fully-proven':  'fullyProven',
    'mathlib-ready': 'mathlibReady',
    'axiom':         'axiom'
  };

  function getStatusColor(status) {
    if (STATUS_COLORS[status]) return STATUS_COLORS[status];
    var mapped = STATUS_CLASS_MAP[status];
    if (mapped && STATUS_COLORS[mapped]) return STATUS_COLORS[mapped];
    return '#E8820C';
  }

  // Sanitize node ID for filesystem paths (colons to hyphens)
  function sanitizeId(id) {
    return id.replace(/:/g, '-');
  }

  // Determine the base path for subgraph SVGs.
  // On individual node pages (dep_graph/<node>.html), subgraphs dir is a sibling
  // On the full graph page (dep_graph/full.html), same
  // On the dashboard or chapter pages, need to go into dep_graph/
  function getSubgraphBasePath() {
    var path = window.location.pathname;
    if (path.indexOf('/dep_graph/') >= 0) {
      return 'subgraphs/';
    }
    return 'dep_graph/subgraphs/';
  }

  // Cached subgraph depth metadata (per-node max depths)
  var subgraphMetadata = null;
  var subgraphMetadataLoading = false;
  var subgraphMetadataCallbacks = [];

  // Fetch and cache subgraph depth metadata
  function getSubgraphMetadata(callback) {
    if (subgraphMetadata) {
      callback(subgraphMetadata);
      return;
    }
    subgraphMetadataCallbacks.push(callback);
    if (subgraphMetadataLoading) return;
    subgraphMetadataLoading = true;

    var basePath = getSubgraphBasePath();
    var url = basePath + 'metadata.json';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          subgraphMetadata = JSON.parse(xhr.responseText);
        } catch (e) {
          subgraphMetadata = {};
        }
      } else {
        subgraphMetadata = {};
      }
      var cbs = subgraphMetadataCallbacks;
      subgraphMetadataCallbacks = [];
      cbs.forEach(function(cb) { cb(subgraphMetadata); });
    };
    xhr.onerror = function() {
      subgraphMetadata = {};
      var cbs = subgraphMetadataCallbacks;
      subgraphMetadataCallbacks = [];
      cbs.forEach(function(cb) { cb(subgraphMetadata); });
    };
    xhr.send();
  }

  // Get the max depth for a node in a given direction from metadata
  function getMaxDepthForNode(metadata, nodeId, direction) {
    var sanitized = sanitizeId(nodeId);
    var info = metadata[sanitized];
    if (!info) return 5; // fallback to default max
    var depth = info[direction];
    return (typeof depth === 'number' && depth >= 1) ? depth : 5;
  }

  // Update a depth slider's max attribute based on metadata
  function updateSliderMax(slider, label, metadata, nodeId, direction) {
    if (!slider) return;
    var maxDepth = getMaxDepthForNode(metadata, nodeId, direction);
    // Ensure at least 1 for the slider range
    maxDepth = Math.max(maxDepth, 1);
    slider.max = maxDepth;
    // Clamp current value if it exceeds the new max
    if (parseInt(slider.value) > maxDepth) {
      slider.value = maxDepth;
      if (label) label.textContent = maxDepth;
    }
  }

  // Fetch a pre-rendered subgraph SVG
  function fetchSubgraphSvg(nodeId, direction, depth, callback) {
    var basePath = getSubgraphBasePath();
    var url = basePath + sanitizeId(nodeId) + '/' + direction + '-' + depth + '.svg';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        callback(null, xhr.responseText);
      } else {
        callback('HTTP ' + xhr.status);
      }
    };
    xhr.onerror = function() { callback('Network error'); };
    xhr.send();
  }

  // Render fetched SVG into a container element
  function renderSvgInto(container, nodeId, direction, depth) {
    container.innerHTML = '<div class="subgraph-loading">Loading...</div>';
    fetchSubgraphSvg(nodeId, direction, depth, function(err, svgContent) {
      if (err) {
        container.innerHTML = '<div class="subgraph-empty">Subgraph not available</div>';
      } else {
        container.innerHTML = svgContent;
        // Attach modal click handlers to nodes in the newly injected SVG
        if (typeof initNodeClickHandlers === 'function') {
          initNodeClickHandlers(container);
        }
      }
    });
  }

  // Get current direction from toggle buttons within a controls container
  function getActiveDirection(controlsEl) {
    if (!controlsEl) return 'both';
    var activeBtn = controlsEl.querySelector('.direction-btn.active');
    return activeBtn ? activeBtn.dataset.direction : 'both';
  }

  // Wire up direction toggle buttons within a controls container
  function initDirectionToggle(controlsEl, onChange) {
    if (!controlsEl) return;
    var buttons = controlsEl.querySelectorAll('.direction-btn');
    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        buttons.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        if (onChange) onChange();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    // Build node lookup from JSON (if available, for modal metadata)
    var nodesById = {};
    var dataEl = document.getElementById('dep-graph-data');
    if (dataEl) {
      try {
        var graphData = JSON.parse(dataEl.dataset.graph);
        (graphData.nodes || []).forEach(function(n) {
          nodesById[n.id] = n;
        });
      } catch (e) {
        console.warn('Subgraph: failed to parse dep-graph-data', e);
      }
    }

    // Resolve a possibly-normalized node ID to the original ID in nodesById
    function resolveNodeId(normalizedId) {
      if (nodesById[normalizedId]) return normalizedId;
      for (var key in nodesById) {
        if (nodesById.hasOwnProperty(key) && key.replace(/:/g, '-') === normalizedId) {
          return key;
        }
      }
      // If no JSON data, return the sanitized ID as-is (for individual node pages)
      return normalizedId;
    }

    // ---- Modal subgraph support ----

    var sbsModal = null;
    var sbsModalCurrentNodeId = null;

    function buildLegendHtml() {
      return '<div class="dep-graph-legend">' +
        '<div class="legend-title">Legend</div>' +
        '<div class="legend-items">' +
          '<div class="legend-item"><span class="legend-swatch not-ready"></span><span>Not Ready</span></div>' +
          '<div class="legend-item"><span class="legend-swatch ready"></span><span>Ready</span></div>' +
          '<div class="legend-item"><span class="legend-swatch sorry"></span><span>Sorry</span></div>' +
          '<div class="legend-item"><span class="legend-swatch proven"></span><span>Proven</span></div>' +
          '<div class="legend-item"><span class="legend-swatch fully-proven"></span><span>Fully Proven</span></div>' +
          '<div class="legend-item"><span class="legend-swatch mathlib-ready"></span><span>Mathlib Ready</span></div>' +
          '<div class="legend-item"><span class="legend-swatch axiom"></span><span>Axiom</span></div>' +
          '<div class="legend-separator"></div>' +
          '<div class="legend-item"><span class="legend-shape ellipse"></span><span>Theorems</span></div>' +
          '<div class="legend-item"><span class="legend-shape box"></span><span>Definitions</span></div>' +
          '<div class="legend-item"><span class="legend-shape diamond"></span><span>Axioms</span></div>' +
        '</div>' +
      '</div>';
    }

    function buildToolbarHtml(prefix) {
      return '<div class="dep-graph-toolbar dep-graph-toolbar-compact">' +
        '<button id="' + prefix + '-zoom-in" title="Zoom in" aria-label="Zoom in">+</button>' +
        '<button id="' + prefix + '-zoom-out" title="Zoom out" aria-label="Zoom out">\u2212</button>' +
        '<button id="' + prefix + '-fit" title="Fit to window" aria-label="Fit to window">Fit</button>' +
        '</div>';
    }

    function buildDirectionToggleHtml() {
      return '<div class="direction-toggle">' +
        '<button class="direction-btn active" data-direction="both">Both</button>' +
        '<button class="direction-btn" data-direction="ancestors">Ancestors</button>' +
        '<button class="direction-btn" data-direction="descendants">Descendants</button>' +
        '</div>';
    }

    function createSbsModal() {
      var backdrop = document.createElement('div');
      backdrop.className = 'sbs-modal-backdrop';
      backdrop.style.display = 'none';

      var panel = document.createElement('div');
      panel.className = 'sbs-modal-panel';

      // Header
      var header = document.createElement('div');
      header.className = 'sbs-modal-header';

      var titleSpan = document.createElement('span');
      titleSpan.className = 'sbs-modal-title';

      var badgeSpan = document.createElement('span');
      badgeSpan.className = 'sbs-modal-status-badge';

      var closeBtn = document.createElement('button');
      closeBtn.className = 'sbs-modal-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', 'Close');

      header.appendChild(titleSpan);
      header.appendChild(badgeSpan);
      header.appendChild(closeBtn);

      // Controls: depth slider + direction toggle
      var controls = document.createElement('div');
      controls.className = 'sbs-modal-controls';

      var depthControl = document.createElement('div');
      depthControl.className = 'subgraph-depth-control';
      depthControl.innerHTML = '<label>Depth: <span class="depth-value">1</span></label>' +
        '<input type="range" class="depth-slider" min="1" max="5" value="1">';
      controls.appendChild(depthControl);

      var dirToggleDiv = document.createElement('div');
      dirToggleDiv.innerHTML = buildDirectionToggleHtml();
      controls.appendChild(dirToggleDiv.firstChild);

      // Legend + toolbar row
      var legendToolbar = document.createElement('div');
      legendToolbar.className = 'sbs-modal-legend-toolbar';
      legendToolbar.innerHTML = buildLegendHtml() + buildToolbarHtml('modal');
      controls.appendChild(legendToolbar);

      // Viewport
      var viewport = document.createElement('div');
      viewport.className = 'sbs-modal-viewport subgraph-viewport';

      // Footer
      var footer = document.createElement('div');
      footer.className = 'sbs-modal-footer';

      var fullLink = document.createElement('a');
      fullLink.className = 'sbs-modal-full-link';
      fullLink.textContent = 'View full graph \u2192';
      footer.appendChild(fullLink);

      // Assemble
      panel.appendChild(header);
      panel.appendChild(controls);
      panel.appendChild(viewport);
      panel.appendChild(footer);
      backdrop.appendChild(panel);
      document.body.appendChild(backdrop);

      // Close handlers
      closeBtn.addEventListener('click', function() { closeSbsModal(); });
      backdrop.addEventListener('click', function(e) {
        if (e.target === backdrop) closeSbsModal();
      });

      // Depth slider handler
      var depthSlider = depthControl.querySelector('.depth-slider');
      var depthLabel = depthControl.querySelector('.depth-value');
      depthSlider.addEventListener('input', function() {
        depthLabel.textContent = this.value;
        renderSbsModalSubgraph();
      });

      // Direction toggle handler - also update slider max for new direction
      initDirectionToggle(controls, function() {
        if (sbsModalCurrentNodeId && subgraphMetadata) {
          var direction = getActiveDirection(controls);
          updateSliderMax(depthSlider, depthLabel, subgraphMetadata, sbsModalCurrentNodeId, direction);
        }
        renderSbsModalSubgraph();
      });

      return {
        backdrop: backdrop,
        controls: controls,
        title: titleSpan,
        badge: badgeSpan,
        viewport: viewport,
        fullLink: fullLink,
        depthSlider: depthSlider,
        depthLabel: depthLabel
      };
    }

    function renderSbsModalSubgraph() {
      if (!sbsModal || !sbsModalCurrentNodeId) return;
      var nodeId = sbsModalCurrentNodeId;
      var depth = sbsModal.depthSlider ? parseInt(sbsModal.depthSlider.value) : 1;
      var direction = getActiveDirection(sbsModal.controls);
      renderSvgInto(sbsModal.viewport, nodeId, direction, depth);
    }

    function openSbsModal(nodeId) {
      if (!sbsModal) sbsModal = createSbsModal();

      sbsModalCurrentNodeId = nodeId;

      // Reset depth slider and direction
      if (sbsModal.depthSlider) {
        sbsModal.depthSlider.value = '1';
        sbsModal.depthLabel.textContent = '1';
      }
      // Reset direction to "both"
      var dirBtns = sbsModal.controls.querySelectorAll('.direction-btn');
      dirBtns.forEach(function(b) {
        b.classList.toggle('active', b.dataset.direction === 'both');
      });

      // Set title and badge from JSON metadata (if available)
      var resolvedId = resolveNodeId(nodeId);
      var nodeData = nodesById[resolvedId];
      var label = nodeData ? (nodeData.label || nodeId) : nodeId;
      var status = nodeData ? (nodeData.status || 'not-ready') : 'not-ready';
      var statusColor = getStatusColor(status);

      sbsModal.title.textContent = label;
      sbsModal.badge.style.background = statusColor;
      sbsModal.badge.textContent = '';

      // Set full graph link - normalize colon to hyphen for the static page URL
      var normalizedId = sanitizeId(nodeId);
      sbsModal.fullLink.href = 'dep_graph/' + normalizedId + '.html';

      // Fetch depth metadata and update slider max
      getSubgraphMetadata(function(metadata) {
        var direction = getActiveDirection(sbsModal.controls);
        updateSliderMax(sbsModal.depthSlider, sbsModal.depthLabel, metadata, nodeId, direction);
      });

      // Render subgraph
      renderSbsModalSubgraph();

      // Show modal
      sbsModal.backdrop.style.display = 'flex';
    }

    function closeSbsModal() {
      if (sbsModal) {
        sbsModal.backdrop.style.display = 'none';
      }
    }

    // Listen for status dot button clicks (delegated)
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.status-dot-btn');
      if (btn && btn.dataset.nodeId) {
        e.preventDefault();
        e.stopPropagation();
        openSbsModal(btn.dataset.nodeId);
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeSbsModal();
    });

    // Auto-init subgraph on individual node pages (dep_graph/<node-id>.html)
    var nodeSubgraphEl = document.getElementById('node-subgraph');
    if (nodeSubgraphEl) {
      var targetNodeId = nodeSubgraphEl.dataset.nodeId;
      var controlsEl = nodeSubgraphEl.parentElement.querySelector('.dg-subgraph-controls');

      var pageDepthSlider = controlsEl ? controlsEl.querySelector('.depth-slider') : null;
      var pageDepthLabel = controlsEl ? controlsEl.querySelector('.depth-value') : null;

      function renderNodePageSubgraph() {
        if (!targetNodeId) {
          nodeSubgraphEl.innerHTML = '<div class="subgraph-empty">Node not found</div>';
          return;
        }
        var depth = pageDepthSlider ? parseInt(pageDepthSlider.value) : 1;
        var direction = getActiveDirection(controlsEl);
        renderSvgInto(nodeSubgraphEl, targetNodeId, direction, depth);
      }

      if (pageDepthSlider) {
        pageDepthSlider.addEventListener('input', function() {
          if (pageDepthLabel) pageDepthLabel.textContent = this.value;
          renderNodePageSubgraph();
        });
      }

      // Wire direction toggle on node page - also update slider max
      initDirectionToggle(controlsEl, function() {
        if (subgraphMetadata && targetNodeId) {
          var direction = getActiveDirection(controlsEl);
          updateSliderMax(pageDepthSlider, pageDepthLabel, subgraphMetadata, targetNodeId, direction);
        }
        renderNodePageSubgraph();
      });

      // Fetch metadata and set initial slider max, then render
      getSubgraphMetadata(function(metadata) {
        var direction = getActiveDirection(controlsEl);
        updateSliderMax(pageDepthSlider, pageDepthLabel, metadata, targetNodeId, direction);
        renderNodePageSubgraph();
      });
    }
  });
})();
