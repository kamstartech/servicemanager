export default {
  mounted() {
    // Get the form element
    const form = this.el;
    
    // Add event listener for form submission
    form.addEventListener('submit', (event) => {
      // Prevent the default form submission
      event.preventDefault();
      
      // Get the form data
      const formData = new FormData(form);
      const fieldData = {};
      
      // Convert FormData to a regular object
      for (let [key, value] of formData.entries()) {
        if (key.startsWith('field[')) {
          // Extract the field name from the key (e.g., field[name] -> name)
          const fieldName = key.match(/field\[(.*?)\]/)[1];
          fieldData[fieldName] = value;
        }
      }
      
      // Send the field data to the server
      this.pushEventTo(form.getAttribute('phx-target'), 'add-field', { field: fieldData });
      
      // Return false to prevent the form from submitting
      return false;
    });
  }
};
