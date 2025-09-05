interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="flex items-center mb-6 md:mb-8">
      <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <span className="ml-4 text-sm text-gray-600">
        Step {currentStep}/{totalSteps}
      </span>
    </div>
  );
}
