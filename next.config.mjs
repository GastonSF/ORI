/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Subir el límite de body size para Server Actions.
    // Default: 1MB. Nuestros documentos pueden ser hasta 25MB (PDF escaneados, etc).
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
}

export default nextConfig
