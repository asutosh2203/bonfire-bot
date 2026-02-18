import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nyovfckjylhpnodgtabh.supabase.co', // Swap in your actual project ID
        port: '',
        pathname: '/storage/v1/object/public/avatars/**', // Locks it down strictly to the avatars bucket
      },
    ],
  },
};

export default nextConfig;
