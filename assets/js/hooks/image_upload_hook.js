const ImageUploadHook = {
  mounted() {
    console.log('🖼️ ImageUploadHook mounted');

    this.el.addEventListener('change', (e) => {
      console.log('📁 File input changed');
      const file = e.target.files[0];

      if (file) {
        console.log('📁 File selected:', file.name, file.type, file.size);

        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.error('❌ Invalid file type:', file.type);
          alert('Please select an image file (PNG, JPG, GIF, etc.)');
          return;
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          console.error('❌ File too large:', file.size);
          alert('File size must be less than 10MB');
          return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
          console.log('✅ File read successfully');
          const base64String = e.target.result;

          // Extract just the base64 data without the data URL prefix
          const base64Data = base64String.split(',')[1];

          console.log('📤 Sending file upload event with base64 data');
          this.pushEvent("file_converted_to_base64", {
            filename: file.name,
            content_type: file.type,
            size: file.size,
            base64_data: base64Data,
            full_data_url: base64String
          });
        };

        reader.onerror = (e) => {
          console.error('❌ Error reading file:', e);
          alert('Error reading file. Please try again.');
        };

        reader.readAsDataURL(file);
      }
    });
  }
};

export default ImageUploadHook;