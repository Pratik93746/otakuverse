/**
 * ImageStorageService Abstraction
 * Decouples image storage from business logic, allowing seamless migration between
 * Local Static CDN, Cloudflare R2, AWS S3, Cloudinary, etc. without rewriting catalog code.
 */
class ImageStorageService {
  constructor(provider = process.env.IMAGE_STORAGE_PROVIDER || 'local') {
    this.provider = provider.toLowerCase();
    this.cdnBaseUrl = process.env.CDN_BASE_URL || '';
  }

  /**
   * Resolves a public URL for a given relative image path
   * @param {string} imagePath - E.g. '/catalog/dragon-ball/goku/front.webp'
   * @returns {string} - Full public CDN or local URL
   */
  resolveUrl(imagePath) {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    switch (this.provider) {
      case 'cloudflare_r2':
      case 'r2':
        return `${this.cdnBaseUrl.replace(/\/$/, '')}/${imagePath.replace(/^\//, '')}`;

      case 'aws_s3':
      case 's3':
        return `${this.cdnBaseUrl.replace(/\/$/, '')}/${imagePath.replace(/^\//, '')}`;

      case 'cloudinary':
        return `${this.cdnBaseUrl.replace(/\/$/, '')}/${imagePath.replace(/^\//, '')}`;

      case 'local':
      default:
        // Serves from Next.js public directory or local CDN proxy
        return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    }
  }

  /**
   * Formats a product document's images into standardized URLs
   * @param {Object} product - Product document
   * @returns {Object} - Product with resolved image URLs
   */
  formatProductImages(product) {
    if (!product) return null;

    const thumbnail = this.resolveUrl(
      product.thumbnail || product.image || (Array.isArray(product.images) && product.images[0]?.url) || ''
    );

    let images = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      images = product.images.map((img) => {
        const rawUrl = typeof img === 'string' ? img : img.url || '';
        return {
          url: this.resolveUrl(rawUrl),
          alt: typeof img === 'object' ? img.alt || product.name : product.name,
          isMain: typeof img === 'object' ? !!img.isMain : false,
        };
      });
    } else if (thumbnail) {
      images = [{ url: thumbnail, alt: product.name, isMain: true }];
    }

    return {
      ...product,
      thumbnail,
      image: thumbnail,
      images,
    };
  }

  /**
   * Generates signed upload URL for direct-to-storage uploads (R2 / S3)
   * Prevents routing large image binary payloads through the Node.js API server
   */
  async getPresignedUploadUrl(filename, mimeType) {
    // Extensible hook for AWS S3 S3Client / PutObjectCommand or Cloudflare R2 presigned URLs
    return {
      uploadUrl: `https://${this.cdnBaseUrl}/uploads/${Date.now()}-${filename}`,
      publicUrl: this.resolveUrl(`/catalog/custom/${Date.now()}-${filename}`),
      provider: this.provider,
    };
  }
}

module.exports = new ImageStorageService();
