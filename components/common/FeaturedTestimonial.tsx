import { Quote } from 'lucide-react';
import Image from 'next/image';
import { SocialProof } from './SocialProof';

export function FeaturedTestimonial() {
  return (
    <>
      {/* Quote Icon */}
      <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center mb-6">
        <Quote className="w-6 h-6 text-white" />
      </div>

      {/* Testimonial */}
      <div className="space-y-6">
        <p className="text-lg leading-relaxed">
          You have created an awesome product.{' '}
          <span className="bg-yellow-200 text-black px-1 py-0.5">
            Your product saves hundreds of dollars.
          </span>{' '}
          In one of my earlier businesses, we were doing similar things manually
          and spending thousands of dollars. We used to hire writers and SEO
          specialists, and each page cost us around $50.
        </p>

        {/* Author */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full overflow-hidden">
            <Image
              src="/avatars/milan-motavar.webp"
              alt="Milan Motavar"
              width={48}
              height={48}
              className="w-12 h-12 object-cover"
            />
          </div>
          <div>
            <div className="font-semibold">Milan Motavar</div>
            <div className="text-gray-400 text-sm">Product Marketer</div>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <SocialProof type="users" />
    </>
  );
}
