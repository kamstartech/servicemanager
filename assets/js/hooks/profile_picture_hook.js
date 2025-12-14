const ProfilePictureHook = {
  mounted() {
    this.el.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64String = e.target.result;
          this.pushEvent("upload_profile_picture", {
            profile_picture: base64String
          });
        };
        reader.readAsDataURL(file);
      }
    });
  }
};

export default ProfilePictureHook;
