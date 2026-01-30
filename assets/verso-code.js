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
        maxWidth: "none",
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
                            li.innerHTML = "<a href=\"" + l['href'] + "\" title=\"" + l.long + "\">" + l.short + "</a>";
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
// Note: plastex.js now uses [show]/[hide] text instead of arrow symbols
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.sbs-container').forEach(function(container) {
        var proofHeading = container.querySelector('.proof_heading');
        var leanProofBody = container.querySelector('.lean-proof-body');

        if (!proofHeading || !leanProofBody) return;

        // Listen for clicks on the proof heading
        proofHeading.addEventListener('click', function() {
            // Read toggle state after plastex.js has toggled it (setTimeout for timing)
            setTimeout(function() {
                var icon = container.querySelector('.expand-proof');
                // plastex.js uses [show] when collapsed, [hide] when expanded
                var isCollapsed = icon && icon.textContent.trim() === '[show]';
                // Use jQuery slideUp/slideDown to match LaTeX proof animation
                if (isCollapsed) {
                    $(leanProofBody).slideUp(300);
                } else {
                    $(leanProofBody).slideDown(300);
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

    // Initial fit
    fitToWindow();
});

// Initialize MathJax and Tippy.js when a modal is opened
function onModalOpen(modalElement) {
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
            maxWidth: "none",
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

// Dependency graph node click modal handling
document.addEventListener('DOMContentLoaded', function() {
    // Helper to escape special characters in label for CSS selector
    function escapeLabel(label) {
        return label.replace(/\./g, '\\.').replace(/:/g, '\\:');
    }

    // Add click handlers to SVG nodes
    var svgContainer = document.getElementById('dep-graph');
    if (!svgContainer) return;

    var nodes = svgContainer.querySelectorAll('.node');
    nodes.forEach(function(node) {
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

    // Close button handlers
    document.querySelectorAll('.dep-closebtn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var modal = btn.closest('.dep-modal-container');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Close modal when clicking outside content
    document.querySelectorAll('.dep-modal-container').forEach(function(modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.dep-modal-container').forEach(function(modal) {
                modal.style.display = 'none';
            });
        }
    });
});
