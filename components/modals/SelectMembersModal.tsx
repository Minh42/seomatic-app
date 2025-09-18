'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Users } from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface SelectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: TeamMember[];
  currentLimit: number;
  newLimit: number;
  newPlanName: string;
  onConfirm: (selectedMemberIds: string[]) => void;
  isLoading?: boolean;
}

export function SelectMembersModal({
  isOpen,
  onClose,
  members,
  // currentLimit,
  newLimit,
  newPlanName,
  onConfirm,
  isLoading = false,
}: SelectMembersModalProps) {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  const [mounted, setMounted] = useState(false);

  const maxSelectable = newLimit - 1; // Subtract 1 for owner

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMembers(new Set());
    }
  }, [isOpen]);

  const handleToggleMember = (memberId: string) => {
    const newSelection = new Set(selectedMembers);

    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else if (newSelection.size < maxSelectable) {
      newSelection.add(memberId);
    }

    setSelectedMembers(newSelection);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedMembers));
  };

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[200]">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full relative z-10 max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Team Members to Keep Access
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Your new plan ({newPlanName}) allows {newLimit} team member
                {newLimit !== 1 ? 's' : ''}. Select {maxSelectable} member
                {maxSelectable !== 1 ? 's' : ''} who should keep access.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Warning */}
        <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">Important:</p>
            <p>
              Unselected members will lose access immediately and will be
              notified by email.
            </p>
          </div>
        </div>

        {/* Selection Counter */}
        <div className="px-6 mt-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Selected:</span>
            <span
              className={`text-sm font-medium ${
                selectedMembers.size === maxSelectable
                  ? 'text-green-600'
                  : 'text-gray-900'
              }`}
            >
              {selectedMembers.size}/{maxSelectable} members
            </span>
          </div>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {members.map(member => (
              <label
                key={member.id}
                className={`
                      flex items-center p-3 rounded-lg border cursor-pointer transition-all
                      ${
                        selectedMembers.has(member.id)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }
                      ${
                        selectedMembers.size >= maxSelectable &&
                        !selectedMembers.has(member.id)
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }
                    `}
              >
                <input
                  type="checkbox"
                  checked={selectedMembers.has(member.id)}
                  onChange={() => handleToggleMember(member.id)}
                  disabled={
                    selectedMembers.size >= maxSelectable &&
                    !selectedMembers.has(member.id)
                  }
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.name || member.email}
                      </p>
                      {member.name && (
                        <p className="text-xs text-gray-500">{member.email}</p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                      {member.role}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedMembers.size !== maxSelectable || isLoading}
              className={`
                    px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2
                    ${
                      selectedMembers.size === maxSelectable && !isLoading
                        ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                        : 'bg-gray-300 cursor-not-allowed'
                    }
                  `}
            >
              {isLoading ? 'Processing...' : `Confirm & Downgrade`}
            </button>
          </div>
          {selectedMembers.size !== maxSelectable && (
            <p className="mt-2 text-xs text-red-600 text-right">
              Please select exactly {maxSelectable} member
              {maxSelectable !== 1 ? 's' : ''} to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
