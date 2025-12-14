// If you want to use Phoenix channels, run `mix help phx.gen.channel`
// to get started and then uncomment the line below.
// import "./user_socket.js"

// You can include dependencies in two ways.
//
// The simplest option is to put them in assets/vendor and
// import them using relative paths:
//
//     import "../vendor/some-package.js"
//
// Alternatively, you can `npm install some-package --prefix assets` and import
// them using a path starting with the package name:
//
//     import "some-package"
//

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html"
// Establish Phoenix Socket and LiveView configuration.
import {Socket} from "phoenix"
import {LiveSocket} from "phoenix_live_view"
import topbar from "../vendor/topbar"
import Alpine from "alpinejs"
import collapse from '@alpinejs/collapse'
// Import Ace Editor
import ace from "ace-builds/src-noconflict/ace"
import "ace-builds/src-noconflict/mode-elixir"
import "ace-builds/src-noconflict/theme-monokai"
// Make ace available globally
window.ace = ace
// Import and initialize hooks
import Hooks from "./hooks.js"
window.Hooks = Hooks  // Ensure hooks are available globally

// Initialize Alpine.js plugins before Alpine starts

document.addEventListener("alpine:init", () => {
  Alpine.data("dropdown", () => ({
    open: false,
    init() {
      // Add scroll and resize event listeners
      const scrollableParents = this.getAllScrollParents(this.$refs.button);
      scrollableParents.forEach(parent => {
        parent.addEventListener('scroll', () => {
          if (this.open) this.updatePosition();
        }, { passive: true });
      });
      
      window.addEventListener('resize', () => {
        if (this.open) this.updatePosition();
      }, { passive: true });
    },

    toggle() {
      this.open = !this.open;
      if (this.open) {
        this.$nextTick(() => {
          this.updatePosition();
        });
      }
    },
    
    updatePosition() {
      if (!this.$refs.button || !this.$refs.dropdown) return;
      
      const button = this.$refs.button;
      const dropdown = this.$refs.dropdown;
      const buttonRect = button.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = dropdown.scrollHeight;
      
      // Calculate available space
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      // Position horizontally with offset
      const horizontalOffset = 16; // 1rem offset from the right
      dropdown.style.left = `${buttonRect.left - horizontalOffset}px`;
      dropdown.style.width = `${Math.max(buttonRect.width, 192)}px`; // 192px is 12rem (w-48)
      
      // Position vertically
      if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
        dropdown.style.top = `${buttonRect.bottom + 4}px`;
        dropdown.style.bottom = 'auto';
      } else {
        dropdown.style.bottom = `${viewportHeight - buttonRect.top + 4}px`;
        dropdown.style.top = 'auto';
      }
    },

    getAllScrollParents(element) {
      const scrollParents = [];
      let parent = element.parentElement;
      
      while (parent) {
        const computedStyle = getComputedStyle(parent);
        const overflow = computedStyle.overflow + 
                        computedStyle.overflowY + 
                        computedStyle.overflowX;
                        
        if (/(auto|scroll)/.test(overflow)) {
          scrollParents.push(parent);
        }
        parent = parent.parentElement;
      }
      
      // Always add window as it can scroll too
      scrollParents.push(window);
      return scrollParents;
    }
  }));
});


// Initialize Alpine.js
window.Alpine = Alpine
Alpine.plugin(collapse)
Alpine.start()

// Add mutation observer to reinitialize Alpine on dynamically added dropdowns
document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Check if the node itself or any descendants have x-data
          if (node.hasAttribute && node.hasAttribute('x-data')) {
            window.Alpine.initTree(node);
          }
          // Also check descendants
          node.querySelectorAll && node.querySelectorAll('[x-data]').forEach((element) => {
            if (!element._x_dataStack) {
              window.Alpine.initTree(element);
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});
 


// Initialize hooks for LiveView

let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
let liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: {_csrf_token: csrfToken, current_path: window.location.pathname},
  hooks: window.Hooks,  // Use global hooks
  dom: {
    onBeforeElUpdated(from, to) {
      // Preserve Alpine.js state and components during LiveView updates
      if (from._x_dataStack) {
        window.Alpine.clone(from, to);
      }
      
      // Re-initialize Alpine on new elements with x-data
      if (to.hasAttribute && to.hasAttribute('x-data') && !to._x_dataStack) {
        // Let Alpine handle the initialization
        window.Alpine.initTree(to);
      }
    },
    
    onNodeAdded(node) {
      // Initialize Alpine on dynamically added nodes
      if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('x-data')) {
        window.Alpine.initTree(node);
      }
    }
  },
})

