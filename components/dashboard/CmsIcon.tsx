import { Globe, Database, ShoppingBag, Layers, FileText } from 'lucide-react';
import type { ConnectionType } from '@/app/dashboard/actions';

interface CmsIconProps {
  connectionType: ConnectionType;
  className?: string;
}

const cmsConfig = {
  wordpress: {
    icon: FileText,
    label: 'WordPress',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  webflow: {
    icon: Layers,
    label: 'Webflow',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
  },
  shopify: {
    icon: ShoppingBag,
    label: 'Shopify',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  ghost: {
    icon: Database,
    label: 'Ghost',
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
  },
  hosted: {
    icon: Globe,
    label: 'Hosted',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
  },
};

export function CmsIcon({
  connectionType,
  className = 'h-4 w-4',
}: CmsIconProps) {
  const config = cmsConfig[connectionType];
  const Icon = config.icon;

  return <Icon className={`${className} ${config.color}`} />;
}

export function CmsBadge({
  connectionType,
}: {
  connectionType: ConnectionType;
}) {
  const config = cmsConfig[connectionType];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bgColor} ${config.color}`}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </div>
  );
}

export { cmsConfig };
