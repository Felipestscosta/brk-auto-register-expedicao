interface ProcessEnv extends NodeJS.ProcessEnv {
    CLOUDINARY_CLOUD_NAME:string;
    CLOUDINARY_API_KEY:string;
    CLOUDINARY_API_SECRET:string;
    BLING_API_CLIENT_ID:string;
    BLING_API_CLIENT_SECRET:string;
  }
  
  declare global {
    namespace NodeJS {
      interface ProcessEnv extends ProcessEnv {}
    }
  }