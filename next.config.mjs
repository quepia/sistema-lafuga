/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      // Discovery endpoints requeridos por OAuth 2.1 / MCP spec.
      // RFC 9728: el cliente puede consultar la metadata en
      //   /.well-known/oauth-protected-resource
      // o, agregando el path del recurso:
      //   /.well-known/oauth-protected-resource/api/mcp
      // Capturamos cualquier sufijo bajo ese prefijo.
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/well-known/oauth-protected-resource",
      },
      {
        source: "/.well-known/oauth-protected-resource/:path*",
        destination: "/api/well-known/oauth-protected-resource",
      },
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/well-known/oauth-authorization-server",
      },
      {
        source: "/.well-known/oauth-authorization-server/:path*",
        destination: "/api/well-known/oauth-authorization-server",
      },
    ];
  },
};

export default nextConfig;
