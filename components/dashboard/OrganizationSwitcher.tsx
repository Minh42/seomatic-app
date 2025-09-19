'use client';

import { useState, useRef, useEffect } from 'react';
import { Building2, Check, ChevronDown, Users, Crown } from 'lucide-react';
import { useOrganization } from '@/lib/providers/organization-provider';
import { cn } from '@/lib/utils';
import { usePrefetch } from '@/hooks/usePrefetch';

export function OrganizationSwitcher() {
  const {
    selectedOrganization,
    organizations,
    setSelectedOrganization,
    isLoading,
  } = useOrganization();
  const { prefetchOrganization } = usePrefetch();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show skeleton loader while loading
  if (isLoading || !selectedOrganization) {
    return (
      <div className="p-2.5 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-800/50 rounded-lg animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 w-24 bg-gray-800/50 rounded animate-pulse"></div>
            <div className="h-3 w-16 bg-gray-800/50 rounded animate-pulse mt-1"></div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show switcher if user only has one organization
  if (organizations.length <= 1) {
    return null;
  }

  const getRoleIcon = (role: string) => {
    if (role === 'owner') {
      return <Crown className="h-3 w-3 text-yellow-500" />;
    }
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left group cursor-pointer"
      >
        <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-800/30 transition-all cursor-pointer">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 bg-gray-800/50 rounded-lg flex items-center justify-center text-gray-400 border border-gray-700/50">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {selectedOrganization.name}
              </div>
              <div className="text-xs text-gray-500">
                {organizations.length} organization
                {organizations.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-500 transition-transform flex-shrink-0 cursor-pointer',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-slate-800 border border-gray-700/30 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-1 max-h-[280px] overflow-y-auto">
            <div className="px-2.5 py-1.5 text-xs font-medium text-gray-500">
              Organizations
            </div>
            {organizations.map(org => {
              const isActive = org.id === selectedOrganization.id;
              return (
                <button
                  key={org.id}
                  onClick={() => {
                    setSelectedOrganization(org);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => prefetchOrganization(org.id)}
                  onFocus={() => prefetchOrganization(org.id)}
                  className={cn(
                    'flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all w-full cursor-pointer',
                    isActive
                      ? 'bg-gray-700/30 text-white'
                      : 'text-gray-300 hover:bg-gray-700/20 hover:text-white'
                  )}
                >
                  <div className="w-8 h-8 bg-gray-700/30 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium truncate">
                        {org.name}
                      </span>
                      {getRoleIcon(org.role)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Users className="h-3 w-3" />
                      <span>
                        {org.memberCount} member
                        {org.memberCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
