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

    function blockedByTippy(elem) {
        var block = elem;
        const topLevel = new Set(["section", "body", "html", "nav", "header", "article", "main"]);
        while (block.parentNode && !topLevel.has(block.parentNode.nodeName.toLowerCase())) {
            block = block.parentNode;
        }
        for (const child of block.querySelectorAll(".token, .has-info")) {
            if (child._tippy && child._tippy.state.isVisible) { return true };
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

    function hideParentTooltips(element) {
        let parent = element.parentElement;
        while (parent) {
            const tippyInstance = parent._tippy;
            if (tippyInstance) {
                tippyInstance.hide();
            }
            parent = parent.parentElement;
        }
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
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.sbs-container').forEach(function(container) {
        var proofHeading = container.querySelector('.proof_heading');
        var leanProofBody = container.querySelector('.lean-proof-body');

        if (!proofHeading || !leanProofBody) return;

        // Listen for clicks on the proof heading
        proofHeading.addEventListener('click', function() {
            // Read icon state after plastex.js has toggled it (setTimeout for timing)
            setTimeout(function() {
                var icon = container.querySelector('.expand-proof');
                var isCollapsed = icon && icon.textContent.trim() === '▶';
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

    function resetView() {
        scale = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
    }

    function fitToWindow() {
        var viewportWidth = viewport.clientWidth;
        var viewportHeight = viewport.clientHeight;

        // Get actual content bounding box
        var bbox = svg.getBBox();

        // Use bbox dimensions for scaling
        var scaleX = (viewportWidth - 40) / bbox.width;
        var scaleY = (viewportHeight - 40) / bbox.height;
        scale = Math.min(scaleX, scaleY, 1);  // Don't scale up, only down

        // Calculate center of actual content (accounting for bbox.x and bbox.y offset)
        var contentCenterX = bbox.x + bbox.width / 2;
        var contentCenterY = bbox.y + bbox.height / 2;

        // Center the content in the viewport
        translateX = viewportWidth / 2 - contentCenterX * scale;
        translateY = viewportHeight / 2 - contentCenterY * scale;

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
        // Initialize on elements that haven't been initialized yet
        var selector = '.dep-modal-content .const.token, .dep-modal-content .keyword.token, .dep-modal-content .literal.token, .dep-modal-content .option.token, .dep-modal-content .var.token, .dep-modal-content .typed.token, .dep-modal-content .has-info';
        var elements = modalElement.querySelectorAll(selector);
        elements.forEach(function(el) {
            // Only initialize if not already done
            if (!el._tippy) {
                tippy(el, defaultTippyProps);
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