// Show progress bar on live navigation and form submits
window.addEventListener("phx:page-loading-start", _info => {
  const loader = document.getElementById('loader')
  if (loader) loader.style.display = 'flex'
})
window.addEventListener("phx:page-loading-stop", _info => {
  const loader = document.getElementById('loader')
  if (loader) loader.style.display = 'none'
})

// Clear form event handler
window.addEventListener("phx:clear-form", _info => {
  // Clear all form inputs and selects in the current page
  document.querySelectorAll('form input[type="text"]').forEach(input => {
    input.value = '';
  });
  document.querySelectorAll('form select').forEach(select => {
    select.selectedIndex = 0; // Reset to first option (usually "Select...")
  });
})

// Drag and Drop Hook
let DragDrop = {
  mounted() {
    this.el.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', this.el.outerHTML);
      e.dataTransfer.setData('text/plain', this.el.dataset.itemId);
      this.el.classList.add('opacity-50');

      // Store drag data
      this.dragData = {
        itemId: this.el.dataset.itemId,
        itemType: this.el.dataset.itemType,
        reorderEvent: this.el.dataset.reorderEvent
      };
    });

    this.el.addEventListener('dragend', (e) => {
      this.el.classList.remove('opacity-50');
    });

    this.el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Add visual feedback
      if (!this.el.classList.contains('opacity-50')) { // Don't highlight the dragged item
        this.el.classList.add('border-indigo-400', 'bg-indigo-25');
      }
    });

    this.el.addEventListener('dragleave', (e) => {
      // Remove visual feedback
      this.el.classList.remove('border-indigo-400', 'bg-indigo-25');
    });

    this.el.addEventListener('drop', (e) => {
      e.preventDefault();
      this.el.classList.remove('border-indigo-400', 'bg-indigo-25');

      const draggedItemId = e.dataTransfer.getData('text/plain');
      const targetItemId = this.el.dataset.itemId;
      const reorderEvent = this.el.dataset.reorderEvent;

      // Don't drop on self
      if (draggedItemId === targetItemId) {
        return;
      }

      // Calculate new position
      const container = this.el.parentElement;
      const items = Array.from(container.children);
      const draggedIndex = items.findIndex(item => item.dataset.itemId === draggedItemId);
      const targetIndex = items.findIndex(item => item.dataset.itemId === targetItemId);

      // Determine if we're dropping above or below
      const rect = this.el.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const dropAbove = e.clientY < midpoint;

      let newOrder = targetIndex;
      if (!dropAbove && draggedIndex < targetIndex) {
        newOrder = targetIndex;
      } else if (dropAbove && draggedIndex > targetIndex) {
        newOrder = targetIndex;
      } else if (!dropAbove) {
        newOrder = targetIndex + 1;
      }

      // Send reorder event to LiveView
      this.pushEvent(reorderEvent, {
        item_id: draggedItemId,
        new_position: newOrder
      });
    });
  }
};

// Add the DragDrop hook to existing hooks
window.Hooks = window.Hooks || {};
window.Hooks.DragDrop = DragDrop;

// connect if there are any LiveViews on the page
liveSocket.connect()

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket

// Initialize socket with API key
let socket = new Socket("/socket", {
  params: {
    api_key: window.apiKey || "18c0bcde-1c62-48b5-b89b-7d607f1b5295" // Replace with actual API key or get from window
  }
})

socket.onError((error) => console.error("Socket error:", error))
socket.onClose(() => console.log(""))

socket.connect()

// Join the logger channel
// let channel = socket.channel("logger:lobby", {})

// Handle incoming log messages
// channel.on("new_log", payload => {
//   console.log("Received log:", payload)
// })

// channel.join()
//   .receive("ok", resp => {
//     console.log("Joined logger channel:", resp)
//   })
//   .receive("error", resp => {
//     console.error("Failed to join logger channel:", resp)
//   })

// Export for debugging
window.socket = socket
// window.channel = channel

// Field options toggle for mobile forms
window.toggleFieldOptions = function(fieldType) {
  const optionsDiv = document.getElementById('field-options');
  if (optionsDiv) {
    if (fieldType === 'select' || fieldType === 'multiselect') {
      optionsDiv.classList.remove('hidden');
    } else {
      optionsDiv.classList.add('hidden');
    }
  }
}


