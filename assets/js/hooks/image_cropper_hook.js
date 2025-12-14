import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

const ImageCropperHook = {
  mounted() {
    this.cropper = null;
    this.setupCropper();

    // Listen for new images
    this.handleEvent("update-preview", ({ src }) => {
      if (this.cropper) {
        this.cropper.destroy();
      }
      const image = document.getElementById("preview-image");
      image.src = src;
      this.setupCropper();
    });
  },

  destroyed() {
    if (this.cropper) {
      this.cropper.destroy();
    }
  },

  setupCropper() {
    const image = document.getElementById("preview-image");
    if (!image) return;

    // Wait for image to load
    image.onload = () => {
      this.cropper = new Cropper(image, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        cropBoxMovable: false,
        cropBoxResizable: false,
        toggleDragModeOnDblclick: false,
        crop: (event) => {
          const canvas = this.cropper.getCroppedCanvas({
            width: 300,
            height: 300
          });
          
          if (canvas) {
            const croppedImage = canvas.toDataURL('image/png');
            this.pushEvent("update-cropped-image", { image: croppedImage });
          }
        }
      });
    };
  }
};

export default ImageCropperHook;
