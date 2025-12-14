// Code Editor Hook using Ace Editor
const CodeEditorHook = {
  mounted() {
    const targetInput = document.getElementById(this.el.dataset.target);
    if (!targetInput) {
      console.warn('CodeEditor: Target input not found');
      return;
    }

    const editor = ace.edit(this.el);
    const editorMode = this.el.dataset.mode || 'elixir';

    // Configure editor
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode(`ace/mode/${editorMode}`);
    editor.setValue(targetInput.value || "", -1);
    
    // Editor options
    editor.setOptions({
      fontSize: 14,
      showPrintMargin: false,
      wrap: true,
      autoScrollEditorIntoView: true
    });
    
    // Set default content if empty
    if (!targetInput.value) {
      const defaultContent = `def process(input) do
  # Your Elixir code here
  # Available context: input, params, user_context, request_context
  
  {:ok, %{
    status: "success",
    data: input
  }}
end`;
      editor.setValue(defaultContent, -1);
      targetInput.value = defaultContent;
    }
    
    // Sync editor content with hidden input and trigger LiveView events
    let changeTimeout;
    this.isUserTyping = false;
    
    editor.session.on("change", () => {
      const code = editor.getValue();
      targetInput.value = code;
      
      // Mark that user is actively typing
      this.isUserTyping = true;
      
      // Throttle LiveView events to prevent cursor jumping
      clearTimeout(changeTimeout);
      changeTimeout = setTimeout(() => {
        this.pushEvent("code_change", { code: code });
        // Reset typing flag after sending the event
        setTimeout(() => {
          this.isUserTyping = false;
        }, 100);
      }, 300); // 300ms debounce
    });

    // Store editor reference for later use
    this.editor = editor;

    // Handle LiveView events to update editor content
    this.handleEvent(`update_editor:${targetInput.id}`, ({ content }) => {
      editor.setValue(content, -1);
      targetInput.value = content;
    });
  },

  updated() {
    // Only update editor content if it was changed externally (not by the user typing)
    const targetInput = document.getElementById(this.el.dataset.target);
    if (!this.editor || !targetInput) return;

    const editorValue = this.editor.getValue();
    const inputValue = targetInput.value || "";
    
    // Only update if the values are significantly different (not just from typing)
    // This prevents cursor jumping while the user is typing
    if (inputValue !== editorValue && !this.isUserTyping) {
      this.editor.setValue(inputValue, -1);
    }
  },

  destroyed() {
    if (this.editor) {
      this.editor.destroy();
    }
  }
};

export default CodeEditorHook;
