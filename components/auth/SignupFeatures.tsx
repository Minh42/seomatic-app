'use client';

import { Check } from 'lucide-react';
import { SocialProof } from '@/components/common/SocialProof';
import { useEffect, useState } from 'react';

export function SignupFeatures() {
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    // Fetch user count from API
    fetch('/api/stats/users')
      .then(res => res.json())
      .then(data => setUserCount(data.count || 0))
      .catch(error => console.error('Failed to fetch user count:', error));
  }, []);
  const features = [
    'Connect 1 Site',
    'Publish up to 10 Pages',
    'AI Content & Images Generation',
    'Access to All SEO Templates',
    'Publish to Any CMS or Use Our Hosting',
    'Full Access to Our Premium Features',
    'Email & Chat Support',
  ];

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold mb-6 leading-tight">
        What&apos;s included in your 14-day free trial. No credit card required.
      </h2>

      <div className="space-y-2">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center">
            <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
            <span className="text-lg">{feature}</span>
          </div>
        ))}
      </div>

      <SocialProof type="users" userCount={userCount} />
    </div>
  );
}
