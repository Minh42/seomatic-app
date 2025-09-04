import { Check } from 'lucide-react';

export function SignupFeatures() {
  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold mb-6 leading-tight">
        Everything you need to start — free forever, no credit card required.
      </h2>

      <div className="space-y-4 mb-8">
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
          <span className="text-lg">1 site</span>
        </div>
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
          <span className="text-lg">All content + images (2,000 words)</span>
        </div>
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
          <span className="text-lg">Publish to Any CMS</span>
        </div>
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
          <span className="text-lg">Publish 5 Pages per Month</span>
        </div>
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
          <span className="text-lg">Advanced Analytics</span>
        </div>
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
          <span className="text-lg">Normal Support</span>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-lg mb-4 leading-relaxed">
          Helping businesses launch over 15,400 lead generation pages — with
          more pages going live every day.
        </p>

        <div className="grid grid-cols-2 gap-4 opacity-60">
          <div className="text-center">
            <div className="text-sm text-gray-400">Betamark</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Salespitch</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">PLUSGROWTH</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">RoboStellar</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">SOCIALFIRM</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">LEVITY</div>
          </div>
        </div>
      </div>
    </div>
  );
}
